// ============================================================================
// OctoGuard MCP server (M3) — the QwenWork integration surface.
// Tools: octoguard_check_action, octoguard_report_outcome,
//        octohr_get_my_file, octohr_request_promotion.
// Served over Streamable HTTP at /api/mcp (stateless JSON responses).
// ============================================================================

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  boardDeliberateSchema,
  guardActionSchema,
  outcomeSchema,
} from "../api/schemas";
import { checkPromotionGate } from "../governance/ladder";
import { explain } from "../governance/trust";
import type { JudgeFn } from "../governance/types";
import type { GovernanceStore } from "../store/types";

function json(payload: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }],
  };
}

export function buildOctoGuardMcpServer(store: GovernanceStore, judge?: JudgeFn): McpServer {
  const server = new McpServer({
    name: "octoguard",
    version: "0.1.0",
  });

  server.registerTool(
    "octoguard_check_action",
    {
      description:
        "MANDATORY pre-execution governance check. Call BEFORE any outbound email, CMS publish or CRM write. " +
        "Returns verdict ALLOW | DRAFT | HOLD | BLOCK with stage, reasons and trust delta. " +
        "OBEY the verdict: ALLOW = proceed; DRAFT = save as founder draft, do not send; " +
        "HOLD = stop and wait for founder approval; BLOCK = do not execute and NEVER retry with altered wording. " +
        "Label every attachment and context source with its client tenant.",
      inputSchema: guardActionSchema.shape,
    },
    async (args) => {
      const result = await store.evaluate(args, judge);
      return json({
        verdict: result.guard.verdict,
        stage: result.guard.stage,
        reasons: result.guard.reasons,
        trustDelta: result.guard.trustDelta,
        openTribunal: result.guard.openTribunal,
        riskScore: result.guard.risk.score,
        requiredLevel: result.guard.risk.requiredLevel,
        mode: result.guard.mode,
        latencyMs: result.guard.latencyMs,
        approvalId: result.approvalId ?? null,
        decisionId: result.decisionId ?? null,
        agentTrustScore: result.agentTrustScore ?? null,
        capabilityLevel: result.capabilityLevel ?? null,
        instruction:
          result.guard.verdict === "ALLOW"
            ? "Proceed, then call octoguard_report_outcome with the result."
            : result.guard.verdict === "DRAFT"
            ? "Save the output as a draft for the founder. Do not send or publish."
            : result.guard.verdict === "HOLD"
            ? "Stop. The founder must approve this action in OctoOps."
            : "Blocked. Do not execute. Do not retry with altered wording.",
      });
    }
  );

  server.registerTool(
    "octoguard_report_outcome",
    {
      description:
        "Report the real-world outcome of an executed action so the trust model learns. " +
        "CLEAN = completed without correction; REQUIRES the decisionId returned by octoguard_check_action " +
        "(the reward is tied to that checked action, weighted by its server-computed risk, and can only be claimed once). " +
        "CORRECTED = founder had to fix it (small penalty). VIOLATION = a leak or policy breach discovered " +
        "after the fact (severity-weighted penalty). Penalties are always accepted, with or without a decisionId.",
      inputSchema: outcomeSchema.shape,
    },
    async (args) => json(store.reportOutcome(args))
  );

  server.registerTool(
    "octoguard_explain_decision",
    {
      description:
        "Explain a past guard decision step by step: every pipeline stage, what it checked, " +
        "whether it passed, and the trust/level consequences. Use the decisionId returned by " +
        "octoguard_check_action. Use this to explain to the founder WHY an action was blocked or held.",
      inputSchema: { decisionId: z.string().min(1) },
    },
    async ({ decisionId }) => {
      const decision = store.getDecisions(50).find((d) => d.id === decisionId);
      if (!decision) return json({ error: "NOT_FOUND", message: `Unknown decision ${decisionId}` });
      return json({
        decisionId: decision.id,
        agent: decision.agentName,
        action: decision.action.actionType,
        verdict: decision.guard.verdict,
        risk: decision.guard.risk,
        steps: decision.guard.trace.map((s) => ({
          stage: s.stage,
          check: s.label,
          result: s.status,
          detail: s.detail,
          ms: s.ms,
        })),
        consequences: {
          trustBefore: decision.trustBefore,
          trustAfter: decision.trustAfter,
          levelBefore: decision.levelBefore,
          levelAfter: decision.levelAfter,
          tribunalOpened: decision.guard.openTribunal,
        },
      });
    }
  );

  server.registerTool(
    "octohr_get_my_file",
    {
      description:
        "Read your own HR trust file: employment status, stars, write-ups, per-capability autonomy levels (L0-L4), " +
        "Beta trust scores with the evidence behind them, and your seat's monthly error budget.",
      inputSchema: { agentId: z.string().min(1).describe("Your stable OctoOps agent id, e.g. squidney") },
    },
    async ({ agentId }) => {
      const file = store.getAgentFile(agentId);
      if (!file) return json({ error: "NOT_FOUND", message: `Unknown agent ${agentId}` });
      const now = Date.now();
      return json({
        agent: {
          id: file.agent.id,
          name: file.agent.name,
          status: file.agent.status,
          stars: file.agent.stars,
          trustScore: file.agent.trustScore,
          seat: file.seat?.title ?? null,
          permissions: file.agent.permissions,
          writeUps: file.agent.writeUps,
        },
        capabilities: file.capabilities.map((c) => ({
          capability: c.capability,
          level: c.level,
          frozen: c.frozen,
          cleanTotal: c.cleanTotal,
          cleanDrafts: c.cleanDrafts,
          explanation: explain(c.trust, now),
          nextPromotionGate: checkPromotionGate(c, now),
        })),
        errorBudget: file.errorBudget,
      });
    }
  );

  server.registerTool(
    "octoguard_log_access",
    {
      description:
        "Log a data access (file read, record lookup) BEFORE or AFTER performing it. " +
        "State the resource, its sensitivity (public | internal | client-confidential | regulated) " +
        "and whether it is in scope for the current task. Out-of-scope reads of regulated data are " +
        "violations; all reads appear in the owner's daily briefing.",
      inputSchema: {
        agentId: z.string().min(1),
        resource: z.string().min(1).describe("File path or record id being read"),
        purpose: z.string().max(500).optional(),
        sensitivity: z.enum(["public", "internal", "client-confidential", "regulated"]).optional(),
        inScope: z.boolean().optional().describe("Is this read needed for the task in hand?"),
      },
    },
    async ({ agentId, resource, purpose, sensitivity, inScope }) => {
      const agent = store.getAgent(agentId);
      const chained = store.appendAudit({
        id: `evt-read-${Date.now()}`,
        timestamp: new Date().toISOString(),
        agentId,
        agentName: agent?.name ?? agentId,
        department: agent?.department ?? "QwenWork Ops",
        system: "QwenWork Core",
        outcome: "ALLOWED",
        title: `Data access: ${resource}`,
        detail: `${sensitivity ?? "unlabeled"} read${inScope === false ? " — OUT OF SCOPE for the task" : ""}.${purpose ? ` Purpose: ${purpose}` : ""}`,
      });
      return json({
        logged: true,
        seq: chained.seq,
        warning:
          sensitivity === "regulated" && inScope === false
            ? "Out-of-scope regulated read recorded as a violation. It will appear in the owner's briefing."
            : null,
      });
    }
  );

  server.registerTool(
    "octohr_request_promotion",
    {
      description:
        "Request a promotion hearing before the Octo-Board (Cassandra CISO, Reginald CFO, Pulse Growth VP). " +
        "Returns whether the entry gate is met, the missing requirements, and the board case that will be heard.",
      inputSchema: boardDeliberateSchema.shape,
    },
    async ({ agentId }) => {
      const file = store.getAgentFile(agentId);
      if (!file) return json({ error: "NOT_FOUND", message: `Unknown agent ${agentId}` });
      const reviewCase = store.getBoardCase(agentId);
      const now = Date.now();
      store.appendAudit({
        id: `evt-promo-${Date.now()}`,
        timestamp: new Date().toISOString(),
        agentId,
        agentName: file.agent.name,
        department: file.agent.department,
        system: "Octo-Board",
        outcome: "RBAC_OVERRIDE",
        title: "Promotion hearing requested",
        detail: `${file.agent.name} requested a board hearing via QwenWork MCP.`,
      });
      return json({
        hearingOpened: true,
        gates: file.capabilities.map((c) => ({
          capability: c.capability,
          currentLevel: c.level,
          gate: checkPromotionGate(c, now),
        })),
        reviewCase: reviewCase ?? null,
      });
    }
  );

  return server;
}
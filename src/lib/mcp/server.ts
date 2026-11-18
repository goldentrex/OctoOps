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
  endTaskSchema,
  fileAppealSchema,
  guardActionSchema,
  logAccessSchema,
  outcomeSchema,
  startTaskSchema,
} from "../api/schemas";
import { checkPromotionGate } from "../governance/ladder";
import { remediationFor, nextStepFor } from "../governance/remediation";
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
        remediation: remediationFor(result.guard),
        nextStep: nextStepFor(result.guard, result.decisionId),
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
          drift: c.drift ?? null,
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
      inputSchema: logAccessSchema.shape,
    },
    async (args) => json(store.logAccess(args))
  );

  server.registerTool(
    "octoguard_start_task",
    {
      description:
        "Open a task session BEFORE working: declare the task title and the exact resources " +
        "(files/records) the task needs. The server computes scope membership for every logged read " +
        "against this declaration — reads outside it are flagged to the owner. Link checks and reads " +
        "with the returned taskId. Max 3 open tasks per agent; end tasks when done.",
      inputSchema: startTaskSchema.shape,
    },
    async (args) => json(store.startTask(args))
  );

  server.registerTool(
    "octoguard_end_task",
    {
      description:
        "Close a task session with a short plain-language summary of what was done. " +
        "The response lists any ALLOWED actions with no outcome reported — report them before ending. " +
        "Unreported work and out-of-scope reads are surfaced to the owner.",
      inputSchema: { taskId: z.string().min(1), ...endTaskSchema.shape },
    },
    async ({ taskId, summary }) => json(store.endTask(taskId, summary))
  );

  server.registerTool(
    "octoguard_preflight",
    {
      description:
        "Dry-run the guard while drafting: identical pipeline, but NO trust effects, no write-ups, " +
        "no approval queue entries. Use it to validate tenant labels, secrets and figures before the " +
        "real check. Every preflight is logged for transparency. The FINAL check before execution " +
        "must still be octoguard_check_action.",
      inputSchema: guardActionSchema.shape,
    },
    async (args) => {
      const { guard, remediation } = await store.preflight(args, judge);
      return json({
        dryRun: true,
        verdict: guard.verdict,
        stage: guard.stage,
        reasons: guard.reasons,
        riskScore: guard.risk.score,
        remediation,
        note: "No trust effects. Run octoguard_check_action before executing.",
      });
    }
  );

  server.registerTool(
    "octohr_appeal_writeup",
    {
      description:
        "Contest a write-up you believe is wrong (procedural fairness). Provide the writeUpId " +
        "from your trust file and a factual reason. The founder/board reviews it; if overturned, " +
        "the exact Beta penalty is reversed and the write-up removed — visibly, in the audit chain. " +
        "One appeal per write-up; appeals never block or delay other work.",
      inputSchema: fileAppealSchema.shape,
    },
    async (args) => json(store.fileAppeal(args))
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
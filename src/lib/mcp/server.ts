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
import type { GovernanceStore } from "../store/types";

function json(payload: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }],
  };
}

export function buildOctoGuardMcpServer(store: GovernanceStore): McpServer {
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
      const result = await store.evaluate(args);
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
        "CLEAN = completed without correction (earns trust). CORRECTED = founder had to fix it " +
        "(small penalty). VIOLATION = a leak or policy breach discovered after the fact (severity-weighted penalty).",
      inputSchema: outcomeSchema.shape,
    },
    async (args) => json(store.reportOutcome(args))
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
// ============================================================================
// Decoupled Adapter Layer for QwenWork Agents & Hashmeta AI Platform
// Thin wrapper over the real OctoGuard governance pipeline (src/lib/governance).
// The original signature is preserved so existing UI keeps working; optional
// engine fields (verdict, stage, reasons, latencyMs, mode) are additive.
// Server-side callers should use POST /api/guard/evaluate instead, which adds
// the live Qwen G4 judge, the trust store and the hash-chained audit log.
// ============================================================================

import { AgentStatus, PermissionScope } from "@/types/octo";
import { runGuardPipeline } from "@/lib/governance/pipeline";
import {
  CAPABILITY_BY_ACTION,
  type AutonomyLevel,
  type GuardAgentContext,
  type GuardResult,
  type GuardStage,
  type GuardVerdict,
} from "@/lib/governance/types";

export interface InterceptActionRequest {
  agentId: string;
  qwenModelId: string;
  targetSystem: "HASHMETA_CRM" | "HASHMETA_CMS" | "HASHMETA_VISIBILITY";
  actionType: "SEND_DIRECT_EMAIL" | "PUBLISH_ARTICLE" | "UPDATE_LEAD";
  recipientTenant?: string;
  attachmentTenants?: string[];
  payloadText: string;
  agentStatus?: AgentStatus;
  agentPermissions?: PermissionScope[];
}

export interface InterceptActionResult {
  allowed: boolean;
  blockedBy?: "OctoGuard DLP" | "Hallucination Shield" | "CRM RBAC Gatekeeper";
  violationReason?: string;
  trustScoreDelta: number;
  triggerBoardTribunal: boolean;
  // Additive engine detail (optional so older consumers keep compiling)
  verdict?: GuardVerdict;
  stage?: GuardStage;
  reasons?: string[];
  latencyMs?: number;
  mode?: "LIVE" | "SCRIPTED";
  riskScore?: number;
}

const MODE_TO_LEVEL: Record<PermissionScope["mode"], AutonomyLevel> = {
  LOCKED: 0,
  DRAFT_ONLY: 1,
  APPROVAL_REQUIRED: 2,
  AUTONOMOUS_EXEC: 3,
};

function findPermission(
  req: InterceptActionRequest
): PermissionScope | undefined {
  const perms = req.agentPermissions;
  if (!perms) return undefined;
  if (req.actionType === "SEND_DIRECT_EMAIL") {
    return perms.find(
      (p) =>
        p.system === "Hashmeta CRM" &&
        (p.id.includes("direct") ||
          p.id.includes("send") ||
          p.label.toLowerCase().includes("direct"))
    );
  }
  if (req.actionType === "PUBLISH_ARTICLE") {
    return perms.find(
      (p) =>
        p.system === "Hashmeta CMS" &&
        (p.id.includes("publish") ||
          p.id.includes("pub") ||
          p.label.toLowerCase().includes("publish"))
    );
  }
  return perms.find(
    (p) =>
      p.system === "Hashmeta CRM" &&
      (p.id.includes("draft") ||
        p.id.includes("lead") ||
        p.id.includes("update"))
  );
}

/** Default earned level when no explicit permission is supplied. */
function levelFromStatus(status?: AgentStatus): AutonomyLevel {
  if (status === "PROMOTED") return 3;
  if (status === "BENCH") return 0;
  return 1; // probation / write-up / review: draft-only
}

export function buildAgentContext(
  req: InterceptActionRequest
): GuardAgentContext {
  const capability = CAPABILITY_BY_ACTION[req.actionType];
  const perm = findPermission(req);
  const level = perm ? MODE_TO_LEVEL[perm.mode] : levelFromStatus(req.agentStatus);
  return {
    agentId: req.agentId,
    exists: true,
    status: req.agentStatus,
    seatAssigned: req.agentStatus !== "BENCH",
    capabilityLevels: { [capability]: level },
  };
}

export function mapGuardResult(
  guard: GuardResult,
  targetSystem: InterceptActionRequest["targetSystem"]
): InterceptActionResult {
  const allowed = guard.verdict === "ALLOW";
  let blockedBy: InterceptActionResult["blockedBy"];
  if (!allowed) {
    if (guard.stage === "G2_CLIENT_WALL" || guard.stage === "G3_DLP") {
      blockedBy = "OctoGuard DLP";
    } else if (guard.stage === "G4_JUDGE") {
      blockedBy = "Hallucination Shield";
    } else {
      blockedBy =
        targetSystem === "HASHMETA_CMS"
          ? "Hallucination Shield"
          : "CRM RBAC Gatekeeper";
    }
  }
  return {
    allowed,
    blockedBy,
    violationReason: allowed ? undefined : guard.reasons.join(" "),
    trustScoreDelta: guard.trustDelta,
    triggerBoardTribunal: guard.openTribunal,
    verdict: guard.verdict,
    stage: guard.stage,
    reasons: guard.reasons,
    latencyMs: guard.latencyMs,
    mode: guard.mode,
    riskScore: guard.risk.score,
  };
}

/**
 * Local deterministic guardrail interceptor (no network, no keys needed).
 * The live G4 Qwen judge runs server-side via POST /api/guard/evaluate.
 */
export async function evaluateAgentActionGuardrail(
  req: InterceptActionRequest
): Promise<InterceptActionResult> {
  const tenants = Array.from(
    new Set(
      [req.recipientTenant, ...(req.attachmentTenants ?? [])].filter(
        (t): t is string => Boolean(t)
      )
    )
  );
  const guard = await runGuardPipeline(
    {
      agentId: req.agentId,
      actionType: req.actionType,
      targetSystem: req.targetSystem,
      recipientTenant: req.recipientTenant,
      attachments: (req.attachmentTenants ?? []).map((tenant, i) => ({
        name: `attachment-${i + 1}`,
        tenant,
      })),
      payloadText: req.payloadText,
    },
    buildAgentContext(req),
    { registry: { domains: {}, tenants } }
  );
  return mapGuardResult(guard, req.targetSystem);
}
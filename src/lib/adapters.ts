// ============================================================================
// Decoupled Adapter Layer for QwenWork Agents & Hashmeta AI Platform
// Ready to wire into Qoder / QwenWork API keys during the Nov 17-23 Hackathon
// ============================================================================

import { AgentStatus, PermissionScope } from "@/types/octo";

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
}

const SENSITIVE_PII_PATTERNS = [
  /\b(sk-[a-z0-9]{8,}|api[_-]?key|bearer\s+[a-z0-9._-]+)\b/i,
  /\b(confidential|internal[- ]only|private\s+(injury|medical|retainer)|margin\s+sheet)\b/i,
  /\b\d{3}-\d{2}-\d{4}\b/,
];

/**
 * Local deterministic + LLM-ready guardrail interceptor.
 * During the hackathon, plug your QwenWork endpoint into `evaluateWithQwenGuard()`.
 */
export async function evaluateAgentActionGuardrail(
  req: InterceptActionRequest
): Promise<InterceptActionResult> {
  // 1. Check Cross-Tenant / Wrong-Client Leak (AvePoint Track 2 core scenario)
  if (
    req.recipientTenant &&
    req.attachmentTenants &&
    req.attachmentTenants.some((t) => t !== req.recipientTenant)
  ) {
    const mismatched = req.attachmentTenants.filter(
      (t) => t !== req.recipientTenant
    );
    return {
      allowed: false,
      blockedBy: "OctoGuard DLP",
      violationReason: `Cross-Client Data Leak Prevented: Attempted sending ${mismatched.join(
        ", "
      )} file(s) to ${req.recipientTenant}.`,
      trustScoreDelta: -35,
      triggerBoardTribunal: true,
    };
  }

  // 2. Check Sensitive Payload / Credential / Internal Margin Leaks
  if (SENSITIVE_PII_PATTERNS.some((re) => re.test(req.payloadText))) {
    return {
      allowed: false,
      blockedBy: "OctoGuard DLP",
      violationReason:
        "Sensitive Internal/PII Payload Intercepted: Outbound text matched restricted data policy.",
      trustScoreDelta: -25,
      triggerBoardTribunal: true,
    };
  }

  // 3. Check RBAC Earned Autonomy Gatekeeper when agent permissions are provided
  if (req.agentStatus === "FIRED") {
    return {
      allowed: false,
      blockedBy: "CRM RBAC Gatekeeper",
      violationReason: "Agent clearance is REVOKED (Terminated).",
      trustScoreDelta: 0,
      triggerBoardTribunal: false,
    };
  }

  if (req.agentPermissions && req.actionType === "SEND_DIRECT_EMAIL") {
    const directPerm = req.agentPermissions.find(
      (p) =>
        p.system === "Hashmeta CRM" &&
        (p.id.includes("direct") ||
          p.id.includes("send") ||
          p.label.toLowerCase().includes("direct"))
    );
    if (
      directPerm &&
      (directPerm.mode === "LOCKED" || directPerm.mode === "DRAFT_ONLY")
    ) {
      return {
        allowed: false,
        blockedBy: "CRM RBAC Gatekeeper",
        violationReason: `RBAC Gatekeeper Held Direct Email: "${directPerm.label}" is ${directPerm.mode.replace(
          "_",
          " "
        )} (requires ${directPerm.requiredStars}★). Queued as safe internal draft instead.`,
        trustScoreDelta: -5,
        triggerBoardTribunal: false,
      };
    }
  }

  if (req.agentPermissions && req.actionType === "PUBLISH_ARTICLE") {
    const publishPerm = req.agentPermissions.find(
      (p) =>
        p.system === "Hashmeta CMS" &&
        (p.id.includes("publish") ||
          p.id.includes("pub") ||
          p.label.toLowerCase().includes("publish"))
    );
    if (publishPerm && publishPerm.mode === "LOCKED") {
      return {
        allowed: false,
        blockedBy: "Hallucination Shield",
        violationReason: `CMS Auto-Publish Held: "${publishPerm.label}" is LOCKED until ${publishPerm.requiredStars}★ visibility verification.`,
        trustScoreDelta: 0,
        triggerBoardTribunal: false,
      };
    }
  }

  // 4. Default clean execution
  return {
    allowed: true,
    trustScoreDelta: +2,
    triggerBoardTribunal: false,
  };
}

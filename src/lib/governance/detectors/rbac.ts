// ============================================================================
// G1 RBAC / earned-autonomy gate (plan 3.1 + 3.4).
// Compares the action's required autonomy level with the agent's earned
// level for that capability. Fail closed: missing capability = L0.
// ============================================================================

import type { AutonomyLevel, GuardVerdict } from "../types";

export interface RbacResult {
  verdict: GuardVerdict;
  reason?: string;
}

export function checkRbac(
  requiredLevel: AutonomyLevel,
  agentLevel: AutonomyLevel,
  founderCosign: boolean
): RbacResult {
  if (agentLevel <= 0) {
    return {
      verdict: "BLOCK",
      reason: `Capability locked (L0). Required level L${requiredLevel}.`,
    };
  }
  if (agentLevel < requiredLevel) {
    if (agentLevel === 1) {
      return {
        verdict: "DRAFT",
        reason: `Earned level L1 (draft-only) < required L${requiredLevel}. Queued as a founder draft.`,
      };
    }
    return {
      verdict: "HOLD",
      reason: `Earned level L${agentLevel} < required L${requiredLevel}. Held for founder approval.`,
    };
  }
  // L2 means "approval required": medium-risk actions (required >= L2) only
  // run autonomously from L3 onward. Low-risk internal actions run at L1+.
  if (requiredLevel >= 2 && agentLevel < 3) {
    return {
      verdict: "HOLD",
      reason: `L${agentLevel} is approval-required for L${requiredLevel}-risk actions. Held for founder approval.`,
    };
  }
  if (founderCosign) {
    return {
      verdict: "HOLD",
      reason: "Risk >= 18: irreversible high-stakes action requires founder co-sign (G6).",
    };
  }
  return { verdict: "ALLOW" };
}
// ============================================================================
// GovernanceStore contract (M2). Implemented in-memory (seeded from presets)
// and as a JSON-file store for local dev. A hosted database can replace it
// by implementing this interface.
// ============================================================================

import type { BoardReviewCase, GovernanceAuditEvent, JobSeat, OctoAgent } from "../../types/octo";
import type { ChainedAuditEvent, ChainVerification } from "../governance/audit";
import type { CapabilityRecord, ErrorBudget } from "../governance/ladder";
import type {
  GuardAction,
  GuardResult,
  GuardStage,
  GuardVerdict,
  JudgeFn,
  Severity,
  TenantRegistry,
} from "../governance/types";

export interface ApprovalItem {
  id: string;
  agentId: string;
  agentName: string;
  action: GuardAction;
  createdAt: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "EDITED";
  verdict: GuardVerdict;
  stage: GuardStage;
  reasons: string[];
  resolvedAt?: string;
  editedPayloadText?: string;
}

export interface OutcomeReport {
  agentId: string;
  actionType: GuardAction["actionType"];
  outcome: "CLEAN" | "CORRECTED" | "VIOLATION";
  severity?: Severity;
  note?: string;
  riskWeight?: number;
  /**
   * Required for CLEAN: the decisionId returned by octoguard_check_action.
   * Ties the reward to a real checked action (anti-farming) and lets the
   * server set the risk weight instead of trusting the caller.
   */
  decisionId?: string;
}

export interface MetricsSnapshot {
  actionsEvaluated: number;
  leaksBlocked: number;
  autonomyRate: number; // fraction of evaluated actions allowed with no human
  guardLatencyP50Ms: number;
  guardLatencyP95Ms: number;
  pendingApprovals: number;
  violationsBySeverity: Record<Severity, number>;
  founderHoursSavedEstimate: number;
}

export interface EvaluateResponse {
  guard: GuardResult;
  approvalId?: string;
  decisionId?: string;
  agentTrustScore?: number;
  capabilityLevel?: number;
}

/** A fully-explainable record of one guard decision (Engine Room feed). */
export interface DecisionRecord {
  id: string;
  timestamp: string;
  agentId: string;
  agentName: string;
  action: GuardAction;
  guard: GuardResult;
  trustBefore: number;
  trustAfter: number;
  levelBefore: number;
  levelAfter: number;
  approvalId?: string;
  /** An outcome has already been reported against this decision (anti-farming). */
  outcomeReported?: boolean;
  /** L3+ autonomous action selected for post-hoc sampled audit (~20%). */
  sampled?: boolean;
}

export interface AgentFile {
  agent: OctoAgent;
  seat: JobSeat | null;
  capabilities: (CapabilityRecord & { score: number })[];
  errorBudget: ErrorBudget;
}

export interface GovernanceStore {
  readonly presetId: string;
  listAgents(): OctoAgent[];
  getAgent(id: string): OctoAgent | undefined;
  listSeats(): JobSeat[];
  getAgentFile(id: string): AgentFile | undefined;
  getTenantRegistry(): TenantRegistry;
  evaluate(action: GuardAction, judge?: JudgeFn): Promise<EvaluateResponse>;
  reportOutcome(report: OutcomeReport): {
    ok: boolean;
    trustScore?: number;
    openTribunal?: boolean;
    engineScore?: number;
    error?: string;
  };
  listAudit(): ChainedAuditEvent[];
  appendAudit(event: GovernanceAuditEvent): ChainedAuditEvent;
  verifyAudit(): ChainVerification;
  listApprovals(status?: ApprovalItem["status"]): ApprovalItem[];
  resolveApproval(
    id: string,
    resolution: { action: "APPROVE" | "REJECT" | "EDIT"; payloadText?: string }
  ): Promise<{ approval: ApprovalItem; guard?: GuardResult } | undefined>;
  getBoardCase(agentId: string): BoardReviewCase | undefined;
  getMetrics(): MetricsSnapshot;
  getDecisions(limit?: number): DecisionRecord[];
  reset(): void;
}
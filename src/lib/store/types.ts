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
  agentTrustScore?: number;
  capabilityLevel?: number;
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
  reportOutcome(report: OutcomeReport): { ok: boolean; trustScore?: number; openTribunal?: boolean };
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
  reset(): void;
}
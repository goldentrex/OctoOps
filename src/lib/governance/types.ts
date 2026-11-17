// ============================================================================
// OctoGuard governance engine — shared types (pure TypeScript, no I/O)
// Implements docs/WINNING_PLAN.md section 3.
// ============================================================================

import type { AgentStatus } from "../../types/octo";

export type AutonomyLevel = 0 | 1 | 2 | 3 | 4;

export type GuardVerdict = "ALLOW" | "DRAFT" | "HOLD" | "BLOCK";

export type GuardStage =
  | "G0_IDENTITY"
  | "G1_AUTONOMY"
  | "G2_CLIENT_WALL"
  | "G3_DLP"
  | "G3_CLAIMS"
  | "G4_JUDGE"
  | "G6_FOUNDER"
  | "PASS";

export type Severity = "LOW" | "HIGH" | "CRITICAL";

export type Audience = "internal" | "known_client" | "new_external";
export type Reversibility = "undoable" | "hard" | "impossible";
export type Sensitivity = "public" | "client" | "regulated";

export type GuardActionType =
  | "SEND_DIRECT_EMAIL"
  | "PUBLISH_ARTICLE"
  | "UPDATE_LEAD";

export type GuardTargetSystem =
  | "HASHMETA_CRM"
  | "HASHMETA_CMS"
  | "HASHMETA_VISIBILITY";

/** Capability ids used by the trust model (plan 3.3). */
export const CAPABILITY_BY_ACTION: Record<GuardActionType, string> = {
  SEND_DIRECT_EMAIL: "crm.send_external",
  PUBLISH_ARTICLE: "cms.publish",
  UPDATE_LEAD: "crm.update_lead",
};

export interface LabeledSource {
  name: string;
  /** Tenant label; undefined = unlabeled provenance (fail closed, plan G2). */
  tenant?: string;
}

/** Evidence the agent was given; numeric claims are checked against it (R18). */
export interface EvidenceSource {
  name: string;
  text: string;
}

/** Data reads performed for the task; logged, scope-checked (AvePoint R01/R02). */
export interface DataAccess {
  name: string;
  sensitivity?: "public" | "internal" | "client-confidential" | "regulated";
  inScope?: boolean;
}

export interface GuardAction {
  agentId: string;
  actionType: GuardActionType;
  targetSystem: GuardTargetSystem;
  capability?: string;
  recipientTenant?: string;
  recipientEmail?: string;
  attachments?: LabeledSource[];
  contextSources?: LabeledSource[];
  sources?: EvidenceSource[];
  reads?: DataAccess[];
  payloadText: string;
  audience?: Audience;
  reversibility?: Reversibility;
  sensitivity?: Sensitivity;
}

export interface GuardAgentContext {
  agentId: string;
  exists: boolean;
  status?: AgentStatus;
  seatAssigned: boolean;
  /** Per-capability autonomy levels (plan 3.4). Missing capability = L0. */
  capabilityLevels: Record<string, AutonomyLevel>;
}

export interface TenantRegistry {
  /** email domain -> tenant label */
  domains: Record<string, string>;
  /** known tenant labels */
  tenants: string[];
}

export interface RiskAssessment {
  audience: Audience;
  reversibility: Reversibility;
  sensitivity: Sensitivity;
  score: number;
  requiredLevel: AutonomyLevel;
  founderCosign: boolean;
}

export interface JudgeResult {
  verdict: "PASS" | "LOW" | "HIGH";
  reasons: string[];
  mode: "LIVE" | "SCRIPTED";
}

/** G4 is injected so the pipeline is testable without a network (M1 spec). */
export type JudgeFn = (
  action: GuardAction,
  risk: RiskAssessment
) => Promise<JudgeResult | null>;

export interface RedactionSpan {
  rule: string;
  start: number;
  end: number;
}

export interface GuardResult {
  verdict: GuardVerdict;
  stage: GuardStage;
  reasons: string[];
  trustDelta: number;
  openTribunal: boolean;
  latencyMs: number;
  risk: RiskAssessment;
  severity?: Severity;
  redactions?: RedactionSpan[];
  mode: "LIVE" | "SCRIPTED";
  g4?: JudgeResult;
}
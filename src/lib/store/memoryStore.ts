// ============================================================================
// In-memory GovernanceStore seeded from the demo presets. All engine state
// (Beta trust, ladder levels, error budgets, hash-chained audit, approvals,
// metrics) lives here. FileGovernanceStore extends this with JSON persistence.
// ============================================================================

import { buildPresetSnapshot } from "../../data/businessPresets";
import { getBoardReviewCase } from "../../data/mockOctoData";
import type {
  BoardReviewCase,
  GovernanceAuditEvent,
  JobSeat,
  OctoAgent,
  WriteUpIncident,
} from "../../types/octo";
import { chainEvent, verifyChain, type ChainedAuditEvent, type ChainVerification } from "../governance/audit";
import { applyClean, applyViolation, createCapabilityRecord, type CapabilityRecord } from "../governance/ladder";
import { runGuardPipeline } from "../governance/pipeline";
import { assessRisk } from "../governance/risk";
import { trustScore } from "../governance/trust";
import {
  CAPABILITY_BY_ACTION,
  type GuardAction,
  type GuardAgentContext,
  type GuardResult,
  type JudgeFn,
  type Severity,
  type TenantRegistry,
} from "../governance/types";
import {
  buildSeed,
  capabilityForPermission,
  DEFAULT_PRESET_ID,
  LEVEL_TO_MODE,
  type SeedState,
} from "./seed";
import type {
  AgentFile,
  ApprovalItem,
  EvaluateResponse,
  GovernanceStore,
  MetricsSnapshot,
  OutcomeReport,
} from "./types";

const CORE_CAPABILITIES = new Set(Object.values(CAPABILITY_BY_ACTION));

export interface StoreSnapshot {
  seed: SeedState;
  audit: ChainedAuditEvent[];
  approvals: ApprovalItem[];
  latencies: number[];
  counters: {
    evaluated: number;
    allowed: number;
    leaksBlocked: number;
    violations: Record<Severity, number>;
  };
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

export class MemoryGovernanceStore implements GovernanceStore {
  protected state: SeedState;
  protected audit: ChainedAuditEvent[] = [];
  protected approvals: ApprovalItem[] = [];
  protected latencies: number[] = [];
  protected counters = {
    evaluated: 0,
    allowed: 0,
    leaksBlocked: 0,
    violations: { LOW: 0, HIGH: 0, CRITICAL: 0 } as Record<Severity, number>,
  };
  protected presetCases: Record<string, BoardReviewCase>;
  private idCounter = 0;

  constructor(presetId: string = DEFAULT_PRESET_ID) {
    this.state = buildSeed(presetId);
    this.presetCases = buildPresetSnapshot(presetId).boardCases;
  }

  get presetId(): string {
    return this.state.presetId;
  }

  protected persist(): void {
    // in-memory store: nothing to persist
  }

  protected nextId(prefix: string): string {
    return `${prefix}-${Date.now()}-${++this.idCounter}`;
  }

  listAgents(): OctoAgent[] {
    return this.state.agents;
  }

  getAgent(id: string): OctoAgent | undefined {
    return this.state.agents.find((a) => a.id === id);
  }

  listSeats(): JobSeat[] {
    return this.state.seats;
  }

  getTenantRegistry(): TenantRegistry {
    return this.state.registry;
  }

  getAgentFile(id: string): AgentFile | undefined {
    const agent = this.getAgent(id);
    if (!agent) return undefined;
    const now = Date.now();
    const records = this.state.records[id] ?? {};
    return {
      agent,
      seat: this.state.seats.find((s) => s.id === agent.assignedSeatId) ?? null,
      capabilities: Object.values(records).map((rec) => ({
        ...rec,
        score: trustScore(rec.trust, now),
      })),
      errorBudget: this.state.budgets[id] ?? { month: "", used: 0, limit: 15 },
    };
  }

  /** Seated agents earn L1 on first attempt at a core capability (hire gate). */
  protected recordFor(agent: OctoAgent, capability: string): CapabilityRecord | undefined {
    const byCap = this.state.records[agent.id];
    if (!byCap) return undefined;
    if (!byCap[capability] && CORE_CAPABILITIES.has(capability)) {
      byCap[capability] = createCapabilityRecord(capability, Date.now(), 1, this.state.budgets[agent.id]);
    }
    return byCap[capability];
  }

  protected contextFor(agent: OctoAgent | undefined, action: GuardAction): GuardAgentContext {
    const capability = action.capability ?? CAPABILITY_BY_ACTION[action.actionType];
    if (!agent) {
      return { agentId: action.agentId, exists: false, seatAssigned: false, capabilityLevels: {} };
    }
    const rec = this.recordFor(agent, capability);
    return {
      agentId: agent.id,
      exists: true,
      status: agent.status,
      seatAssigned: Boolean(agent.assignedSeatId),
      capabilityLevels: rec ? { [capability]: rec.level } : {},
    };
  }

  async evaluate(action: GuardAction, judge?: JudgeFn): Promise<EvaluateResponse> {
    const agent = this.getAgent(action.agentId);
    const capability = action.capability ?? CAPABILITY_BY_ACTION[action.actionType];
    const guard = await runGuardPipeline(action, this.contextFor(agent, action), {
      registry: this.state.registry,
      judge,
    });

    this.counters.evaluated += 1;
    this.latencies.push(guard.latencyMs);
    if (this.latencies.length > 500) this.latencies.shift();

    let approvalId: string | undefined;
    const rec = agent ? this.recordFor(agent, capability) : undefined;

    if (guard.verdict === "ALLOW") {
      this.counters.allowed += 1;
      if (agent && rec) {
        applyClean(rec, guard.risk.score, Date.now(), { note: "Guarded action allowed" });
        agent.trustScore = Math.min(99, agent.trustScore + guard.trustDelta);
      }
    } else if (guard.verdict === "BLOCK" && guard.severity) {
      if (guard.stage === "G2_CLIENT_WALL" || guard.stage === "G3_DLP") {
        this.counters.leaksBlocked += 1;
      }
      this.counters.violations[guard.severity] += 1;
      if (agent && rec) {
        const outcome = applyViolation(rec, guard.severity, "guard", Date.now(), guard.reasons[0]);
        this.syncAgentAfterViolation(agent, rec, capability, guard, outcome.openTribunal);
      }
    } else if (guard.verdict === "HOLD" && guard.stage === "G4_JUDGE" && guard.severity) {
      this.counters.violations[guard.severity] += 1;
      if (agent && rec) {
        const outcome = applyViolation(rec, guard.severity, "near_miss", Date.now(), guard.reasons[0]);
        this.syncAgentAfterViolation(agent, rec, capability, guard, outcome.openTribunal);
      }
      approvalId = this.queueApproval(agent, action, guard);
    } else if (guard.verdict === "DRAFT" || guard.verdict === "HOLD") {
      approvalId = this.queueApproval(agent, action, guard);
    }

    // Log data reads (AvePoint: "every file read"), before the action event.
    for (const read of action.reads ?? []) {
      this.appendAudit({
        id: this.nextId("evt"),
        timestamp: new Date().toISOString(),
        agentId: action.agentId,
        agentName: agent?.name ?? action.agentId,
        department: agent?.department ?? "QwenWork Ops",
        system: "QwenWork Core",
        outcome: "ALLOWED",
        title: `Data access: ${read.name}`,
        detail: `${read.sensitivity ?? "unlabeled"} read${
          read.inScope === false ? " — OUT OF SCOPE for the task" : ""
        }.`,
      });
    }

    this.appendAudit(this.auditEventFor(action, agent, guard));
    this.persist();
    return {
      guard,
      approvalId,
      agentTrustScore: agent?.trustScore,
      capabilityLevel: rec?.level,
    };
  }

  protected syncAgentAfterViolation(
    agent: OctoAgent,
    rec: CapabilityRecord,
    capability: string,
    guard: GuardResult,
    openTribunal: boolean
  ): void {
    agent.trustScore = Math.max(0, Math.min(99, agent.trustScore + guard.trustDelta));
    const incident: WriteUpIncident = {
      id: this.nextId("wu"),
      timestamp: new Date().toISOString(),
      title:
        guard.stage === "G2_CLIENT_WALL"
          ? "Cross-Client Data Leak Blocked"
          : guard.stage === "G3_DLP"
          ? "Sensitive Payload Intercepted"
          : "Qwen Judge Semantic Hold",
      severity: guard.severity ?? "HIGH",
      ruleViolated: `OctoGuard ${guard.stage}`,
      interceptedPayload: guard.reasons.join(" ").slice(0, 400),
      blockedBy: guard.stage === "G4_JUDGE" ? "Hallucination Shield" : "OctoGuard DLP",
      trustPenalty: guard.trustDelta,
    };
    agent.writeUps = [...agent.writeUps, incident];
    agent.status = openTribunal ? "BOARD_REVIEW" : "WRITE_UP";
    const ordinal = ["1st", "2nd", "3rd"][Math.min(agent.writeUps.length - 1, 2)] ?? `${agent.writeUps.length}th`;
    agent.stampText = `${ordinal} WRITE-UP`;
    agent.stampVariant = "red";
    agent.mood = "panicked";
    agent.complianceScore = Math.max(10, agent.complianceScore - 10);
    for (const perm of agent.permissions) {
      if (capabilityForPermission(perm) === capability) {
        perm.mode = LEVEL_TO_MODE[rec.level];
      }
    }
  }

  protected queueApproval(
    agent: OctoAgent | undefined,
    action: GuardAction,
    guard: GuardResult
  ): string {
    const approval: ApprovalItem = {
      id: this.nextId("apr"),
      agentId: action.agentId,
      agentName: agent?.name ?? action.agentId,
      action,
      createdAt: new Date().toISOString(),
      status: "PENDING",
      verdict: guard.verdict,
      stage: guard.stage,
      reasons: guard.reasons,
    };
    this.approvals.push(approval);
    return approval.id;
  }

  protected auditEventFor(
    action: GuardAction,
    agent: OctoAgent | undefined,
    guard: GuardResult
  ): GovernanceAuditEvent {
    const system =
      action.targetSystem === "HASHMETA_CRM"
        ? "Hashmeta CRM"
        : action.targetSystem === "HASHMETA_CMS"
        ? "Hashmeta CMS"
        : "Hashmeta Visibility";
    return {
      id: this.nextId("evt"),
      timestamp: new Date().toISOString(),
      agentId: action.agentId,
      agentName: agent?.name ?? action.agentId,
      department: agent?.department ?? "QwenWork Ops",
      system,
      outcome:
        guard.verdict === "ALLOW"
          ? "ALLOWED"
          : guard.verdict === "BLOCK"
          ? "BLOCKED"
          : "RBAC_OVERRIDE",
      title: `${action.actionType} → ${guard.verdict} (${guard.stage})`,
      detail: guard.reasons.join(" ").slice(0, 400),
      blockedBy: guard.verdict === "ALLOW" ? undefined : `OctoGuard ${guard.stage}`,
      trustDelta: guard.trustDelta,
    };
  }

  reportOutcome(report: OutcomeReport): { ok: boolean; trustScore?: number; openTribunal?: boolean } {
    const agent = this.getAgent(report.agentId);
    if (!agent) return { ok: false };
    const capability = CAPABILITY_BY_ACTION[report.actionType];
    const rec = this.recordFor(agent, capability);
    if (!rec) return { ok: false };
    const now = Date.now();
    let openTribunal = false;

    if (report.outcome === "CLEAN") {
      applyClean(rec, report.riskWeight ?? 2, now, {
        approvedDraft: true,
        note: report.note ?? "Outcome reported clean",
      });
      agent.trustScore = Math.min(99, agent.trustScore + 2);
    } else {
      const severity: Severity =
        report.outcome === "CORRECTED" ? "LOW" : report.severity ?? "HIGH";
      const outcome = applyViolation(rec, severity, "human", now, report.note);
      openTribunal = outcome.openTribunal;
      this.counters.violations[severity] += 1;
      const fakeGuard: GuardResult = {
        verdict: "BLOCK",
        stage: "G4_JUDGE",
        reasons: [report.note ?? "Founder-reported violation"],
        trustDelta: severity === "CRITICAL" ? -35 : severity === "HIGH" ? -15 : -5,
        openTribunal,
        latencyMs: 0,
        risk: assessRisk({ actionType: report.actionType } as GuardAction),
        severity,
        mode: "LIVE",
      };
      this.syncAgentAfterViolation(agent, rec, capability, fakeGuard, openTribunal);
    }

    this.appendAudit({
      id: this.nextId("evt"),
      timestamp: new Date().toISOString(),
      agentId: agent.id,
      agentName: agent.name,
      department: agent.department,
      system: "QwenWork Core",
      outcome: report.outcome === "CLEAN" ? "ALLOWED" : "WRITE_UP",
      title: `Outcome reported: ${report.outcome}`,
      detail: report.note ?? `${report.actionType} outcome fed to the trust model.`,
      trustDelta: report.outcome === "CLEAN" ? 2 : undefined,
    });
    this.persist();
    return { ok: true, trustScore: agent.trustScore, openTribunal };
  }

  listAudit(): ChainedAuditEvent[] {
    return this.audit;
  }

  appendAudit(event: GovernanceAuditEvent): ChainedAuditEvent {
    const chained = chainEvent(this.audit[this.audit.length - 1] ?? null, event);
    this.audit.push(chained);
    this.persist();
    return chained;
  }

  verifyAudit(): ChainVerification {
    return verifyChain(this.audit);
  }

  listApprovals(status?: ApprovalItem["status"]): ApprovalItem[] {
    return status ? this.approvals.filter((a) => a.status === status) : this.approvals;
  }

  async resolveApproval(
    id: string,
    resolution: { action: "APPROVE" | "REJECT" | "EDIT"; payloadText?: string }
  ): Promise<{ approval: ApprovalItem; guard?: GuardResult } | undefined> {
    const approval = this.approvals.find((a) => a.id === id);
    if (!approval || approval.status !== "PENDING") return undefined;
    const agent = this.getAgent(approval.agentId);
    const capability =
      approval.action.capability ?? CAPABILITY_BY_ACTION[approval.action.actionType];
    const rec = agent ? this.recordFor(agent, capability) : undefined;
    const now = Date.now();

    if (resolution.action === "REJECT") {
      approval.status = "REJECTED";
      if (agent && rec) {
        applyViolation(rec, "LOW", "human", now, "Founder rejected the draft");
        agent.trustScore = Math.max(0, agent.trustScore - 5);
      }
    } else {
      approval.status = resolution.action === "EDIT" ? "EDITED" : "APPROVED";
      if (resolution.action === "EDIT" && resolution.payloadText) {
        approval.editedPayloadText = resolution.payloadText;
        approval.action = { ...approval.action, payloadText: resolution.payloadText };
      }
      if (agent && rec) {
        applyClean(rec, assessRisk(approval.action).score, now, {
          approvedDraft: true,
          note: `Founder ${resolution.action.toLowerCase()}d the draft`,
        });
        agent.trustScore = Math.min(99, agent.trustScore + 2);
      }
    }
    approval.resolvedAt = new Date().toISOString();

    this.appendAudit({
      id: this.nextId("evt"),
      timestamp: new Date().toISOString(),
      agentId: approval.agentId,
      agentName: approval.agentName,
      department: agent?.department ?? "QwenWork Ops",
      system: "QwenWork Core",
      outcome: resolution.action === "REJECT" ? "BLOCKED" : "RBAC_OVERRIDE",
      title: `Founder ${resolution.action.toLowerCase()}d held action`,
      detail: `${approval.action.actionType} (${approval.stage}) resolved by founder.`,
    });
    this.persist();
    return { approval };
  }

  getBoardCase(agentId: string): BoardReviewCase | undefined {
    const agent = this.getAgent(agentId);
    if (!agent) return undefined;
    const seat = this.state.seats.find((s) => s.id === agent.assignedSeatId);
    return getBoardReviewCase(agent, seat, this.presetCases);
  }

  getMetrics(): MetricsSnapshot {
    const sorted = [...this.latencies].sort((a, b) => a - b);
    return {
      actionsEvaluated: this.counters.evaluated,
      leaksBlocked: this.counters.leaksBlocked,
      autonomyRate:
        this.counters.evaluated === 0 ? 0 : this.counters.allowed / this.counters.evaluated,
      guardLatencyP50Ms: percentile(sorted, 50),
      guardLatencyP95Ms: percentile(sorted, 95),
      pendingApprovals: this.approvals.filter((a) => a.status === "PENDING").length,
      violationsBySeverity: { ...this.counters.violations },
      founderHoursSavedEstimate: Math.round(this.counters.allowed * 0.1 * 10) / 10,
    };
  }

  reset(): void {
    this.state = buildSeed(this.presetId);
    this.audit = [];
    this.approvals = [];
    this.latencies = [];
    this.counters = { evaluated: 0, allowed: 0, leaksBlocked: 0, violations: { LOW: 0, HIGH: 0, CRITICAL: 0 } };
    this.persist();
  }

  serialize(): StoreSnapshot {
    return {
      seed: this.state,
      audit: this.audit,
      approvals: this.approvals,
      latencies: this.latencies,
      counters: this.counters,
    };
  }

  protected hydrate(snap: StoreSnapshot): void {
    this.state = snap.seed;
    this.audit = snap.audit;
    this.approvals = snap.approvals;
    this.latencies = snap.latencies;
    this.counters = snap.counters;
    // Re-link shared per-seat error budgets after JSON round-trip.
    for (const [agentId, byCap] of Object.entries(this.state.records)) {
      const budget = this.state.budgets[agentId];
      if (!budget) continue;
      for (const rec of Object.values(byCap)) rec.errorBudget = budget;
    }
  }
}
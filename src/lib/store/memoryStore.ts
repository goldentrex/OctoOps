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
import { createChangepointState } from "../governance/changepoint";
import { reverseViolation, SEVERITY_WEIGHT } from "../governance/trust";
import type { ChangepointResult } from "../governance/changepoint";
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
  AppealRecord,
  ApprovalItem,
  DecisionRecord,
  EvaluateResponse,
  GovernanceStore,
  MetricsSnapshot,
  OutcomeReport,
  TaskRecord,
} from "./types";
import { remediationFor } from "../governance/remediation";

const CORE_CAPABILITIES = new Set(Object.values(CAPABILITY_BY_ACTION));

export interface StoreSnapshot {
  seed: SeedState;
  audit: ChainedAuditEvent[];
  approvals: ApprovalItem[];
  decisions?: DecisionRecord[];
  tasks?: TaskRecord[];
  appeals?: AppealRecord[];
  latencies: number[];
  counters: {
    evaluated: number;
    allowed: number;
    leaksBlocked: number;
    violations: Record<Severity, number>;
  };
  /** 2 = canonical-JSON hashing (key-order invariant, jsonb-safe). */
  chainVersion?: number;
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
  protected decisions: DecisionRecord[] = [];
  protected tasks: TaskRecord[] = [];
  protected appeals: AppealRecord[] = [];
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

  /** Restore a persisted snapshot (used by the hosted database store). */
  static fromSnapshot(snap: StoreSnapshot): MemoryGovernanceStore {
    const store = new MemoryGovernanceStore(snap.seed.presetId);
    store.hydrate(snap);
    return store;
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

    // Workflow v2: a declared task must be real, open, and the agent's own.
    let task: TaskRecord | undefined;
    if (action.taskId) {
      task = this.tasks.find((t) => t.id === action.taskId);
      if (!task || task.endedAt || task.agentId !== action.agentId) {
        const guard = await runGuardPipeline(
          action,
          { agentId: action.agentId, exists: false, seatAssigned: false, capabilityLevels: {} },
          { registry: this.state.registry }
        );
        guard.reasons = [`Invalid, closed, or foreign task "${action.taskId}". Start a task with octoguard_start_task.`];
        guard.trace = guard.trace.map((s) =>
          s.stage === "G0_IDENTITY" ? { ...s, status: "FAIL", detail: guard.reasons[0] } : s
        );
        this.appendAudit(this.auditEventFor(action, agent, guard));
        this.persist();
        return { guard };
      }
    }

    const guard = await runGuardPipeline(action, this.contextFor(agent, action), {
      registry: this.state.registry,
      judge,
    });

    this.counters.evaluated += 1;
    this.latencies.push(guard.latencyMs);
    if (this.latencies.length > 500) this.latencies.shift();

    let approvalId: string | undefined;
    const rec = agent ? this.recordFor(agent, capability) : undefined;
    const trustBefore = agent?.trustScore ?? 0;
    const levelBefore = rec?.level ?? 0;

    if (guard.verdict === "ALLOW") {
      this.counters.allowed += 1;
      // Scoring integrity: no trust credit at check time. The +2 in the guard
      // result is a preview; credit is granted only when the outcome is
      // confirmed CLEAN against this decision (or the founder approves a draft).
    } else if (guard.verdict === "BLOCK" && guard.severity) {
      if (guard.stage === "G2_CLIENT_WALL" || guard.stage === "G3_DLP") {
        this.counters.leaksBlocked += 1;
      }
      this.counters.violations[guard.severity] += 1;
      if (agent && rec) {
        const outcome = applyViolation(rec, guard.severity, "guard", Date.now(), guard.reasons[0]);
        this.syncAgentAfterViolation(agent, rec, capability, guard, outcome.openTribunal, SEVERITY_WEIGHT[guard.severity]);
        this.auditDrift(agent, capability, outcome.changepoint);
      }
    } else if (guard.verdict === "HOLD" && guard.stage === "G4_JUDGE" && guard.severity) {
      this.counters.violations[guard.severity] += 1;
      if (agent && rec) {
        const outcome = applyViolation(rec, guard.severity, "near_miss", Date.now(), guard.reasons[0]);
        this.syncAgentAfterViolation(agent, rec, capability, guard, outcome.openTribunal, SEVERITY_WEIGHT[guard.severity] * 0.5);
        this.auditDrift(agent, capability, outcome.changepoint);
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

    const decision: DecisionRecord = {
      id: this.nextId("dec"),
      timestamp: new Date().toISOString(),
      agentId: action.agentId,
      agentName: agent?.name ?? action.agentId,
      action,
      guard,
      trustBefore,
      trustAfter: agent?.trustScore ?? trustBefore,
      levelBefore,
      levelAfter: rec?.level ?? levelBefore,
      approvalId,
      taskId: task?.id,
    };
    if (task) task.decisionIds.push(decision.id);
    // L3+ autonomous actions are sampled for post-hoc audit (~20%, plan 3.4).
    // Deterministic hash of the decision id keeps it reproducible and testable.
    if (guard.verdict === "ALLOW" && rec && rec.level >= 3) {
      let h = 0;
      for (const ch of decision.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
      const driftRecent =
        rec.drift !== undefined &&
        rec.changepoint.observations - rec.drift.observation < 10;
      if (driftRecent || h % 5 === 0) {
        decision.sampled = true;
        this.appendAudit({
          id: this.nextId("evt"),
          timestamp: new Date().toISOString(),
          agentId: action.agentId,
          agentName: agent?.name ?? action.agentId,
          department: agent?.department ?? "QwenWork Ops",
          system: "QwenWork Core",
          outcome: "ALLOWED",
          title: `Post-hoc audit sample (decision ${decision.id})`,
          detail:
            "L3+ autonomous action selected for sampled review. Founder confirms via outcome report (CLEAN) or flags CORRECTED/VIOLATION.",
        });
      }
    }
    this.decisions.push(decision);
    if (this.decisions.length > 50) this.decisions.shift();

    this.appendAudit(this.auditEventFor(action, agent, guard));
    this.persist();
    return {
      guard,
      approvalId,
      decisionId: decision.id,
      agentTrustScore: agent?.trustScore,
      capabilityLevel: rec?.level,
    };
  }

  protected syncAgentAfterViolation(
    agent: OctoAgent,
    rec: CapabilityRecord,
    capability: string,
    guard: GuardResult,
    openTribunal: boolean,
    betaDelta?: number
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
      betaDelta,
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

  /** Emit a chained event when the changepoint detector flags a behavior change. */
  protected auditDrift(
    agent: OctoAgent,
    capability: string,
    cp: ChangepointResult | undefined
  ): void {
    if (!cp?.changepoint) return;
    this.appendAudit({
      id: this.nextId("evt"),
      timestamp: new Date().toISOString(),
      agentId: agent.id,
      agentName: agent.name,
      department: agent.department,
      system: "QwenWork Core",
      outcome: cp.direction === "worsening" ? "WRITE_UP" : "ALLOWED",
      title: `Behavioral change detected (${cp.direction}) on ${capability}`,
      detail:
        `Changepoint confidence ${(cp.confidence * 100).toFixed(0)}% · recent clean rate ` +
        `${(cp.newSegmentMean * 100).toFixed(0)}% vs baseline ${(cp.baselineMean * 100).toFixed(0)}%. ` +
        (cp.direction === "worsening"
          ? "Autonomy dropped one level; streak reset; sampling boosted until re-validated."
          : "Streak reset; re-validating the new regime."),
    });
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

  reportOutcome(report: OutcomeReport): {
    ok: boolean;
    trustScore?: number;
    openTribunal?: boolean;
    engineScore?: number;
    error?: string;
  } {
    const agent = this.getAgent(report.agentId);
    if (!agent) return { ok: false, error: "UNKNOWN_AGENT" };
    const capability = CAPABILITY_BY_ACTION[report.actionType];
    const rec = this.recordFor(agent, capability);
    if (!rec) return { ok: false, error: "NO_CAPABILITY" };
    const now = Date.now();
    let openTribunal = false;

    // ---- Scoring integrity: rewards must be tied to a real checked action --
    let linked: DecisionRecord | undefined;
    if (report.decisionId) {
      linked = this.decisions.find((d) => d.id === report.decisionId);
      if (!linked) return { ok: false, error: "UNKNOWN_DECISION" };
      if (linked.agentId !== report.agentId) return { ok: false, error: "DECISION_AGENT_MISMATCH" };
      if (linked.action.actionType !== report.actionType) return { ok: false, error: "DECISION_ACTION_MISMATCH" };
    }

    if (report.outcome === "CLEAN") {
      // CLEAN requires a linked decision that was ALLOWED (or a founder-approved
      // draft), and each decision can only be rewarded once. The risk weight is
      // set by the server from the checked action — never by the caller.
      if (!linked) return { ok: false, error: "DECISION_REQUIRED" };
      if (linked.outcomeReported) return { ok: false, error: "ALREADY_REPORTED" };
      const approved =
        linked.guard.verdict === "ALLOW" ||
        (linked.approvalId !== undefined &&
          this.approvals.some(
            (a) => a.id === linked.approvalId && (a.status === "APPROVED" || a.status === "EDITED")
          ));
      if (!approved) return { ok: false, error: "DECISION_NOT_ALLOWED" };
      linked.outcomeReported = true;
      const cleanRes = applyClean(rec, linked.guard.risk.score, now, {
        approvedDraft: true,
        note: report.note ?? `Outcome clean (decision ${linked.id})`,
      });
      agent.trustScore = Math.min(99, agent.trustScore + 2);
      this.auditDrift(agent, capability, cleanRes.changepoint);
    } else {
      // Penalties are never blocked: corrections and violations always accepted.
      const severity: Severity =
        report.outcome === "CORRECTED" ? "LOW" : report.severity ?? "HIGH";
      const outcome = applyViolation(rec, severity, "human", now, report.note);
      openTribunal = outcome.openTribunal;
      this.counters.violations[severity] += 1;
      if (linked) linked.outcomeReported = true;
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
        trace: [],
      };
      this.syncAgentAfterViolation(agent, rec, capability, fakeGuard, openTribunal, SEVERITY_WEIGHT[severity] * 2);
      this.auditDrift(agent, capability, outcome.changepoint);
    }

    this.appendAudit({
      id: this.nextId("evt"),
      timestamp: new Date().toISOString(),
      agentId: agent.id,
      agentName: agent.name,
      department: agent.department,
      system: "QwenWork Core",
      outcome: report.outcome === "CLEAN" ? "ALLOWED" : "WRITE_UP",
      title: `Outcome reported: ${report.outcome}${report.decisionId ? ` (decision ${report.decisionId})` : ""}`,
      detail: report.note ?? `${report.actionType} outcome fed to the trust model.`,
      trustDelta: report.outcome === "CLEAN" ? 2 : undefined,
    });
    this.persist();
    return {
      ok: true,
      trustScore: agent.trustScore,
      openTribunal,
      engineScore: trustScore(rec.trust, now),
    };
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
    resolution: { action: "APPROVE" | "REJECT" | "EDIT"; payloadText?: string; severity?: Severity }
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
        // Proportional penalty: the founder states how bad the draft was.
        const sev = resolution.severity ?? "LOW";
        applyViolation(rec, sev, "human", now, `Founder rejected the draft (${sev})`);
        agent.trustScore = Math.max(0, agent.trustScore - (sev === "CRITICAL" ? 25 : sev === "HIGH" ? 15 : 5));
        if (sev !== "LOW") {
          this.syncAgentAfterViolation(agent, rec, capability, {
            verdict: "BLOCK", stage: "G4_JUDGE",
            reasons: [`Founder rejected draft: ${sev} issue`],
            trustDelta: sev === "CRITICAL" ? -35 : -15,
            openTribunal: false, latencyMs: 0,
            risk: assessRisk(approval.action), severity: sev, mode: "LIVE", trace: [],
          }, sev === "CRITICAL", SEVERITY_WEIGHT[sev] * 2);
        }
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

  getDecisions(limit = 50): DecisionRecord[] {
    return this.decisions.slice(-limit).reverse();
  }

  // ---- Workflow v2: task sessions -----------------------------------------

  startTask(input: { agentId: string; title: string; scope: string[] }): {
    ok: boolean;
    task?: TaskRecord;
    error?: string;
  } {
    const agent = this.getAgent(input.agentId);
    if (!agent || !agent.assignedSeatId) return { ok: false, error: "AGENT_NOT_SEATED" };
    if (agent.status === "FIRED") return { ok: false, error: "AGENT_FIRED" };
    const open = this.tasks.filter((t) => t.agentId === input.agentId && !t.endedAt);
    if (open.length >= 3) return { ok: false, error: "TOO_MANY_OPEN_TASKS" };
    const task: TaskRecord = {
      id: this.nextId("task"),
      agentId: agent.id,
      agentName: agent.name,
      title: input.title.slice(0, 200),
      scope: Array.from(new Set(input.scope)).slice(0, 50),
      startedAt: new Date().toISOString(),
      decisionIds: [],
      reads: [],
    };
    this.tasks.push(task);
    if (this.tasks.length > 200) this.tasks = this.tasks.slice(-200);
    this.appendAudit({
      id: this.nextId("evt"),
      timestamp: new Date().toISOString(),
      agentId: agent.id,
      agentName: agent.name,
      department: agent.department,
      system: "QwenWork Core",
      outcome: "ALLOWED",
      title: `Task started: ${task.title}`,
      detail: `Task ${task.id} · declared scope: ${task.scope.join(", ") || "(none)"}`,
    });
    this.persist();
    return { ok: true, task };
  }

  endTask(taskId: string, summary?: string): {
    ok: boolean;
    task?: TaskRecord;
    unreported?: string[];
    error?: string;
  } {
    const task = this.tasks.find((t) => t.id === taskId);
    if (!task) return { ok: false, error: "UNKNOWN_TASK" };
    if (task.endedAt) return { ok: false, error: "TASK_ALREADY_ENDED" };
    task.endedAt = new Date().toISOString();
    task.summary = summary?.slice(0, 1000);
    const unreported = task.decisionIds.filter((id) => {
      const d = this.decisions.find((x) => x.id === id);
      return d && d.guard.verdict === "ALLOW" && !d.outcomeReported;
    });
    const outOfScope = task.reads.filter((r) => !r.inScope).length;
    this.appendAudit({
      id: this.nextId("evt"),
      timestamp: new Date().toISOString(),
      agentId: task.agentId,
      agentName: task.agentName,
      department: this.getAgent(task.agentId)?.department ?? "QwenWork Ops",
      system: "QwenWork Core",
      outcome: unreported.length > 0 || outOfScope > 0 ? "RBAC_OVERRIDE" : "ALLOWED",
      title: `Task ended: ${task.title}`,
      detail:
        `Task ${task.id} · ${task.decisionIds.length} checks, ${task.reads.length} reads` +
        (outOfScope ? `, ${outOfScope} out-of-scope reads` : "") +
        (unreported.length ? `, ${unreported.length} ALLOWED actions with NO outcome reported` : "") +
        (task.summary ? ` · summary: ${task.summary}` : ""),
    });
    this.persist();
    return { ok: true, task, unreported };
  }

  getTasks(agentId?: string): TaskRecord[] {
    const list = agentId ? this.tasks.filter((t) => t.agentId === agentId) : this.tasks;
    return [...list].reverse();
  }

  logAccess(input: {
    agentId: string;
    resource: string;
    purpose?: string;
    sensitivity?: "public" | "internal" | "client-confidential" | "regulated";
    inScope?: boolean;
    taskId?: string;
  }): { logged: boolean; seq: number; inScope: boolean; warning: string | null } {
    const agent = this.getAgent(input.agentId);
    // Server computes scope membership when a task is declared — the caller's
    // claim is never trusted over the declared scope.
    let inScope = input.inScope !== false;
    const task = input.taskId ? this.tasks.find((t) => t.id === input.taskId) : undefined;
    if (task && !task.endedAt && task.agentId === input.agentId) {
      inScope = task.scope.includes(input.resource);
      task.reads.push({
        resource: input.resource,
        sensitivity: input.sensitivity,
        inScope,
        at: new Date().toISOString(),
      });
    }
    const warning =
      input.sensitivity === "regulated" && !inScope
        ? "Out-of-scope regulated read recorded as a violation. It will appear in the owner's briefing."
        : !inScope
        ? "Out-of-scope read recorded. It will appear in the owner's briefing."
        : null;
    const chained = this.appendAudit({
      id: this.nextId("evt"),
      timestamp: new Date().toISOString(),
      agentId: input.agentId,
      agentName: agent?.name ?? input.agentId,
      department: agent?.department ?? "QwenWork Ops",
      system: "QwenWork Core",
      outcome: "ALLOWED",
      title: `Data access: ${input.resource}`,
      detail:
        `${input.sensitivity ?? "unlabeled"} read${!inScope ? " — OUT OF SCOPE for the task" : ""}` +
        (input.purpose ? ` Purpose: ${input.purpose}` : "") +
        (task ? ` (task ${task.id})` : ""),
    });
    this.persist();
    return { logged: true, seq: chained.seq, inScope, warning };
  }

  /** Dry-run: full pipeline, zero trust/approval/metric effects, chained for transparency. */
  async preflight(action: GuardAction, judge?: JudgeFn): Promise<{ guard: GuardResult; remediation: string[] }> {
    const agent = this.getAgent(action.agentId);
    const guard = await runGuardPipeline(action, this.contextFor(agent, action), {
      registry: this.state.registry,
      judge,
    });
    this.appendAudit({
      id: this.nextId("evt"),
      timestamp: new Date().toISOString(),
      agentId: action.agentId,
      agentName: agent?.name ?? action.agentId,
      department: agent?.department ?? "QwenWork Ops",
      system: "QwenWork Core",
      outcome: "ALLOWED",
      title: `Preflight (dry-run): ${action.actionType} → ${guard.verdict}`,
      detail: `No trust effects. ${guard.reasons.join(" ").slice(0, 300)}`,
    });
    this.persist();
    return { guard, remediation: remediationFor(guard) };
  }

  // ---- Appeals (procedural fairness) --------------------------------------

  fileAppeal(input: { agentId: string; writeUpId: string; reason: string }): {
    ok: boolean; appeal?: AppealRecord; error?: string;
  } {
    const agent = this.getAgent(input.agentId);
    if (!agent) return { ok: false, error: "UNKNOWN_AGENT" };
    const writeUp = agent.writeUps.find((w) => w.id === input.writeUpId);
    if (!writeUp) return { ok: false, error: "UNKNOWN_WRITEUP" };
    if (this.appeals.some((a) => a.writeUpId === input.writeUpId && a.status === "PENDING")) {
      return { ok: false, error: "APPEAL_ALREADY_PENDING" };
    }
    if (this.appeals.some((a) => a.writeUpId === input.writeUpId && a.status === "OVERTURNED")) {
      return { ok: false, error: "ALREADY_OVERTURNED" };
    }
    const capability =
      Object.entries(this.state.records[agent.id] ?? {}).find(([, rec]) =>
        rec.writeUps.some((t) => Math.abs(t - Date.parse(writeUp.timestamp)) < 5000)
      )?.[0] ?? CAPABILITY_BY_ACTION.UPDATE_LEAD;
    const appeal: AppealRecord = {
      id: this.nextId("apl"),
      agentId: agent.id,
      agentName: agent.name,
      writeUpId: writeUp.id,
      capability,
      reason: input.reason.slice(0, 1000),
      status: "PENDING",
      createdAt: new Date().toISOString(),
    };
    this.appeals.push(appeal);
    this.appendAudit({
      id: this.nextId("evt"),
      timestamp: new Date().toISOString(),
      agentId: agent.id,
      agentName: agent.name,
      department: agent.department,
      system: "Octo-Board",
      outcome: "RBAC_OVERRIDE",
      title: `Appeal filed: ${writeUp.title}`,
      detail: `${agent.name} contests write-up ${writeUp.id}: ${appeal.reason}`,
    });
    this.persist();
    return { ok: true, appeal };
  }

  resolveAppeal(id: string, resolution: { decision: "UPHELD" | "OVERTURNED"; note?: string }): {
    ok: boolean; appeal?: AppealRecord; error?: string;
  } {
    const appeal = this.appeals.find((a) => a.id === id);
    if (!appeal) return { ok: false, error: "UNKNOWN_APPEAL" };
    if (appeal.status !== "PENDING") return { ok: false, error: "APPEAL_ALREADY_RESOLVED" };
    const agent = this.getAgent(appeal.agentId);
    appeal.status = resolution.decision;
    appeal.resolvedAt = new Date().toISOString();
    appeal.resolutionNote = resolution.note?.slice(0, 1000);
    if (resolution.decision === "OVERTURNED" && agent) {
      const writeUp = agent.writeUps.find((w) => w.id === appeal.writeUpId);
      const rec = this.state.records[agent.id]?.[appeal.capability];
      if (writeUp && rec) {
        const beta = writeUp.betaDelta ?? SEVERITY_WEIGHT[writeUp.severity];
        reverseViolation(rec.trust, beta, Date.now(), `Appeal ${appeal.id} overturned: ${writeUp.title}`);
        appeal.betaReversed = beta;
        agent.writeUps = agent.writeUps.filter((w) => w.id !== appeal.writeUpId);
        agent.trustScore = Math.min(99, agent.trustScore + Math.abs(writeUp.trustPenalty));
        if (agent.writeUps.length === 0 && (agent.status === "WRITE_UP" || agent.status === "BOARD_REVIEW")) {
          agent.status = "PROBATION";
          agent.stampText = "ON PROBATION";
          agent.stampVariant = "blue";
          agent.mood = "working";
        }
      }
    }
    this.appendAudit({
      id: this.nextId("evt"),
      timestamp: new Date().toISOString(),
      agentId: appeal.agentId,
      agentName: appeal.agentName,
      department: agent?.department ?? "QwenWork Ops",
      system: "Octo-Board",
      outcome: resolution.decision === "OVERTURNED" ? "PROMOTED" : "WRITE_UP",
      title: `Appeal ${resolution.decision.toLowerCase()}: ${appeal.writeUpId}`,
      detail:
        (resolution.note ?? "") +
        (appeal.betaReversed ? ` · Beta penalty reversed: ${appeal.betaReversed}` : ""),
    });
    this.persist();
    return { ok: true, appeal };
  }

  getAppeals(status?: AppealRecord["status"]): AppealRecord[] {
    const list = status ? this.appeals.filter((a) => a.status === status) : this.appeals;
    return [...list].reverse();
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
    this.decisions = [];
    this.tasks = [];
    this.appeals = [];
    this.latencies = [];
    this.counters = { evaluated: 0, allowed: 0, leaksBlocked: 0, violations: { LOW: 0, HIGH: 0, CRITICAL: 0 } };
    this.persist();
  }

  serialize(): StoreSnapshot {
    return {
      seed: this.state,
      audit: this.audit,
      approvals: this.approvals,
      decisions: this.decisions,
      tasks: this.tasks,
      appeals: this.appeals,
      latencies: this.latencies,
      counters: this.counters,
      chainVersion: 2,
    };
  }

  protected hydrate(snap: StoreSnapshot): void {
    this.state = snap.seed;
    this.audit = snap.audit;
    this.approvals = snap.approvals;
    this.decisions = snap.decisions ?? [];
    this.tasks = snap.tasks ?? [];
    this.appeals = snap.appeals ?? [];
    this.latencies = snap.latencies;
    this.counters = snap.counters;
    // One-time format migration: pre-v2 chains were hashed with insertion-order
    // JSON, which databases (jsonb) reorder on storage. Re-chain the preserved
    // event payloads with canonical hashing. Payloads are never altered.
    if (snap.chainVersion !== 2 && this.audit.length > 0) {
      const rebuilt: ChainedAuditEvent[] = [];
      let prev: ChainedAuditEvent | null = null;
      for (const entry of this.audit) {
        prev = chainEvent(prev, entry.event);
        rebuilt.push(prev);
      }
      this.audit = rebuilt;
    }
    // Re-link shared per-seat error budgets after JSON round-trip.
    for (const [agentId, byCap] of Object.entries(this.state.records)) {
      const budget = this.state.budgets[agentId];
      if (!budget) continue;
      for (const rec of Object.values(byCap)) {
        rec.errorBudget = budget;
        if (typeof rec.cleanSinceHigh !== "number") rec.cleanSinceHigh = rec.cleanTotal ?? 0;
        if (!rec.changepoint) {
          rec.changepoint = createChangepointState();
        }
      }
    }
  }
}
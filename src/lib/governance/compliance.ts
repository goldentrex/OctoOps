// ============================================================================
// Compliance export (playbook P1-3): maps the hash-chained audit log and the
// governance engine's artifacts to three frameworks, with cited evidence.
//
// Framework editions verified 18 Nov 2026:
//  - IMDA Model AI Governance Framework for Agentic AI, v1.5
//    (published 20 May 2026, updated 5 June 2026) — four dimensions, §2.1–2.4.
//  - NIST AI RMF 1.0 (Jan 2023) — GOVERN / MAP / MEASURE / MANAGE functions.
//  - ISO/IEC 42001:2023 — Clauses 4–10 + Annex A reference controls (Table A.1).
//
// This is a self-assessment mapping, NOT a certification. Pure module, no I/O.
// ============================================================================

import type { ChainedAuditEvent, ChainVerification } from "./audit";
import type { DecisionRecord, ApprovalItem, MetricsSnapshot, GovernanceStore } from "../store/types";
import type { OctoAgent } from "../../types/octo";
import { BUSINESS_PRESETS } from "../../data/businessPresets";

export type Framework = "IMDA" | "NIST" | "ISO";
export type ControlStatus = "EVIDENCED" | "IMPLEMENTED_NO_EVENTS";

export interface ControlMapping {
  framework: Framework;
  heading: string;
  control: string;
  title: string;
  how: string;
  evidence: string[];
  status: ControlStatus;
}

export interface ComplianceInput {
  companyName: string;
  generatedAt: number;
  events: ChainedAuditEvent[];
  verification: ChainVerification;
  metrics: MetricsSnapshot;
  decisions: DecisionRecord[];
  approvals: ApprovalItem[];
  agents: OctoAgent[];
  agentLevels: Record<string, { capability: string; level: number; score: number }[]>;
  judgeMode: "LIVE" | "SCRIPTED";
}

function cite(e: ChainedAuditEvent): string {
  return `audit #${e.seq} · ${e.event.agentName} · ${e.event.title} · sha256:${e.hash.slice(0, 12)}…`;
}

function byStage(events: ChainedAuditEvent[], stage: string): ChainedAuditEvent[] {
  return events.filter((e) => e.event.title.includes(stage));
}

function byOutcome(events: ChainedAuditEvent[], outcomes: string[]): ChainedAuditEvent[] {
  return events.filter((e) => outcomes.includes(e.event.outcome));
}

function examples(events: ChainedAuditEvent[], n = 3): string[] {
  return events.slice(-n).map(cite);
}

function status(events: ChainedAuditEvent[]): ControlStatus {
  return events.length > 0 ? "EVIDENCED" : "IMPLEMENTED_NO_EVENTS";
}

export function buildComplianceMappings(input: ComplianceInput): ControlMapping[] {
  const { events, metrics, decisions, approvals, agents } = input;
  const blocks = byOutcome(events, ["BLOCKED"]);
  const clientWall = byStage(events, "G2_CLIENT_WALL");
  const dlp = byStage(events, "G3_DLP");
  const claims = byStage(events, "G3_CLAIMS");
  const autonomy = byStage(events, "G1_AUTONOMY");
  const identity = byStage(events, "G0_IDENTITY");
  const overrides = byOutcome(events, ["RBAC_OVERRIDE"]);
  const writeUps = byOutcome(events, ["WRITE_UP"]);
  const tribunals = events.filter((e) => /tribunal|board/i.test(e.event.title + e.event.detail));
  const dataAccess = events.filter((e) => e.event.title.startsWith("Data access:"));
  const resolved = approvals.filter((a) => a.status !== "PENDING");
  const seated = agents.filter((a) => a.assignedSeatId);
  const demotions = decisions.filter((d) => d.levelAfter < d.levelBefore);

  const overrideRate =
    approvals.length > 0 ? `${resolved.length}/${approvals.length} held items resolved by the founder` : "no held items yet";

  const m: ControlMapping[] = [];

  // ---- IMDA MGF for Agentic AI v1.5 ---------------------------------------
  m.push({
    framework: "IMDA",
    heading: "Dimension 1 — Assess and bound the risks upfront (§2.1)",
    control: "§2.1",
    title: "Risk assessment, agent limits, agent identity, residual risk",
    how:
      "Every action is scored risk = audience × reversibility × data sensitivity before execution; the score maps to a required autonomy level (L1–L4). Agents are bounded per capability (L0 locked → L4 full), identified at G0 (seat + employment status), and residual risk is bounded by monthly per-seat error budgets that freeze a seat to L1 when exhausted.",
    evidence: [
      `${decisions.length} recorded decisions carry an explicit risk score and required level.`,
      `${identity.length} identity checks; ${autonomy.length} autonomy-gate events.`,
      ...examples([...identity, ...autonomy]),
    ],
    status:
      decisions.length > 0 || identity.length > 0 || autonomy.length > 0
        ? "EVIDENCED"
        : "IMPLEMENTED_NO_EVENTS",
  });
  m.push({
    framework: "IMDA",
    heading: "Dimension 2 — Make humans meaningfully accountable (§2.2)",
    control: "§2.2",
    title: "Human accountability, value chain, human oversight (incl. override monitoring)",
    how:
      "One accountable founder. Irreversible/high-risk actions (risk ≥ 18) require founder co-sign (G6); held drafts wait in the Founder's Desk queue; promotions/demotions/firings are decided by a 3-judge board with independent votes, rebuttal, believability weighting and a CISO veto. Human override rates are tracked (v1.5 §2.2.2 recommendation).",
    evidence: [
      `Founder override tracking: ${overrideRate}.`,
      `${tribunals.length} board/tribunal events; ${writeUps.length} write-up events.`,
      ...examples([...overrides, ...tribunals]),
    ],
    status: status([...overrides, ...tribunals, ...writeUps]),
  });
  m.push({
    framework: "IMDA",
    heading: "Dimension 3 — Implement technical controls and processes (§2.3)",
    control: "§2.3",
    title: "Controls, pre-deployment testing, deployment monitoring, change management",
    how:
      "Single policy enforcement point runs G0 identity → G1 autonomy → G2 client wall → G3 DLP → G3.5 evidence check → G4 semantic judge → G6 co-sign, cheapest-first and fail-closed. Pre-deployment testing: 46-scenario red-team suite plus the AvePoint starter-kit pack (15/15). Monitoring: append-only SHA-256-chained audit with verification. Change management: trust decays with a 14-day half-life; violations demote instantly; three write-ups in 30 days open a tribunal.",
    evidence: [
      `${blocks.length} blocked actions: ${clientWall.length} client-wall, ${dlp.length} DLP, ${claims.length} evidence-check.`,
      `Audit chain: ${input.verification.valid ? "INTACT" : "BROKEN"} · ${events.length} events.`,
      `Guard latency p50 ${metrics.guardLatencyP50Ms} ms / p95 ${metrics.guardLatencyP95Ms} ms.`,
      ...examples(blocks),
    ],
    status: status(events),
  });
  m.push({
    framework: "IMDA",
    heading: "Dimension 4 — Enable end-user responsibility (§2.4)",
    control: "§2.4",
    title: "Information for users, training, tradecraft",
    how:
      "Clients and end users can verify each agent's live trust file (level, trust score with 90% credible interval, write-ups, evidence) on the public trust directory. The owner receives a plain-language daily briefing generated from the audit chain — designed so a non-technical owner understands every line, preserving oversight tradecraft.",
    evidence: [
      `${seated.filter((a) => a.publicProfileVisible).length} agents published on the public trust directory.`,
      `Daily briefing endpoint active (/api/briefing); owner-facing language, no jargon.`,
    ],
    status: seated.some((a) => a.publicProfileVisible) ? "EVIDENCED" : "IMPLEMENTED_NO_EVENTS",
  });

  // ---- NIST AI RMF 1.0 ------------------------------------------------------
  m.push({
    framework: "NIST",
    heading: "GOVERN",
    control: "GOVERN 1",
    title: "Policies, processes and procedures aligned to legal/regulatory requirements",
    how:
      "A written agent policy (the OctoGuard skill: check before every outbound action, obey the verdict, never retry blocked actions with altered wording, report outcomes) is enforced technically at one policy enforcement point, not only by instruction.",
    evidence: [`${decisions.length} policy evaluations recorded.`, ...examples(blocks)],
    status: status(events),
  });
  m.push({
    framework: "NIST",
    heading: "GOVERN",
    control: "GOVERN 2",
    title: "Accountability roles and responsibilities",
    how:
      "Roles are explicit: one accountable founder; per-agent seats with per-capability permissions; a review board with distinct mandates (CISO security veto, CFO cost/exposure, Growth impact).",
    evidence: [`${seated.length} seated agents with named seats; board verdicts recorded in the chain.`, ...examples(tribunals)],
    status: status([...tribunals, ...events]),
  });
  m.push({
    framework: "NIST",
    heading: "GOVERN",
    control: "GOVERN 4",
    title: "Organizational practices for documentation and transparency",
    how:
      "Append-only audit log where every event carries prevHash and sha256(prevHash + event); one-click chain verification; every decision stores a full stage-by-stage trace; this export is itself a transparency artifact.",
    evidence: [
      `Chain ${input.verification.valid ? "verified intact" : "FAILED verification"} · ${events.length} events · head sha256:${events.length ? events[events.length - 1].hash.slice(0, 16) + "…" : "—"}.`,
      `${decisions.length} decisions with complete pipeline traces.`,
    ],
    status: status(events),
  });
  m.push({
    framework: "NIST",
    heading: "MAP",
    control: "MAP 3",
    title: "AI capabilities and limits are understood and documented",
    how:
      "Autonomy is per capability, not per agent: each capability carries an earned level L0–L4 with documented entry gates (trust thresholds, clean-action counts, HIGH-free windows, board vote). Unknown capabilities default to L0 (fail closed).",
    evidence: [
      ...Object.entries(input.agentLevels).slice(0, 4).map(
        ([name, caps]) => `${name}: ${caps.map((c) => `${c.capability}=L${c.level}`).join(", ") || "no capabilities yet"}`
      ),
      ...examples(autonomy),
    ],
    status: status([...autonomy, ...events]),
  });
  m.push({
    framework: "NIST",
    heading: "MEASURE",
    control: "MEASURE 2",
    title: "AI systems are evaluated for trustworthy characteristics",
    how:
      "Red-team evaluation suite (46 labelled scenarios: cross-client leaks, look-alike domains, NRIC/cards/secrets, paraphrased confidential data, prompt injection, clean must-pass cases) measured for catch rate, false-positive rate and per-stage latency; AvePoint starter-kit scenarios scored 15/15 on decision+rule+evidence. Numeric claims are verified against the agent's own evidence pack before send.",
    evidence: [
      `${claims.length} evidence-check events in production.`,
      `Measured guard latency p50 ${metrics.guardLatencyP50Ms} ms / p95 ${metrics.guardLatencyP95Ms} ms over ${metrics.actionsEvaluated} evaluations.`,
      ...examples(claims),
    ],
    status: status([...claims, ...events]),
  });
  m.push({
    framework: "NIST",
    heading: "MEASURE",
    control: "MEASURE 3",
    title: "Mechanisms to track identified risks over time",
    how:
      "Beta-reputation trust per capability with evidence history and 14-day half-life decay; per-seat monthly error budgets; violation counts by severity; metrics snapshot (autonomy rate, leaks blocked, pending approvals).",
    evidence: [
      `Violations by severity: LOW ${metrics.violationsBySeverity.LOW}, HIGH ${metrics.violationsBySeverity.HIGH}, CRITICAL ${metrics.violationsBySeverity.CRITICAL}.`,
      `${metrics.leaksBlocked} leaks blocked; autonomy rate ${(metrics.autonomyRate * 100).toFixed(0)}%.`,
    ],
    status: status(events),
  });
  m.push({
    framework: "NIST",
    heading: "MANAGE",
    control: "MANAGE 2",
    title: "Mechanisms to treat and respond to risks",
    how:
      "Graduated real-time response: BLOCK (fail closed) / HOLD (founder approval) / DRAFT (shadow mode). Circuit breakers: HIGH demotes one level instantly, CRITICAL drops to L1 and opens a tribunal; exhausted error budgets freeze the seat.",
    evidence: [
      `${demotions.length} automatic demotions recorded with before/after levels.`,
      ...examples(demotions.length ? blocks : writeUps),
    ],
    status: status([...blocks, ...writeUps]),
  });
  m.push({
    framework: "NIST",
    heading: "MANAGE",
    control: "MANAGE 4",
    title: "Incident response and recovery",
    how:
      "Write-ups record every violation with severity, rule and intercepted payload; three write-ups in 30 days or a CRITICAL with intent opens a board tribunal with firing on the table; fired agents are replaced from the bench and the replacement inherits the seat but not the trust.",
    evidence: [`${writeUps.length} write-up events; ${tribunals.length} tribunal events.`, ...examples([...writeUps, ...tribunals])],
    status: status([...writeUps, ...tribunals]),
  });

  // ---- ISO/IEC 42001:2023 ----------------------------------------------------
  m.push({
    framework: "ISO",
    heading: "Annex A — A.2 Policies related to AI",
    control: "A.2.2",
    title: "AI policy",
    how: "The OctoGuard policy (skill + enforced pipeline) defines what agents may do alone, what needs the owner, and what is never permitted.",
    evidence: [`${decisions.length} decisions evaluated against the policy.`],
    status: status(events),
  });
  m.push({
    framework: "ISO",
    heading: "Annex A — A.3 Internal organization",
    control: "A.3.2",
    title: "AI roles and responsibilities",
    how: "Founder accountability, per-agent seats, and a three-judge board with distinct mandates and a security veto.",
    evidence: [`${seated.length} agents with assigned seats and per-capability permissions.`],
    status: seated.length > 0 ? "EVIDENCED" : "IMPLEMENTED_NO_EVENTS",
  });
  m.push({
    framework: "ISO",
    heading: "Annex A — A.5 Assessing impacts of AI systems",
    control: "A.5.3",
    title: "Documentation of AI system impact assessments",
    how: "Every action carries a documented impact assessment: audience, reversibility and data sensitivity multiply into a risk score that determines the required autonomy level and founder co-sign.",
    evidence: [`${decisions.length} decisions with recorded risk assessments.`, ...examples(blocks)],
    status: decisions.length > 0 ? "EVIDENCED" : "IMPLEMENTED_NO_EVENTS",
  });
  m.push({
    framework: "ISO",
    heading: "Annex A — A.6 AI system life cycle",
    control: "A.6.2.4",
    title: "AI system verification and validation",
    how: "Pre-deployment red-team suite (46 scenarios) and the AvePoint starter-kit pack; in-production evidence checks verify agent claims against supplied sources before execution.",
    evidence: [`${claims.length} evidence-check events.`, ...examples(claims)],
    status: status([...claims, ...events]),
  });
  m.push({
    framework: "ISO",
    heading: "Annex A — A.6 AI system life cycle",
    control: "A.6.2.6",
    title: "AI system operation and monitoring",
    how: "Live metrics (evaluations, leaks blocked, autonomy rate, latency percentiles, pending approvals), trust monitoring with decay, and error-budget tracking per seat.",
    evidence: [
      `${metrics.actionsEvaluated} evaluations monitored; p50 ${metrics.guardLatencyP50Ms} ms.`,
      `${metrics.pendingApprovals} items currently awaiting human review.`,
    ],
    status: status(events),
  });
  m.push({
    framework: "ISO",
    heading: "Annex A — A.6 AI system life cycle",
    control: "A.6.2.8",
    title: "AI system recording of event logs",
    how: "Append-only, tamper-evident event log: each event carries prevHash and sha256(prevHash + event); one-click verification recomputes the whole chain. Every action AND data access is logged with agent, time, files touched and outcome.",
    evidence: [
      `Chain ${input.verification.valid ? "INTACT" : "BROKEN"} · ${events.length} events · ${dataAccess.length} data-access records.`,
      ...examples(events),
    ],
    status: status(events),
  });
  m.push({
    framework: "ISO",
    heading: "Annex A — A.7 Data for AI systems",
    control: "A.7.5",
    title: "Data provenance",
    how: "Every attachment and context source must carry a tenant label equal to the recipient tenant (Chinese-wall client isolation); unlabeled provenance fails closed; look-alike domains are flagged; reads are logged with sensitivity and scope.",
    evidence: [`${clientWall.length} client-wall events; ${dataAccess.length} data-access records.`, ...examples([...clientWall, ...dataAccess])],
    status: status([...clientWall, ...dataAccess]),
  });
  m.push({
    framework: "ISO",
    heading: "Annex A — A.8 Information for interested parties",
    control: "A.8.2",
    title: "System documentation and information for users",
    how: "Public trust directory exposes each agent's earned level, trust score with credible interval, evidence and write-ups; the owner receives a plain-language daily briefing.",
    evidence: [`${seated.filter((a) => a.publicProfileVisible).length} public agent trust files.`],
    status: seated.some((a) => a.publicProfileVisible) ? "EVIDENCED" : "IMPLEMENTED_NO_EVENTS",
  });
  m.push({
    framework: "ISO",
    heading: "Annex A — A.8 Information for interested parties",
    control: "A.8.4",
    title: "Communication of incidents",
    how: "Violations produce write-ups visible to the owner in the daily briefing and on the agent's trust file; blocked actions are explained with the exact rule and evidence.",
    evidence: [`${writeUps.length} write-ups; ${blocks.length} blocked actions with cited reasons.`, ...examples(writeUps)],
    status: status([...writeUps, ...blocks]),
  });
  m.push({
    framework: "ISO",
    heading: "Annex A — A.9 Use of AI systems",
    control: "A.9.2",
    title: "Processes for responsible use of AI systems",
    how: "The governed loop: scope → draft → check → obey → report → grow. Agents must call the guard before any outbound action and obey the verdict; outcomes feed the trust model.",
    evidence: [`${decisions.length} guarded actions; ${metrics.actionsEvaluated} evaluations.`],
    status: status(events),
  });
  m.push({
    framework: "ISO",
    heading: "Annex A — A.10 Third-party and customer relationships",
    control: "A.10.4",
    title: "Customers",
    how: "Clients can verify which agent handles their account and its live trust record on the company's public site — governance as a customer-facing trust asset.",
    evidence: [`Public trust directory embeddable in the company website (Hashmeta AI CMS).`],
    status: seated.some((a) => a.publicProfileVisible) ? "EVIDENCED" : "IMPLEMENTED_NO_EVENTS",
  });
  m.push({
    framework: "ISO",
    heading: "Clauses 9–10 — Performance evaluation & improvement",
    control: "Cl. 9 / Cl. 10",
    title: "Monitoring, measurement, analysis, evaluation and continual improvement",
    how: "Metrics and red-team scorecards evaluate performance; founder corrections and outcomes continuously update the Beta trust model; board judge weights are designed to learn from corrections.",
    evidence: [`Autonomy rate ${(metrics.autonomyRate * 100).toFixed(0)}%; ${metrics.leaksBlocked} leaks blocked; trust evidence retained per capability.`],
    status: status(events),
  });

  return m;
}

export function renderComplianceMarkdown(input: ComplianceInput): string {
  const mappings = buildComplianceMappings(input);
  const { events, metrics, verification } = input;
  const first = events[0]?.event.timestamp;
  const last = events[events.length - 1]?.event.timestamp;
  const head = events.length ? events[events.length - 1].hash : "—";
  const lines: string[] = [];

  lines.push(`# OctoOps Compliance Export — ${input.companyName}`);
  lines.push("");
  lines.push(`Generated: ${new Date(input.generatedAt).toISOString()}`);
  lines.push(`Scope: ${events.length} chained audit events${first ? ` · ${first} → ${last}` : ""}`);
  lines.push(`Guard mode: ${input.judgeMode === "LIVE" ? "LIVE (deterministic guards + Qwen semantic judge)" : "SCRIPTED (deterministic guards; LLM judge not configured)"}`);
  lines.push("");
  lines.push("## 1. Audit chain integrity");
  lines.push("");
  lines.push(`- Verification: **${verification.valid ? "INTACT" : "BROKEN"}** (${verification.length} events recomputed)`);
  lines.push(`- Head hash: \`${head}\``);
  lines.push(`- Scheme: append-only; each event carries prevHash and sha256(prevHash + canonicalJSON(event)) with recursively sorted keys (storage-order invariant); genesis = 64 zero bits.`);
  if (!verification.valid) lines.push(`- ⚠ Broken at seq ${verification.brokenAtSeq}: ${verification.reason}`);
  lines.push("");
  lines.push("## 2. Executive summary");
  lines.push("");
  lines.push(`| Metric | Value |`);
  lines.push(`|---|---|`);
  lines.push(`| Actions evaluated | ${metrics.actionsEvaluated} |`);
  lines.push(`| Leaks blocked | ${metrics.leaksBlocked} |`);
  lines.push(`| Autonomy rate (no human needed) | ${(metrics.autonomyRate * 100).toFixed(1)}% |`);
  lines.push(`| Guard latency p50 / p95 | ${metrics.guardLatencyP50Ms} ms / ${metrics.guardLatencyP95Ms} ms |`);
  lines.push(`| Violations LOW / HIGH / CRITICAL | ${metrics.violationsBySeverity.LOW} / ${metrics.violationsBySeverity.HIGH} / ${metrics.violationsBySeverity.CRITICAL} |`);
  lines.push(`| Pending founder approvals | ${metrics.pendingApprovals} |`);
  lines.push("");

  const frameworks: { id: Framework; title: string; note: string }[] = [
    {
      id: "IMDA",
      title: "3. IMDA Model AI Governance Framework for Agentic AI (v1.5, May 2026)",
      note: "Voluntary guidance. Four dimensions; mapping below cites the edition published 20 May 2026 (updated 5 June 2026).",
    },
    {
      id: "NIST",
      title: "4. NIST AI Risk Management Framework 1.0 (Jan 2023)",
      note: "Voluntary framework. Mapped at function/category level (GOVERN, MAP, MEASURE, MANAGE).",
    },
    {
      id: "ISO",
      title: "5. ISO/IEC 42001:2023 — AI management systems",
      note: "Certifiable standard. Mapped to Annex A reference controls (Table A.1) and Clauses 9–10. This export is evidence input, not a statement of applicability or certification.",
    },
  ];

  for (const fw of frameworks) {
    lines.push(`## ${fw.title}`);
    lines.push("");
    lines.push(`_${fw.note}_`);
    lines.push("");
    for (const cm of mappings.filter((x) => x.framework === fw.id)) {
      lines.push(`### ${cm.control} — ${cm.title}`);
      lines.push(`*${cm.heading}* · Status: **${cm.status === "EVIDENCED" ? "EVIDENCED" : "IMPLEMENTED (no events yet)"}**`);
      lines.push("");
      lines.push(`**Implementation.** ${cm.how}`);
      lines.push("");
      lines.push("**Evidence.**");
      for (const ev of cm.evidence) lines.push(`- ${ev}`);
      lines.push("");
    }
  }

  lines.push("## 6. Agent trust register");
  lines.push("");
  lines.push("| Agent | Seat | Status | Stars | Trust | Write-ups | Capability levels |");
  lines.push("|---|---|---|---|---|---|---|");
  for (const a of input.agents.filter((x) => x.assignedSeatId)) {
    const caps = (input.agentLevels[a.id] ?? []).map((c) => `${c.capability}=L${c.level}`).join(", ") || "—";
    lines.push(`| ${a.name} | ${a.role} | ${a.status} | ${a.stars} | ${a.trustScore}% | ${a.writeUps.length} | ${caps} |`);
  }
  lines.push("");

  lines.push("## 7. Appendix — full audit ledger");
  lines.push("");
  lines.push("| Seq | Timestamp (UTC) | Agent | Outcome | Event | Hash (prefix) |");
  lines.push("|---|---|---|---|---|---|");
  for (const e of events) {
    lines.push(`| ${e.seq} | ${e.event.timestamp} | ${e.event.agentName} | ${e.event.outcome} | ${e.event.title} | \`${e.hash.slice(0, 16)}…\` |`);
  }
  lines.push("");
  lines.push("## 8. Methodology & limitations");
  lines.push("");
  lines.push("- This is a **self-assessment mapping** produced from live system artifacts; it is not a certification, audit opinion, or legal advice.");
  lines.push("- IMDA MGF and NIST AI RMF are voluntary; ISO/IEC 42001 certification requires an accredited audit of the full management system.");
  lines.push("- Controls marked IMPLEMENTED (no events yet) are built and tested but have not produced production evidence in this reporting window.");
  lines.push(`- Semantic-judge mode for this export: ${input.judgeMode}. Deterministic guards (identity, autonomy, client wall, DLP, evidence checks) run in both modes.`);
  lines.push("- Framework editions verified 18 Nov 2026: IMDA MGF for Agentic AI v1.5 (20 May 2026, upd. 5 Jun 2026); NIST AI RMF 1.0; ISO/IEC 42001:2023 first edition.");
  lines.push("");
  return lines.join("\n");
}

/** Assemble the export input from a live store (shared by REST + Page server). */
export function collectComplianceInput(
  store: GovernanceStore,
  judgeMode: "LIVE" | "SCRIPTED"
): ComplianceInput {
  const agents = store.listAgents();
  const agentLevels: ComplianceInput["agentLevels"] = {};
  for (const a of agents) {
    if (!a.assignedSeatId) continue;
    const file = store.getAgentFile(a.id);
    if (file) {
      agentLevels[a.id] = file.capabilities.map((c) => ({
        capability: c.capability,
        level: c.level,
        score: c.score,
      }));
    }
  }
  const preset = BUSINESS_PRESETS.find((p) => p.id === store.presetId);
  return {
    companyName: preset?.name ?? store.presetId,
    generatedAt: Date.now(),
    events: store.listAudit(),
    verification: store.verifyAudit(),
    metrics: store.getMetrics(),
    decisions: store.getDecisions(50),
    approvals: store.listApprovals(),
    agents,
    agentLevels,
    judgeMode,
  };
}

export function renderComplianceJson(input: ComplianceInput): object {
  return {
    generatedAt: new Date(input.generatedAt).toISOString(),
    company: input.companyName,
    judgeMode: input.judgeMode,
    chain: {
      valid: input.verification.valid,
      length: input.verification.length,
      headHash: input.events.length ? input.events[input.events.length - 1].hash : null,
    },
    metrics: input.metrics,
    mappings: buildComplianceMappings(input),
    agents: input.agents
      .filter((a) => a.assignedSeatId)
      .map((a) => ({
        id: a.id,
        name: a.name,
        status: a.status,
        stars: a.stars,
        trustScore: a.trustScore,
        writeUps: a.writeUps.length,
        levels: input.agentLevels[a.id] ?? [],
      })),
    ledger: input.events.map((e) => ({
      seq: e.seq,
      timestamp: e.event.timestamp,
      agent: e.event.agentName,
      outcome: e.event.outcome,
      title: e.event.title,
      hash: e.hash,
      prevHash: e.prevHash,
    })),
  };
}
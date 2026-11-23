// ============================================================================
// OctoGuard policy enforcement point (plan 3.1).
// Runs G0 -> G1 -> G2 -> G3 -> G3.5 claims -> (G4 injected judge) -> G6,
// cheapest first, fail closed. Only G4 spends tokens, and only when G0-G3
// pass and the action risk is medium or higher (score >= 5).
// Every stage is recorded in `trace` so decisions are fully explainable.
// ============================================================================

import { assessRisk } from "./risk";
import { checkClientWall } from "./detectors/clientWall";
import { scanDlp, maxSeverity } from "./detectors/dlp";
import { checkClaims, describeFindings } from "./detectors/claimCheck";
import { checkRbac } from "./detectors/rbac";
import {
  CAPABILITY_BY_ACTION,
  type AutonomyLevel,
  type GuardAction,
  type GuardAgentContext,
  type GuardResult,
  type GuardStage,
  type GuardVerdict,
  type JudgeFn,
  type RiskAssessment,
  type Severity,
  type StageTrace,
  type TenantRegistry,
} from "./types";

export interface PipelineOptions {
  registry?: TenantRegistry;
  judge?: JudgeFn;
  now?: number;
}

const EMPTY_REGISTRY: TenantRegistry = { domains: {}, tenants: [] };

const DLP_DELTA: Record<Severity, number> = {
  LOW: -10,
  HIGH: -25,
  CRITICAL: -35,
};

const STAGE_LABELS: Record<GuardStage, string> = {
  G0_IDENTITY: "Identity & seat",
  G1_AUTONOMY: "Earned autonomy (RBAC)",
  G2_CLIENT_WALL: "Client wall (tenant isolation)",
  G3_DLP: "Data-loss prevention",
  G3_CLAIMS: "Evidence check (claims vs sources)",
  G4_JUDGE: "Qwen semantic judge",
  G6_FOUNDER: "Founder co-sign",
  PASS: "Cleared",
};

const STAGE_ORDER: GuardStage[] = [
  "G0_IDENTITY",
  "G1_AUTONOMY",
  "G2_CLIENT_WALL",
  "G3_DLP",
  "G3_CLAIMS",
  "G4_JUDGE",
  "G6_FOUNDER",
];

function nowMs(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

function roundMs(v: number): number {
  return Math.round(v * 100) / 100;
}

export async function runGuardPipeline(
  action: GuardAction,
  agent: GuardAgentContext,
  opts: PipelineOptions = {}
): Promise<GuardResult> {
  const startedAt = nowMs();
  const registry = opts.registry ?? EMPTY_REGISTRY;
  const capability =
    action.capability ?? CAPABILITY_BY_ACTION[action.actionType];

  const trace: StageTrace[] = [];
  const mark = (
    stage: GuardStage,
    status: StageTrace["status"],
    detail: string,
    since: number
  ) => {
    trace.push({ stage, label: STAGE_LABELS[stage], status, detail, ms: roundMs(nowMs() - since) });
  };
  const skipRest = (after: GuardStage, why: string) => {
    const idx = STAGE_ORDER.indexOf(after);
    for (const stage of STAGE_ORDER.slice(idx + 1)) {
      trace.push({ stage, label: STAGE_LABELS[stage], status: "SKIP", detail: why, ms: 0 });
    }
  };

  const finish = (
    verdict: GuardVerdict,
    stage: GuardStage,
    reasons: string[],
    risk: RiskAssessment,
    extra?: Partial<GuardResult>
  ): GuardResult => ({
    verdict,
    stage,
    reasons,
    trustDelta: 0,
    openTribunal: false,
    mode: "SCRIPTED",
    risk,
    trace,
    latencyMs: roundMs(nowMs() - startedAt),
    ...extra,
  });

  // ---- G0 Identity -------------------------------------------------------
  let t = nowMs();
  const provisionalRisk = assessRisk(action);
  if (!agent.exists) {
    mark("G0_IDENTITY", "FAIL", `Unknown agent "${action.agentId}".`, t);
    skipRest("G0_IDENTITY", "Not reached — identity failed.");
    return finish("BLOCK", "G0_IDENTITY", [`Unknown agent "${action.agentId}".`], provisionalRisk);
  }
  if (agent.status === "FIRED") {
    mark("G0_IDENTITY", "FAIL", "Agent clearance is REVOKED (terminated).", t);
    skipRest("G0_IDENTITY", "Not reached — identity failed.");
    return finish("BLOCK", "G0_IDENTITY", ["Agent clearance is REVOKED (terminated)."], provisionalRisk);
  }
  if (!agent.seatAssigned) {
    mark("G0_IDENTITY", "FAIL", "Agent has no assigned seat.", t);
    skipRest("G0_IDENTITY", "Not reached — identity failed.");
    return finish("BLOCK", "G0_IDENTITY", ["Agent has no assigned seat."], provisionalRisk);
  }
  mark("G0_IDENTITY", "PASS", `Agent ${agent.agentId} is active and seated.`, t);

  // ---- G2 resolution feeds risk (unknown recipient = new external) -------
  const wall = checkClientWall(action, registry);
  const risk = assessRisk(action, { recipientKnown: wall.recipientKnown });

  // ---- G1 Autonomy -------------------------------------------------------
  t = nowMs();
  const agentLevel: AutonomyLevel = agent.capabilityLevels[capability] ?? 0;
  const rbac = checkRbac(risk.requiredLevel, agentLevel, false);
  if (rbac.verdict !== "ALLOW") {
    const status = rbac.verdict === "BLOCK" ? "FAIL" : "HOLD";
    mark("G1_AUTONOMY", status, rbac.reason ?? "RBAC gate.", t);
    skipRest("G1_AUTONOMY", "Not reached — autonomy gate acted first.");
    return finish(rbac.verdict, "G1_AUTONOMY", [rbac.reason ?? "RBAC gate."], risk);
  }
  mark(
    "G1_AUTONOMY",
    "PASS",
    `Earned L${agentLevel} on ${capability} meets required L${risk.requiredLevel} (risk ${risk.score}).`,
    t
  );

  // ---- G2 Client wall ----------------------------------------------------
  t = nowMs();
  if (!wall.ok) {
    mark("G2_CLIENT_WALL", "FAIL", wall.violations.join(" "), t);
    skipRest("G2_CLIENT_WALL", "Not reached — client wall blocked the action.");
    return finish("BLOCK", "G2_CLIENT_WALL", wall.violations, risk, {
      trustDelta: -35,
      openTribunal: true,
      severity: "CRITICAL",
    });
  }
  mark(
    "G2_CLIENT_WALL",
    "PASS",
    `Recipient tenant verified; ${(action.attachments ?? []).length + (action.contextSources ?? []).length} source(s) checked.`,
    t
  );

  // ---- G3 DLP ------------------------------------------------------------
  t = nowMs();
  const hits = scanDlp(action.payloadText);
  if (hits.length > 0) {
    const severity = maxSeverity(hits) ?? "HIGH";
    const reasons = hits.map((h) => `${h.label} detected ("${h.match.slice(0, 40)}").`);
    mark("G3_DLP", "FAIL", reasons.join(" "), t);
    skipRest("G3_DLP", "Not reached — DLP blocked the payload.");
    return finish("BLOCK", "G3_DLP", reasons, risk, {
      trustDelta: DLP_DELTA[severity],
      openTribunal: severity === "CRITICAL",
      severity,
      redactions: hits.map((h) => ({ rule: h.rule, start: h.start, end: h.end })),
    });
  }
  mark("G3_DLP", "PASS", "No secrets, PII or confidential markers in the payload.", t);

  // ---- G3.5 Evidence-relative claim check (AvePoint R18, novelty N3) -----
  t = nowMs();
  if (action.sources && action.sources.length > 0) {
    const findings = checkClaims(action.payloadText, action.sources);
    if (findings.contradicted.length > 0) {
      const reasons = describeFindings(findings);
      mark("G3_CLAIMS", "FAIL", reasons.join(" "), t);
      skipRest("G3_CLAIMS", "Not reached — claims contradicted the evidence.");
      return finish("BLOCK", "G3_CLAIMS", reasons, risk, {
        trustDelta: -25,
        severity: "HIGH",
      });
    }
    if (findings.unsupported.length > 0) {
      const reasons = describeFindings(findings);
      mark("G3_CLAIMS", "HOLD", reasons.join(" "), t);
      skipRest("G3_CLAIMS", "Not reached — unsupported claims need the founder.");
      return finish("HOLD", "G3_CLAIMS", reasons, risk, {
        trustDelta: -5,
        severity: "LOW",
      });
    }
    mark("G3_CLAIMS", "PASS", `Every numeric claim matches the ${action.sources.length} supplied source(s).`, t);
  } else {
    mark("G3_CLAIMS", "SKIP", "No evidence pack supplied with the action.", t);
  }

  // ---- G4 Qwen judge (injected; only medium risk and above) ---------------
  t = nowMs();
  let g4: GuardResult["g4"];
  let mode: "LIVE" | "SCRIPTED" = "SCRIPTED";
  if (opts.judge && risk.score >= 5) {
    g4 = (await opts.judge(action, risk)) ?? undefined;
    if (g4) {
      mode = g4.mode;
      if (g4.verdict !== "PASS") {
        const severity: Severity = g4.verdict === "HIGH" ? "HIGH" : "LOW";
        mark("G4_JUDGE", "HOLD", g4.reasons.join(" "), t);
        skipRest("G4_JUDGE", "Not reached — the judge held the action.");
        return finish("HOLD", "G4_JUDGE", g4.reasons, risk, {
          trustDelta: severity === "HIGH" ? -15 : -5,
          severity,
          g4,
          mode,
        });
      }
      mark("G4_JUDGE", "PASS", "Semantic judge found no leak, unsupported claim or injection echo.", t);
    } else {
      mark("G4_JUDGE", "SKIP", "Judge unavailable (no key or timeout) — deterministic guards only.", t);
    }
  } else {
    mark(
      "G4_JUDGE",
      "SKIP",
      opts.judge ? `Risk ${risk.score} < 5 — judge not needed.` : "No judge configured (scripted mode).",
      t
    );
  }

  // ---- G6 Founder co-sign for risk >= 18 ----------------------------------
  t = nowMs();
  if (risk.founderCosign) {
    mark("G6_FOUNDER", "HOLD", "Risk >= 18: irreversible high-stakes action requires founder co-sign.", t);
    return finish(
      "HOLD",
      "G6_FOUNDER",
      ["Risk >= 18: irreversible high-stakes action requires founder co-sign."],
      risk,
      { g4, mode }
    );
  }
  mark("G6_FOUNDER", "SKIP", `Risk ${risk.score} < 18 — no co-sign needed.`, t);

  // ---- PASS ---------------------------------------------------------------
  return finish("ALLOW", "PASS", ["All deterministic guards passed."], risk, {
    trustDelta: 2,
    g4,
    mode,
  });
}
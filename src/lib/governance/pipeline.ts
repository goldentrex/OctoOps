// ============================================================================
// OctoGuard policy enforcement point (plan 3.1).
// Runs G0 -> G1 -> G2 -> G3 -> (G4 injected judge) -> G6, cheapest first,
// fail closed. Only G4 spends tokens, and only when G0-G3 pass and the
// action risk is medium or higher (score >= 5).
// ============================================================================

import { assessRisk } from "./risk";
import { checkClientWall } from "./detectors/clientWall";
import { scanDlp, maxSeverity } from "./detectors/dlp";
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

function nowMs(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

function result(
  partial: Omit<GuardResult, "latencyMs">,
  startedAt: number
): GuardResult {
  return {
    ...partial,
    latencyMs: Math.round((nowMs() - startedAt) * 100) / 100,
  };
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

  const base = {
    reasons: [] as string[],
    trustDelta: 0,
    openTribunal: false,
    mode: "SCRIPTED" as const,
    risk: undefined as unknown as RiskAssessment,
  };

  const finish = (
    verdict: GuardVerdict,
    stage: GuardStage,
    reasons: string[],
    risk: RiskAssessment,
    extra?: Partial<GuardResult>
  ): GuardResult =>
    result(
      {
        ...base,
        verdict,
        stage,
        reasons,
        risk,
        ...extra,
      },
      startedAt
    );

  // ---- G0 Identity -------------------------------------------------------
  const provisionalRisk = assessRisk(action);
  if (!agent.exists) {
    return finish("BLOCK", "G0_IDENTITY", [`Unknown agent "${action.agentId}".`], provisionalRisk);
  }
  if (agent.status === "FIRED") {
    return finish("BLOCK", "G0_IDENTITY", ["Agent clearance is REVOKED (terminated)."], provisionalRisk);
  }
  if (!agent.seatAssigned) {
    return finish("BLOCK", "G0_IDENTITY", ["Agent has no assigned seat."], provisionalRisk);
  }

  // ---- G2 resolution feeds risk (unknown recipient = new external) -------
  const wall = checkClientWall(action, registry);
  const risk = assessRisk(action, { recipientKnown: wall.recipientKnown });

  // ---- G1 Autonomy -------------------------------------------------------
  const agentLevel: AutonomyLevel = agent.capabilityLevels[capability] ?? 0;
  const rbac = checkRbac(risk.requiredLevel, agentLevel, false);
  if (rbac.verdict !== "ALLOW") {
    return finish(rbac.verdict, "G1_AUTONOMY", [rbac.reason ?? "RBAC gate."], risk);
  }

  // ---- G2 Client wall ----------------------------------------------------
  if (!wall.ok) {
    return finish("BLOCK", "G2_CLIENT_WALL", wall.violations, risk, {
      trustDelta: -35,
      openTribunal: true,
      severity: "CRITICAL",
    });
  }

  // ---- G3 DLP ------------------------------------------------------------
  const hits = scanDlp(action.payloadText);
  if (hits.length > 0) {
    const severity = maxSeverity(hits) ?? "HIGH";
    return finish(
      "BLOCK",
      "G3_DLP",
      hits.map((h) => `${h.label} detected ("${h.match.slice(0, 40)}").`),
      risk,
      {
        trustDelta: DLP_DELTA[severity],
        openTribunal: severity === "CRITICAL",
        severity,
        redactions: hits.map((h) => ({ rule: h.rule, start: h.start, end: h.end })),
      }
    );
  }

  // ---- G4 Qwen judge (injected; only medium risk and above) ---------------
  let g4: GuardResult["g4"];
  let mode: "LIVE" | "SCRIPTED" = "SCRIPTED";
  if (opts.judge && risk.score >= 5) {
    g4 = (await opts.judge(action, risk)) ?? undefined;
    if (g4) {
      mode = g4.mode;
      if (g4.verdict !== "PASS") {
        const severity: Severity = g4.verdict === "HIGH" ? "HIGH" : "LOW";
        return finish("HOLD", "G4_JUDGE", g4.reasons, risk, {
          trustDelta: severity === "HIGH" ? -15 : -5,
          severity,
          g4,
          mode,
        });
      }
    }
  }

  // ---- G6 Founder co-sign for risk >= 18 ----------------------------------
  if (risk.founderCosign) {
    return finish(
      "HOLD",
      "G6_FOUNDER",
      ["Risk >= 18: irreversible high-stakes action requires founder co-sign."],
      risk,
      { g4, mode }
    );
  }

  // ---- PASS ---------------------------------------------------------------
  return finish("ALLOW", "PASS", ["All deterministic guards passed."], risk, {
    trustDelta: 2,
    g4,
    mode,
  });
}
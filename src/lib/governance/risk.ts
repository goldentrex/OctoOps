// ============================================================================
// Action risk = audience x reversibility x data sensitivity (plan 3.2)
// Bands: 1-4 -> L1, 5-9 -> L2, 10-17 -> L3, 18+ -> L4 + founder co-sign.
// ============================================================================

import type {
  Audience,
  AutonomyLevel,
  GuardAction,
  Reversibility,
  RiskAssessment,
  Sensitivity,
} from "./types";

const AUDIENCE_WEIGHT: Record<Audience, number> = {
  internal: 1,
  known_client: 2,
  new_external: 3,
};

const REVERSIBILITY_WEIGHT: Record<Reversibility, number> = {
  undoable: 1,
  hard: 2,
  impossible: 3,
};

const SENSITIVITY_WEIGHT: Record<Sensitivity, number> = {
  public: 1,
  client: 2,
  regulated: 3,
};

export function riskScore(
  audience: Audience,
  reversibility: Reversibility,
  sensitivity: Sensitivity
): number {
  return (
    AUDIENCE_WEIGHT[audience] *
    REVERSIBILITY_WEIGHT[reversibility] *
    SENSITIVITY_WEIGHT[sensitivity]
  );
}

export function requiredLevelForScore(score: number): AutonomyLevel {
  if (score <= 4) return 1;
  if (score <= 9) return 2;
  if (score <= 17) return 3;
  return 4;
}

/** Defaults per action type; explicit action fields always win. */
export function assessRisk(
  action: GuardAction,
  opts?: { recipientKnown?: boolean }
): RiskAssessment {
  let audience: Audience;
  let reversibility: Reversibility;
  let sensitivity: Sensitivity;

  switch (action.actionType) {
    case "SEND_DIRECT_EMAIL":
      audience = opts?.recipientKnown === false ? "new_external" : "known_client";
      reversibility = "impossible";
      sensitivity = "client";
      break;
    case "PUBLISH_ARTICLE":
      audience = "new_external";
      reversibility = "hard";
      sensitivity = "public";
      break;
    case "UPDATE_LEAD":
    default:
      audience = "internal";
      reversibility = "undoable";
      sensitivity = "client";
      break;
  }

  audience = action.audience ?? audience;
  reversibility = action.reversibility ?? reversibility;
  sensitivity = action.sensitivity ?? sensitivity;

  const score = riskScore(audience, reversibility, sensitivity);
  return {
    audience,
    reversibility,
    sensitivity,
    score,
    requiredLevel: requiredLevelForScore(score),
    founderCosign: score >= 18,
  };
}
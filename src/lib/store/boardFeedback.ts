// ============================================================================
// Octo-Board believability feedback (P1-4): the board gets better at judging.
// Each judge's weight is learned from founder corrections — when the founder
// agrees with or overrides a board outcome, every judge whose vote matched the
// endorsed outcome gains accuracy, the others lose it. Weights re-weight future
// deliberations (Bridgewater-style believability). CISO keeps a promotion veto.
// ============================================================================

import type { BoardReviewCase } from "../../types/octo";

export type JudgeId = "ciso" | "cfo" | "vp";
export type Vote = "PROMOTE" | "PROBATION" | "WRITE_UP" | "FIRE";

export interface JudgeStat {
  agree: number;
  disagree: number;
}
export type JudgeStats = Record<JudgeId, JudgeStat>;

/** Domain priors (CISO security mandate weighted highest at cold start). */
const BASE: Record<JudgeId, number> = { ciso: 1.2, cfo: 1.0, vp: 0.9 };
const SEVERITY_ORDER: Vote[] = ["PROMOTE", "PROBATION", "WRITE_UP", "FIRE"];

export const JUDGE_META: Record<JudgeId, { name: string; title: string }> = {
  ciso: { name: "Cassandra", title: "CISO · security veto" },
  cfo: { name: "Reginald", title: "CFO · cost & exposure" },
  vp: { name: "Pulse", title: "Growth VP · Hashmeta impact" },
};

export function emptyJudgeStats(): JudgeStats {
  return {
    ciso: { agree: 0, disagree: 0 },
    cfo: { agree: 0, disagree: 0 },
    vp: { agree: 0, disagree: 0 },
  };
}

/** Accuracy with a sceptical 0.5 prior so cold-start weights equal the base. */
export function judgeAccuracy(s: JudgeStat): number {
  const n = s.agree + s.disagree;
  return n === 0 ? 0.5 : s.agree / n;
}

/** weight = base × (0.5 + accuracy): 50%→base, 100%→1.5×base, 0%→0.5×base. */
export function learnedWeights(stats: JudgeStats): Record<JudgeId, number> {
  return {
    ciso: BASE.ciso * (0.5 + judgeAccuracy(stats.ciso)),
    cfo: BASE.cfo * (0.5 + judgeAccuracy(stats.cfo)),
    vp: BASE.vp * (0.5 + judgeAccuracy(stats.vp)),
  };
}

export function weightedDecision(votes: Record<JudgeId, Vote>, weights: Record<JudgeId, number>): Vote {
  const tally = new Map<Vote, number>();
  for (const j of ["ciso", "cfo", "vp"] as const) {
    tally.set(votes[j], (tally.get(votes[j]) ?? 0) + weights[j]);
  }
  let best: Vote = "PROBATION";
  let bestWeight = -1;
  for (const option of SEVERITY_ORDER) {
    const w = tally.get(option) ?? 0;
    if (w >= bestWeight) {
      // ties resolve to the more conservative option
      bestWeight = w;
      best = option;
    }
  }
  return best;
}

export function applyCisoVeto(decision: Vote, votes: Record<JudgeId, Vote>, reviewType: BoardReviewCase["reviewType"]): Vote {
  if (reviewType === "PROMOTION_HEARING" && decision === "PROMOTE" && votes.ciso !== "PROMOTE") {
    return "PROBATION";
  }
  return decision;
}

/** Map a board case's recommended status back to the vote it implies. */
export function voteFromStatus(status: string): Vote {
  if (status === "PROMOTED") return "PROMOTE";
  if (status === "FIRED") return "FIRE";
  if (status === "WRITE_UP" || status === "BOARD_REVIEW") return "WRITE_UP";
  return "PROBATION";
}

/**
 * Record founder feedback. `endorsed` is the outcome the founder stands behind
 * (the board's outcome if they agree, or their override). Each judge whose vote
 * matches `endorsed` is accurate; the rest are not.
 */
export function recordFeedback(stats: JudgeStats, votes: Record<JudgeId, Vote>, endorsed: Vote): JudgeStats {
  const next: JudgeStats = {
    ciso: { ...stats.ciso },
    cfo: { ...stats.cfo },
    vp: { ...stats.vp },
  };
  for (const j of ["ciso", "cfo", "vp"] as const) {
    if (votes[j] === endorsed) next[j].agree += 1;
    else next[j].disagree += 1;
  }
  return next;
}
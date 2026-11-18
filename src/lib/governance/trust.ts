// ============================================================================
// Beta reputation trust model (Jøsang & Ismail 2002) — plan 3.3.
// State: Beta(alpha, beta) per agent per capability.
//  - Probation prior alpha=1, beta=3 (sceptical).
//  - Clean action: alpha += risk weight (higher-risk clean work earns more).
//  - Violation: beta += severity (LOW 1, HIGH 5, CRITICAL 15);
//    near-miss caught by G4 counts half, human-caught leak counts double.
//  - Decay toward the prior with a 14-day half-life.
//  - Displayed trust = lower bound of the 90% credible interval x 100.
// ============================================================================

import { betaQuantile } from "./beta";
import type { Severity } from "./types";

export const TRUST_PRIOR = { alpha: 1, beta: 3 } as const;
export const HALF_LIFE_MS = 14 * 24 * 60 * 60 * 1000;

export const SEVERITY_WEIGHT: Record<Severity, number> = {
  LOW: 1,
  HIGH: 5,
  CRITICAL: 15,
};

export type CaughtBy = "guard" | "near_miss" | "human";

const CAUGHT_BY_MULTIPLIER: Record<CaughtBy, number> = {
  guard: 1,
  near_miss: 0.5,
  human: 2,
};

export interface TrustEvidence {
  id: string;
  timestamp: number;
  kind: "clean" | "violation" | "appeal";
  note: string;
  alphaDelta: number;
  betaDelta: number;
  severity?: Severity;
  caughtBy?: CaughtBy;
}

export interface TrustState {
  capability: string;
  alpha: number;
  beta: number;
  cleanCount: number;
  updatedAt: number;
  evidence: TrustEvidence[];
}

const MAX_EVIDENCE = 50;
let evidenceCounter = 0;

export function createTrustState(capability: string, now: number): TrustState {
  return {
    capability,
    alpha: TRUST_PRIOR.alpha,
    beta: TRUST_PRIOR.beta,
    cleanCount: 0,
    updatedAt: now,
    evidence: [],
  };
}

/** Shrink both parameters toward the prior with a 14-day half-life. */
export function decayTrust(state: TrustState, now: number): TrustState {
  const elapsed = now - state.updatedAt;
  if (elapsed <= 0) return state;
  const factor = Math.pow(0.5, elapsed / HALF_LIFE_MS);
  return {
    ...state,
    alpha: TRUST_PRIOR.alpha + (state.alpha - TRUST_PRIOR.alpha) * factor,
    beta: TRUST_PRIOR.beta + (state.beta - TRUST_PRIOR.beta) * factor,
    updatedAt: now,
  };
}

function pushEvidence(state: TrustState, item: TrustEvidence): void {
  state.evidence.push(item);
  if (state.evidence.length > MAX_EVIDENCE) {
    state.evidence.splice(0, state.evidence.length - MAX_EVIDENCE);
  }
}

/** Record a clean action. Mutates state (decayed to `now` first). */
export function recordClean(
  state: TrustState,
  riskWeight: number,
  now: number,
  note = "Clean action"
): TrustState {
  const decayed = decayTrust(state, now);
  Object.assign(state, decayed);
  const weight = Math.max(0.5, riskWeight);
  state.alpha += weight;
  state.cleanCount += 1;
  state.updatedAt = now;
  pushEvidence(state, {
    id: `ev-${++evidenceCounter}`,
    timestamp: now,
    kind: "clean",
    note,
    alphaDelta: weight,
    betaDelta: 0,
  });
  return state;
}

/** Record a violation. Trust is slow to earn, fast to lose. */
export function recordViolation(
  state: TrustState,
  severity: Severity,
  caughtBy: CaughtBy,
  now: number,
  note = "Policy violation"
): TrustState {
  const decayed = decayTrust(state, now);
  Object.assign(state, decayed);
  const delta = SEVERITY_WEIGHT[severity] * CAUGHT_BY_MULTIPLIER[caughtBy];
  state.beta += delta;
  state.updatedAt = now;
  pushEvidence(state, {
    id: `ev-${++evidenceCounter}`,
    timestamp: now,
    kind: "violation",
    note,
    alphaDelta: 0,
    betaDelta: delta,
    severity,
    caughtBy,
  });
  return state;
}

/**
 * Reverse a violation penalty after a successful appeal (procedural fairness).
 * The reversal is itself evidence — auditable, never silent. Beta floors at the prior.
 */
export function reverseViolation(
  state: TrustState,
  betaDelta: number,
  now: number,
  note = "Appeal overturned"
): TrustState {
  const decayed = decayTrust(state, now);
  Object.assign(state, decayed);
  const reversed = Math.min(betaDelta, state.beta - TRUST_PRIOR.beta);
  state.beta -= reversed;
  state.updatedAt = now;
  pushEvidence(state, {
    id: `ev-${++evidenceCounter}`,
    timestamp: now,
    kind: "appeal",
    note,
    alphaDelta: 0,
    betaDelta: -reversed,
  });
  return state;
}

/** Displayed trust = lower bound of the 90% credible interval x 100. */
export function trustScore(state: TrustState, now: number): number {
  const s = decayTrust(state, now);
  const lower = betaQuantile(0.05, s.alpha, s.beta);
  return Math.round(lower * 100);
}

export interface TrustExplanation {
  capability: string;
  score: number;
  alpha: number;
  beta: number;
  mean: number;
  interval90: { lower: number; upper: number };
  cleanCount: number;
  lastEvidence: TrustEvidence[];
}

/** The "why" behind a score: last 5 evidence items and their deltas. */
export function explain(state: TrustState, now: number): TrustExplanation {
  const s = decayTrust(state, now);
  return {
    capability: state.capability,
    score: trustScore(state, now),
    alpha: s.alpha,
    beta: s.beta,
    mean: s.alpha / (s.alpha + s.beta),
    interval90: {
      lower: betaQuantile(0.05, s.alpha, s.beta),
      upper: betaQuantile(0.95, s.alpha, s.beta),
    },
    cleanCount: state.cleanCount,
    lastEvidence: state.evidence.slice(-5),
  };
}
// ============================================================================
// Autonomy ladder L0-L4 per capability (plan 3.4).
// Entry gates, instant demotion (circuit breaker), 10-point hysteresis,
// monthly error budget (SRE), three-write-ups-in-30-days tribunal rule.
// ============================================================================

import {
  createTrustState,
  recordClean,
  recordViolation,
  trustScore,
  SEVERITY_WEIGHT,
  type CaughtBy,
  type TrustState,
} from "./trust";
import type { AutonomyLevel, Severity } from "./types";

// Gates tuned from the calibration harness (evals/calibration.ts): with the
// original 75/90 gates, 90%-clean agents reached L3 through lucky HIGH-free
// windows (9/24 false promotions). Autonomy demands ≥~95% demonstrated
// reliability plus a sustained violation-free streak measured in ACTIONS
// (fair across task volumes), not only calendar days.
export const GATE_TRUST: Record<2 | 3 | 4, number> = { 2: 55, 3: 93, 4: 97 };
export const GATE_CLEAN_SINCE_HIGH: Record<3 | 4, number> = { 3: 40, 4: 90 };
export const HYSTERESIS = 10;
export const ERROR_BUDGET_LIMIT = 15; // severity-weighted points / seat / month
export const WRITE_UP_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
export const HIGH_FREE_WINDOW_MS: Record<3 | 4, number> = {
  3: 14 * 24 * 60 * 60 * 1000,
  4: 30 * 24 * 60 * 60 * 1000,
};

/** Shared per seat: the store passes the same object to every capability. */
export interface ErrorBudget {
  month: string;
  used: number;
  limit: number;
}

export interface CapabilityRecord {
  capability: string;
  level: AutonomyLevel;
  trust: TrustState;
  cleanTotal: number;
  cleanDrafts: number;
  /** timestamps of HIGH / CRITICAL violations */
  highEvents: number[];
  /** clean actions since the last HIGH/CRITICAL (action-count streak) */
  cleanSinceHigh: number;
  /** timestamps of formal write-ups */
  writeUps: number[];
  errorBudget: ErrorBudget;
  frozen: boolean;
}

export function monthKey(now: number): string {
  const d = new Date(now);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function createErrorBudget(now: number): ErrorBudget {
  return { month: monthKey(now), used: 0, limit: ERROR_BUDGET_LIMIT };
}

export function createCapabilityRecord(
  capability: string,
  now: number,
  level: AutonomyLevel = 1,
  errorBudget?: ErrorBudget
): CapabilityRecord {
  return {
    capability,
    level,
    trust: createTrustState(capability, now),
    cleanTotal: 0,
    cleanDrafts: 0,
    highEvents: [],
    cleanSinceHigh: 0,
    writeUps: [],
    errorBudget: errorBudget ?? createErrorBudget(now),
    frozen: false,
  };
}

function rollBudget(budget: ErrorBudget, now: number): void {
  const month = monthKey(now);
  if (budget.month !== month) {
    budget.month = month;
    budget.used = 0;
  }
}

export function applyClean(
  rec: CapabilityRecord,
  riskWeight: number,
  now: number,
  opts?: { approvedDraft?: boolean; note?: string }
): void {
  recordClean(rec.trust, riskWeight, now, opts?.note);
  rec.cleanTotal += 1;
  rec.cleanSinceHigh += 1;
  if (opts?.approvedDraft || rec.level <= 1) rec.cleanDrafts += 1;
}

export interface ViolationOutcome {
  demotedTo: AutonomyLevel;
  openTribunal: boolean;
  budgetExhausted: boolean;
  writeUpCount30d: number;
}

/** Instant demotion: HIGH drops one level, CRITICAL drops to L1 + tribunal. */
export function applyViolation(
  rec: CapabilityRecord,
  severity: Severity,
  caughtBy: CaughtBy,
  now: number,
  note?: string
): ViolationOutcome {
  recordViolation(rec.trust, severity, caughtBy, now, note);

  if (severity !== "LOW") {
    rec.writeUps.push(now);
    rec.highEvents.push(now);
    rec.cleanSinceHigh = 0;
    if (severity === "HIGH") {
      rec.level = Math.max(1, rec.level - 1) as AutonomyLevel;
    } else {
      rec.level = 1;
    }
  }

  rollBudget(rec.errorBudget, now);
  rec.errorBudget.used += SEVERITY_WEIGHT[severity];
  const budgetExhausted = rec.errorBudget.used >= rec.errorBudget.limit;
  if (budgetExhausted) {
    rec.frozen = true;
    rec.level = 1;
  }

  const writeUpCount30d = rec.writeUps.filter(
    (t) => now - t <= WRITE_UP_WINDOW_MS
  ).length;

  return {
    demotedTo: rec.level,
    openTribunal: severity === "CRITICAL" || writeUpCount30d >= 3,
    budgetExhausted,
    writeUpCount30d,
  };
}

/**
 * Trust-floor demotion with 10-point hysteresis: an agent only drops a level
 * when its displayed trust falls below (entry gate - 10), stopping flapping.
 */
export function checkTrustFloor(rec: CapabilityRecord, now: number): boolean {
  if (rec.level < 2) return false;
  const gate = GATE_TRUST[rec.level as 2 | 3 | 4];
  if (trustScore(rec.trust, now) < gate - HYSTERESIS) {
    rec.level = (rec.level - 1) as AutonomyLevel;
    return true;
  }
  return false;
}

export interface PromotionGateResult {
  eligible: boolean;
  targetLevel: AutonomyLevel;
  reasons: string[];
}

/** Check the gate for the NEXT level. Board vote is required for L3 / L4. */
export function checkPromotionGate(
  rec: CapabilityRecord,
  now: number,
  opts?: { boardApproved?: boolean; cisoVeto?: boolean }
): PromotionGateResult {
  const target = Math.min(4, rec.level + 1) as AutonomyLevel;
  const reasons: string[] = [];

  if (rec.frozen) reasons.push("Error budget exhausted: seat frozen to L1.");
  if (rec.level >= 4) reasons.push("Already at L4.");
  if (target < 2) reasons.push("L1 is granted at hire.");

  const score = trustScore(rec.trust, now);
  const gate = GATE_TRUST[target as 2 | 3 | 4];
  if (score < gate) reasons.push(`Trust ${score} < gate ${gate}.`);

  if (target === 2 && rec.cleanDrafts < 10) {
    reasons.push(`Clean approved drafts ${rec.cleanDrafts} < 10.`);
  }
  if (target === 3) {
    if (rec.cleanTotal < 25) reasons.push(`Clean actions ${rec.cleanTotal} < 25.`);
    if (rec.cleanSinceHigh < GATE_CLEAN_SINCE_HIGH[3]) {
      reasons.push(`Only ${rec.cleanSinceHigh} clean actions since last HIGH (need ${GATE_CLEAN_SINCE_HIGH[3]}).`);
    }
    if (hasHighWithin(rec, HIGH_FREE_WINDOW_MS[3], now)) {
      reasons.push("HIGH violation within the last 14 days.");
    }
    if (!opts?.boardApproved) reasons.push("Board vote required for L3.");
  }
  if (target === 4) {
    if (rec.cleanTotal < 100) reasons.push(`Clean actions ${rec.cleanTotal} < 100.`);
    if (rec.cleanSinceHigh < GATE_CLEAN_SINCE_HIGH[4]) {
      reasons.push(`Only ${rec.cleanSinceHigh} clean actions since last HIGH (need ${GATE_CLEAN_SINCE_HIGH[4]}).`);
    }
    if (hasHighWithin(rec, HIGH_FREE_WINDOW_MS[4], now)) {
      reasons.push("HIGH violation within the last 30 days.");
    }
    if (!opts?.boardApproved) reasons.push("Board vote required for L4.");
    if (opts?.cisoVeto) reasons.push("CISO veto on external-send promotion.");
  }

  return { eligible: reasons.length === 0, targetLevel: target, reasons };
}

function hasHighWithin(
  rec: CapabilityRecord,
  windowMs: number,
  now: number
): boolean {
  return rec.highEvents.some((t) => now - t <= windowMs);
}

/** Apply a board-approved promotion if the gate passes. */
export function tryPromote(
  rec: CapabilityRecord,
  now: number,
  opts: { boardApproved: boolean; cisoVeto?: boolean }
): PromotionGateResult {
  const gate = checkPromotionGate(rec, now, opts);
  if (gate.eligible) {
    rec.level = gate.targetLevel;
    rec.frozen = false;
  }
  return gate;
}
import { describe, expect, it } from "vitest";
import {
  applyClean,
  applyViolation,
  checkPromotionGate,
  checkTrustFloor,
  createCapabilityRecord,
  createErrorBudget,
  tryPromote,
  GATE_TRUST,
  HYSTERESIS,
} from "../ladder";
import { trustScore } from "../trust";

const T0 = 1_700_000_000_000;
const DAY = 24 * 60 * 60 * 1000;

function cleanRecord(n: number, weight = 4, now = T0) {
  const rec = createCapabilityRecord("crm.send_external", now);
  for (let i = 0; i < n; i++) applyClean(rec, weight, now);
  return rec;
}

describe("autonomy ladder", () => {
  it("hires at L1 draft-only", () => {
    const rec = createCapabilityRecord("crm.send_external", T0);
    expect(rec.level).toBe(1);
  });

  it("L2 gate needs trust >= 55 and 10 clean drafts", () => {
    const rec = cleanRecord(9);
    const gate = checkPromotionGate(rec, T0);
    expect(gate.eligible).toBe(false);
    expect(gate.reasons.join(" ")).toContain("drafts");
    applyClean(rec, 4, T0);
    expect(checkPromotionGate(rec, T0).eligible).toBe(true);
  });

  it("L2 promotion does not need a board vote", () => {
    const rec = cleanRecord(10);
    const res = tryPromote(rec, T0, { boardApproved: false });
    expect(res.eligible).toBe(true);
    expect(rec.level).toBe(2);
  });

  it("L3 gate needs 25 clean, trust >= 93, a 40-action HIGH-free streak and a board vote", () => {
    const rec = cleanRecord(45, 12);
    tryPromote(rec, T0, { boardApproved: false }); // -> L2
    const noBoard = checkPromotionGate(rec, T0);
    expect(noBoard.eligible).toBe(false);
    expect(noBoard.reasons.join(" ")).toContain("Board vote");
    const withBoard = tryPromote(rec, T0, { boardApproved: true });
    expect(withBoard.eligible).toBe(true);
    expect(rec.level).toBe(3);
  });

  it("L3 gate blocks if a HIGH violation happened within 14 days", () => {
    const rec = cleanRecord(25, 12);
    tryPromote(rec, T0, { boardApproved: false });
    applyViolation(rec, "HIGH", "guard", T0); // drops back to L1
    for (let i = 0; i < 30; i++) applyClean(rec, 12, T0 + DAY);
    tryPromote(rec, T0 + DAY, { boardApproved: false }); // earn L2 back
    expect(rec.level).toBe(2);
    const gate = checkPromotionGate(rec, T0 + DAY, { boardApproved: true });
    expect(gate.eligible).toBe(false);
    expect(gate.reasons.join(" ")).toContain("14 days");
  });

  it("L4 gate needs 100 clean, trust >= 97, board vote and no CISO veto", () => {
    const rec = cleanRecord(100, 12);
    tryPromote(rec, T0, { boardApproved: false });
    tryPromote(rec, T0, { boardApproved: true });
    expect(rec.level).toBe(3);
    const vetoed = checkPromotionGate(rec, T0, { boardApproved: true, cisoVeto: true });
    expect(vetoed.eligible).toBe(false);
    expect(vetoed.reasons.join(" ")).toContain("CISO veto");
    const ok = tryPromote(rec, T0, { boardApproved: true, cisoVeto: false });
    expect(ok.eligible).toBe(true);
    expect(rec.level).toBe(4);
  });

  it("HIGH violation instantly drops one level (circuit breaker)", () => {
    const rec = cleanRecord(45, 12);
    tryPromote(rec, T0, { boardApproved: false });
    tryPromote(rec, T0, { boardApproved: true });
    expect(rec.level).toBe(3);
    const out = applyViolation(rec, "HIGH", "guard", T0);
    expect(out.demotedTo).toBe(2);
    expect(out.openTribunal).toBe(false);
  });

  it("CRITICAL violation drops to L1 and opens a tribunal", () => {
    const rec = cleanRecord(45, 12);
    tryPromote(rec, T0, { boardApproved: false });
    tryPromote(rec, T0, { boardApproved: true });
    const out = applyViolation(rec, "CRITICAL", "guard", T0);
    expect(out.demotedTo).toBe(1);
    expect(out.openTribunal).toBe(true);
  });

  it("LOW violation does not demote", () => {
    const rec = cleanRecord(45, 12);
    tryPromote(rec, T0, { boardApproved: false });
    tryPromote(rec, T0, { boardApproved: true });
    const out = applyViolation(rec, "LOW", "guard", T0);
    expect(out.demotedTo).toBe(3);
    expect(out.openTribunal).toBe(false);
  });

  it("three write-ups in 30 days open a tribunal", () => {
    const rec = cleanRecord(60, 12);
    expect(applyViolation(rec, "HIGH", "guard", T0).openTribunal).toBe(false);
    expect(applyViolation(rec, "HIGH", "guard", T0 + DAY).openTribunal).toBe(false);
    expect(applyViolation(rec, "HIGH", "guard", T0 + 2 * DAY).openTribunal).toBe(true);
  });

  it("write-ups older than 30 days do not count", () => {
    const rec = cleanRecord(60, 12);
    applyViolation(rec, "HIGH", "guard", T0);
    applyViolation(rec, "HIGH", "guard", T0 + DAY);
    const out = applyViolation(rec, "HIGH", "guard", T0 + 40 * DAY);
    expect(out.writeUpCount30d).toBe(1);
    expect(out.openTribunal).toBe(false);
  });

  it("error budget exhaustion freezes the seat to L1", () => {
    const rec = cleanRecord(100, 12);
    tryPromote(rec, T0, { boardApproved: false });
    tryPromote(rec, T0, { boardApproved: true });
    const out = applyViolation(rec, "CRITICAL", "guard", T0); // 15 points
    expect(out.budgetExhausted).toBe(true);
    expect(rec.frozen).toBe(true);
    expect(rec.level).toBe(1);
    expect(checkPromotionGate(rec, T0).reasons.join(" ")).toContain("frozen");
  });

  it("error budget resets on a new month", () => {
    const budget = createErrorBudget(T0);
    const rec = createCapabilityRecord("a", T0, 1, budget);
    applyViolation(rec, "HIGH", "guard", T0); // 5 used
    const nextMonth = T0 + 40 * DAY;
    const out = applyViolation(rec, "LOW", "guard", nextMonth);
    expect(out.budgetExhausted).toBe(false);
    expect(rec.errorBudget.used).toBe(1);
  });

  it("hysteresis: no flapping just below the entry gate", () => {
    const rec = createCapabilityRecord("a", T0, 2);
    rec.trust.alpha = 8;
    rec.trust.beta = 3;
    const score = trustScore(rec.trust, T0);
    expect(score).toBeLessThan(GATE_TRUST[2]);
    expect(score).toBeGreaterThanOrEqual(GATE_TRUST[2] - HYSTERESIS);
    expect(checkTrustFloor(rec, T0)).toBe(false);
    expect(rec.level).toBe(2);
  });

  it("trust floor: demotes when trust falls below gate - 10", () => {
    const rec = createCapabilityRecord("a", T0, 2);
    rec.trust.alpha = 5;
    rec.trust.beta = 3;
    expect(trustScore(rec.trust, T0)).toBeLessThan(GATE_TRUST[2] - HYSTERESIS);
    expect(checkTrustFloor(rec, T0)).toBe(true);
    expect(rec.level).toBe(1);
  });

  it("shared seat budget is consumed across capabilities", () => {
    const budget = createErrorBudget(T0);
    const a = createCapabilityRecord("crm.send_external", T0, 1, budget);
    const b = createCapabilityRecord("cms.publish", T0, 1, budget);
    applyViolation(a, "HIGH", "guard", T0); // 5
    applyViolation(b, "HIGH", "guard", T0); // 10
    const out = applyViolation(a, "HIGH", "guard", T0); // 15
    expect(out.budgetExhausted).toBe(true);
    expect(b.errorBudget.used).toBe(15);
  });
});
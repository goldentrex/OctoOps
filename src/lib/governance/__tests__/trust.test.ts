import { describe, expect, it } from "vitest";
import {
  createTrustState,
  decayTrust,
  explain,
  recordClean,
  recordViolation,
  trustScore,
  HALF_LIFE_MS,
  TRUST_PRIOR,
} from "../trust";

const T0 = 1_700_000_000_000;

describe("beta reputation trust", () => {
  it("starts at the sceptical probation prior (score ~2, not 25)", () => {
    const s = createTrustState("crm.send_external", T0);
    expect(s.alpha).toBe(1);
    expect(s.beta).toBe(3);
    expect(trustScore(s, T0)).toBeLessThan(5);
  });

  it("clean actions monotonically increase the score", () => {
    const s = createTrustState("crm.update_lead", T0);
    const first = trustScore(s, T0);
    let prev = first;
    for (let i = 0; i < 20; i++) {
      recordClean(s, 2, T0 + i * 1000);
      const next = trustScore(s, T0 + i * 1000);
      expect(next).toBeGreaterThanOrEqual(prev);
      prev = next;
    }
    expect(prev).toBeGreaterThan(first);
  });

  it("10 clean actions score lower than 200 (uncertainty is not trust)", () => {
    const ten = createTrustState("crm.update_lead", T0);
    const twoHundred = createTrustState("crm.update_lead", T0);
    for (let i = 0; i < 10; i++) recordClean(ten, 2, T0);
    for (let i = 0; i < 200; i++) recordClean(twoHundred, 2, T0);
    expect(trustScore(ten, T0)).toBeLessThan(trustScore(twoHundred, T0));
    expect(trustScore(twoHundred, T0)).toBeGreaterThan(90);
  });

  it("higher-risk clean work earns more than low-risk work", () => {
    const low = createTrustState("a", T0);
    const high = createTrustState("b", T0);
    recordClean(low, 2, T0);
    recordClean(high, 12, T0);
    expect(trustScore(high, T0)).toBeGreaterThan(trustScore(low, T0));
  });

  it("violations drop the score fast (CRITICAL >> LOW)", () => {
    const base = createTrustState("a", T0);
    for (let i = 0; i < 30; i++) recordClean(base, 4, T0);
    const before = trustScore(base, T0);

    const low = { ...base, evidence: [...base.evidence] };
    recordViolation(low, "LOW", "guard", T0);
    const critical = { ...base, evidence: [...base.evidence] };
    recordViolation(critical, "CRITICAL", "guard", T0);

    expect(trustScore(low, T0)).toBeLessThan(before);
    expect(trustScore(critical, T0)).toBeLessThan(trustScore(low, T0));
    expect(critical.beta - base.beta).toBe(15);
    expect(low.beta - base.beta).toBe(1);
  });

  it("near-miss caught by G4 counts half, human-caught leak counts double", () => {
    const s = createTrustState("a", T0);
    recordViolation(s, "HIGH", "near_miss", T0);
    expect(s.beta - TRUST_PRIOR.beta).toBe(2.5);
    recordViolation(s, "HIGH", "human", T0);
    expect(s.beta - TRUST_PRIOR.beta).toBe(12.5);
  });

  it("decays toward the prior with a 14-day half-life", () => {
    const s = createTrustState("a", T0);
    recordClean(s, 10, T0); // alpha 11, beta 3
    const decayed = decayTrust(s, T0 + HALF_LIFE_MS);
    expect(decayed.alpha).toBeCloseTo(1 + 10 * 0.5, 6);
    expect(decayed.beta).toBeCloseTo(3, 6);
  });

  it("old glory fades: score after 10 half-lives is near the prior", () => {
    const s = createTrustState("a", T0);
    for (let i = 0; i < 100; i++) recordClean(s, 5, T0);
    expect(trustScore(s, T0)).toBeGreaterThan(90);
    expect(trustScore(s, T0 + 10 * HALF_LIFE_MS)).toBeLessThan(20);
  });

  it("old sins fade too", () => {
    const s = createTrustState("a", T0);
    recordViolation(s, "CRITICAL", "guard", T0);
    const fresh = trustScore(s, T0);
    const later = trustScore(s, T0 + 4 * HALF_LIFE_MS);
    expect(later).toBeGreaterThan(fresh);
  });

  it("decay never moves parameters past the prior", () => {
    const s = createTrustState("a", T0);
    recordViolation(s, "HIGH", "guard", T0);
    const decayed = decayTrust(s, T0 + 100 * HALF_LIFE_MS);
    expect(decayed.beta).toBeGreaterThanOrEqual(TRUST_PRIOR.beta);
    expect(decayed.alpha).toBeGreaterThanOrEqual(TRUST_PRIOR.alpha);
  });

  it("explain() exposes the last 5 evidence items with deltas", () => {
    const s = createTrustState("crm.send_external", T0);
    for (let i = 0; i < 8; i++) recordClean(s, 3, T0 + i, `clean #${i}`);
    recordViolation(s, "LOW", "guard", T0 + 9, "late typo");
    const ex = explain(s, T0 + 10);
    expect(ex.lastEvidence).toHaveLength(5);
    expect(ex.lastEvidence[4].kind).toBe("violation");
    expect(ex.lastEvidence[4].betaDelta).toBe(1);
    expect(ex.interval90.lower).toBeLessThan(ex.mean);
    expect(ex.interval90.upper).toBeGreaterThan(ex.mean);
    expect(ex.score).toBe(Math.round(ex.interval90.lower * 100));
  });

  it("score stays within 0..100", () => {
    const s = createTrustState("a", T0);
    for (let i = 0; i < 500; i++) recordClean(s, 27, T0);
    expect(trustScore(s, T0)).toBeLessThanOrEqual(100);
    for (let i = 0; i < 50; i++) recordViolation(s, "CRITICAL", "human", T0);
    expect(trustScore(s, T0)).toBeGreaterThanOrEqual(0);
  });
});
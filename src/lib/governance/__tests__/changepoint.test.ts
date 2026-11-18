import { describe, expect, it } from "vitest";
import { createChangepointState, updateChangepoint } from "../changepoint";

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Run a stream of Bernoulli outcomes; return detection indices + directions. */
function runStream(ps: number[], seed = 42) {
  const r = rng(seed);
  const state = createChangepointState();
  const detections: { at: number; direction: string; confidence: number }[] = [];
  ps.forEach((p, i) => {
    const clean = r() < p;
    const res = updateChangepoint(state, clean);
    if (res.changepoint) detections.push({ at: i, direction: res.direction, confidence: res.confidence });
  });
  return detections;
}

describe("BOCPD changepoint detection", () => {
  it("detects a good→bad shift within a few actions", () => {
    // 120 clean-ish (0.98) then suddenly bad (0.5)
    const ps = [...Array(120).fill(0.98), ...Array(60).fill(0.5)];
    const d = runStream(ps);
    const afterShift = d.filter((x) => x.at >= 120);
    expect(afterShift.length).toBeGreaterThan(0);
    const latency = afterShift[0].at - 120;
    expect(latency).toBeLessThan(15); // detects within ~15 actions, not weeks
    expect(afterShift[0].direction).toBe("worsening");
  });

  it("does NOT false-alarm on a stationary good agent", () => {
    const ps = Array(300).fill(0.98);
    const d = runStream(ps, 7);
    expect(d.length).toBe(0);
  });

  it("does NOT flag a stationary bad agent as 'changed' (it's just bad)", () => {
    const ps = Array(300).fill(0.7);
    const d = runStream(ps, 11);
    // a consistently bad agent has no changepoint after warm-up
    const afterWarmup = d.filter((x) => x.at > 30);
    expect(afterWarmup.length).toBe(0);
  });

  it("detects improvement (bad→good) as improving, not worsening", () => {
    const ps = [...Array(120).fill(0.6), ...Array(60).fill(0.99)];
    const d = runStream(ps, 3);
    const afterShift = d.filter((x) => x.at >= 120);
    expect(afterShift.length).toBeGreaterThan(0);
    expect(afterShift[0].direction).toBe("improving");
  });

  it("is robust across seeds for the good→bad case", () => {
    let detected = 0;
    for (let seed = 1; seed <= 10; seed++) {
      const ps = [...Array(120).fill(0.97), ...Array(60).fill(0.5)];
      const d = runStream(ps, seed).filter((x) => x.at >= 120);
      if (d.length > 0 && d[0].at - 120 < 20) detected++;
    }
    expect(detected).toBeGreaterThanOrEqual(8);
  });

  it("keeps a bounded footprint (fixed window)", () => {
    const state = createChangepointState();
    const r = rng(99);
    for (let i = 0; i < 1000; i++) updateChangepoint(state, r() < 0.95);
    expect(state.window.length).toBeLessThanOrEqual(state.opts.window);
    expect(Number.isFinite(state.baseAlpha)).toBe(true);
    expect(Number.isFinite(state.winAlpha)).toBe(true);
    expect(state.observations).toBe(1000);
  });
});
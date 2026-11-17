import { describe, expect, it } from "vitest";
import { betaCdf, betaQuantile, logGamma } from "../beta";

describe("beta math", () => {
  it("logGamma matches known values", () => {
    expect(logGamma(1)).toBeCloseTo(0, 8);
    expect(logGamma(5)).toBeCloseTo(Math.log(24), 8);
  });

  it("Beta(1,1) is uniform", () => {
    expect(betaCdf(0.5, 1, 1)).toBeCloseTo(0.5, 8);
    expect(betaQuantile(0.5, 1, 1)).toBeCloseTo(0.5, 6);
  });

  it("Beta(1,3) CDF has closed form 1-(1-x)^3", () => {
    for (const x of [0.1, 0.3, 0.7]) {
      expect(betaCdf(x, 1, 3)).toBeCloseTo(1 - Math.pow(1 - x, 3), 6);
    }
  });

  it("5th percentile of the probation prior Beta(1,3) is ~0.017", () => {
    expect(betaQuantile(0.05, 1, 3)).toBeCloseTo(1 - Math.pow(0.95, 1 / 3), 5);
  });

  it("CDF is monotone increasing", () => {
    let prev = -1;
    for (let x = 0; x <= 1.0001; x += 0.1) {
      const v = betaCdf(Math.min(x, 1), 8, 3);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });

  it("satisfies the symmetry I_x(a,b) = 1 - I_{1-x}(b,a)", () => {
    expect(betaCdf(0.3, 5, 9)).toBeCloseTo(1 - betaCdf(0.7, 9, 5), 8);
  });

  it("quantile inverts the CDF for a skewed distribution", () => {
    const q = betaQuantile(0.05, 21, 3);
    expect(betaCdf(q, 21, 3)).toBeCloseTo(0.05, 6);
  });
});
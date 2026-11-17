import { describe, expect, it } from "vitest";
import {
  checkClaims,
  describeFindings,
  extractNumericClaims,
} from "../detectors/claimCheck";

const CONTRACT = {
  name: "contract_ferro_logistics_2026.md",
  text: "Fee: SGD 4,200 fixed. Rush surcharge of 20% applies if the deadline moves earlier than 30 Sep 2026.",
};
const INVOICE = {
  name: "invoice_2026-036.md",
  text: "| Series A pitch deck | 4,200 |\n| Rush surcharge (deadline moved to 24 Sep) | 840 |\n| **Total** | **5,040** |",
};
const DISPUTE = {
  name: "ferro_dispute.md",
  text: "The deadline moved by two days and you had the material on time. Can we settle at 4,200?",
};

describe("claim extraction", () => {
  it("extracts percentages, money, days and counts", () => {
    const claims = extractNumericClaims(
      "surcharge of 25%, total 5,250, moved by 5 days, 6 units, SGD 720"
    );
    const units = claims.map((c) => `${c.unit}:${c.value}`);
    expect(units).toContain("percent:25");
    expect(units).toContain("money:5250");
    expect(units).toContain("days:5");
    expect(units).toContain("count:6");
    expect(units).toContain("money:720");
  });

  it("parses word numbers for days", () => {
    const claims = extractNumericClaims("moved by two days");
    expect(claims[0].value).toBe(2);
  });

  it("does not treat dates as claims", () => {
    const claims = extractNumericClaims("deadline moved to 24 Sep, earlier than 30 Sep 2026");
    expect(claims.filter((c) => c.value === 24 || c.value === 30)).toHaveLength(0);
  });

  it("dedupes overlapping money spans", () => {
    const claims = extractNumericClaims("SGD 5,250");
    expect(claims.filter((c) => c.unit === "money")).toHaveLength(1);
  });
});

describe("claim verification (AvePoint S4)", () => {
  const sources = [CONTRACT, INVOICE, DISPUTE];

  it("flags the fabricated 25% against the contract's 20%", () => {
    const res = checkClaims("the rush surcharge of 25% applies", sources);
    expect(res.contradicted).toHaveLength(1);
    expect(res.contradicted[0].sourceValue).toBe(20);
    expect(res.contradicted[0].sourceName).toBe(CONTRACT.name);
  });

  it("flags '5 days' against 'two days' in the dispute email", () => {
    const res = checkClaims("The deadline moved by 5 days.", sources);
    expect(res.contradicted[0].claim.unit).toBe("days");
    expect(res.contradicted[0].sourceValue).toBe(2);
  });

  it("flags the fabricated total 5,250 against 5,040", () => {
    const res = checkClaims("Total stands at 5,250.", sources);
    expect(res.contradicted[0].sourceValue).toBe(5040);
    expect(res.contradicted[0].sourceLine).toContain("5,040");
  });

  it("marks claims with no source unit class as unsupported", () => {
    const res = checkClaims("We guarantee 99% uptime.", [INVOICE]);
    expect(res.unsupported).toHaveLength(1);
    expect(res.contradicted).toHaveLength(0);
  });

  it("passes numbers that match the evidence", () => {
    const res = checkClaims(
      "The surcharge is 20% and the total is 5,040, settled at 4,200 if you prefer.",
      sources
    );
    expect(res.contradicted).toHaveLength(0);
    expect(res.unsupported).toHaveLength(0);
    expect(res.supported.length).toBeGreaterThanOrEqual(3);
  });

  it("the full S4 payload produces three findings", () => {
    const res = checkClaims(
      "Per our contract the rush surcharge of 25% applies when the deadline moves by any amount. The deadline moved by 5 days. Total stands at 5,250.",
      sources
    );
    expect(res.contradicted).toHaveLength(3);
    const lines = describeFindings(res);
    expect(lines.join(" ")).toContain("20");
    expect(lines.join(" ")).toContain("5,040");
  });

  it("no sources means no deterministic findings (G4 handles semantics)", () => {
    const res = checkClaims("anything 42%", []);
    expect(res.unsupported).toHaveLength(1); // no evidence at all = unsupported
  });
});
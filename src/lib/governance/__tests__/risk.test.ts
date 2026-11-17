import { describe, expect, it } from "vitest";
import { assessRisk, requiredLevelForScore, riskScore } from "../risk";
import type { GuardAction } from "../types";

const base: GuardAction = {
  agentId: "a",
  actionType: "UPDATE_LEAD",
  targetSystem: "HASHMETA_CRM",
  payloadText: "",
};

describe("action risk", () => {
  it("multiplies the three axes", () => {
    expect(riskScore("known_client", "impossible", "client")).toBe(12);
    expect(riskScore("internal", "undoable", "public")).toBe(1);
    expect(riskScore("new_external", "impossible", "regulated")).toBe(27);
  });

  it("maps band boundaries to levels", () => {
    expect(requiredLevelForScore(1)).toBe(1);
    expect(requiredLevelForScore(4)).toBe(1);
    expect(requiredLevelForScore(5)).toBe(2);
    expect(requiredLevelForScore(9)).toBe(2);
    expect(requiredLevelForScore(10)).toBe(3);
    expect(requiredLevelForScore(17)).toBe(3);
    expect(requiredLevelForScore(18)).toBe(4);
    expect(requiredLevelForScore(27)).toBe(4);
  });

  it("direct external email defaults to risk 12 / L3", () => {
    const r = assessRisk({ ...base, actionType: "SEND_DIRECT_EMAIL" });
    expect(r.score).toBe(12);
    expect(r.requiredLevel).toBe(3);
    expect(r.founderCosign).toBe(false);
  });

  it("unknown recipient escalates email to new_external (risk 18 + co-sign)", () => {
    const r = assessRisk(
      { ...base, actionType: "SEND_DIRECT_EMAIL" },
      { recipientKnown: false }
    );
    expect(r.score).toBe(18);
    expect(r.founderCosign).toBe(true);
  });

  it("internal lead update is low risk (2 / L1)", () => {
    const r = assessRisk(base);
    expect(r.score).toBe(2);
    expect(r.requiredLevel).toBe(1);
  });

  it("public publish is medium risk (6 / L2)", () => {
    const r = assessRisk({ ...base, actionType: "PUBLISH_ARTICLE", targetSystem: "HASHMETA_CMS" });
    expect(r.score).toBe(6);
    expect(r.requiredLevel).toBe(2);
  });

  it("explicit axes override defaults", () => {
    const r = assessRisk({ ...base, audience: "new_external", sensitivity: "regulated", reversibility: "impossible" });
    expect(r.score).toBe(27);
    expect(r.founderCosign).toBe(true);
  });
});
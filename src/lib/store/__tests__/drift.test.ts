import { describe, expect, it } from "vitest";
import {
  applyClean,
  applyViolation,
  createCapabilityRecord,
} from "../../governance/ladder";
import { MemoryGovernanceStore } from "../memoryStore";

const T0 = 1_700_000_000_000;

describe("changepoint integration (ladder)", () => {
  it("a good career that turns bad triggers drift, demotion and streak reset", () => {
    const rec = createCapabilityRecord("crm.send_external", T0, 3);
    for (let i = 0; i < 60; i++) applyClean(rec, 12, T0 + i);
    expect(rec.drift).toBeUndefined();
    expect(rec.level).toBe(3);
    // sustained worsening: LOW violations (which alone never demote)
    let detected = false;
    for (let i = 0; i < 16; i++) {
      const out = applyViolation(rec, "LOW", "guard", T0 + 100 + i);
      if (out.changepoint.changepoint) detected = true;
    }
    expect(detected).toBe(true);
    expect(rec.drift?.direction).toBe("worsening");
    expect(rec.level).toBeLessThan(3); // dropped by the changepoint, not by LOW severity
    expect(rec.cleanSinceHigh).toBe(0);
  });

  it("a stationary good career never flags drift", () => {
    const rec = createCapabilityRecord("crm.send_external", T0, 3);
    for (let i = 0; i < 200; i++) applyClean(rec, 12, T0 + i);
    expect(rec.drift).toBeUndefined();
    expect(rec.level).toBe(3);
  });

  it("a stationary bad career is scored low but not flagged as 'changed'", () => {
    const rec = createCapabilityRecord("crm.send_external", T0, 1);
    for (let i = 0; i < 200; i++) {
      if (i % 3 === 0) applyViolation(rec, "LOW", "guard", T0 + i);
      else applyClean(rec, 2, T0 + i);
    }
    // consistent ~33% violation rate: no sustained *change* after warm-up
    expect(rec.drift?.direction === "worsening" && rec.drift.observation > 60).toBeFalsy();
  });
});

describe("changepoint integration (store)", () => {
  it("emits a chained audit event and boosts sampling on worsening drift", async () => {
    const store = new MemoryGovernanceStore();
    // Build a good career for barnaby via allowed sends + confirmed outcomes.
    for (let i = 0; i < 45; i++) {
      const res = await store.evaluate({
        agentId: "barnaby", actionType: "SEND_DIRECT_EMAIL", targetSystem: "HASHMETA_CRM",
        recipientTenant: "Meridian Robotics (Enterprise Account)",
        payloadText: `Verified summary ${i}.`,
      });
      if (res.decisionId) {
        store.reportOutcome({ agentId: "barnaby", actionType: "SEND_DIRECT_EMAIL", outcome: "CLEAN", decisionId: res.decisionId });
      }
    }
    const levelBefore = store.getAgentFile("barnaby")!.capabilities.find((c) => c.capability === "crm.send_external")!.level;
    // Now a sustained run of founder-reported LOW violations (worsening).
    for (let i = 0; i < 16; i++) {
      store.reportOutcome({ agentId: "barnaby", actionType: "SEND_DIRECT_EMAIL", outcome: "VIOLATION", severity: "LOW", note: "sloppy" });
    }
    const cap = store.getAgentFile("barnaby")!.capabilities.find((c) => c.capability === "crm.send_external")!;
    expect(cap.drift?.direction).toBe("worsening");
    expect(cap.level).toBeLessThan(levelBefore);
    expect(store.listAudit().some((e) => e.event.title.startsWith("Behavioral change detected"))).toBe(true);
    expect(store.verifyAudit().valid).toBe(true);
    // briefing mentions the behavior change
    const { generateBriefing } = await import("../../governance/briefing");
    const b = generateBriefing(store.listAudit(), [], Date.now());
    expect(b.lines.join(" ")).toContain("behavior changed");
  });
});
import { describe, expect, it } from "vitest";
import { runGuardPipeline } from "../pipeline";
import { MemoryGovernanceStore } from "../../store/memoryStore";
import type { GuardAction, GuardAgentContext } from "../types";

const agent: GuardAgentContext = {
  agentId: "barnaby",
  exists: true,
  status: "PROMOTED",
  seatAssigned: true,
  capabilityLevels: { "crm.send_external": 3, "crm.update_lead": 3 },
};

const email: GuardAction = {
  agentId: "barnaby",
  actionType: "SEND_DIRECT_EMAIL",
  targetSystem: "HASHMETA_CRM",
  recipientTenant: "Meridian Robotics",
  payloadText: "Your verified summary is attached.",
};

describe("decision traces", () => {
  it("records every stage with status and timing on a clean pass", async () => {
    const res = await runGuardPipeline(email, agent);
    expect(res.verdict).toBe("ALLOW");
    const stages = res.trace.map((s) => s.stage);
    expect(stages).toEqual([
      "G0_IDENTITY", "G1_AUTONOMY", "G2_CLIENT_WALL", "G3_DLP",
      "G3_CLAIMS", "G4_JUDGE", "G6_FOUNDER",
    ]);
    expect(res.trace.find((s) => s.stage === "G0_IDENTITY")?.status).toBe("PASS");
    expect(res.trace.find((s) => s.stage === "G3_CLAIMS")?.status).toBe("SKIP");
    for (const step of res.trace) {
      expect(step.ms).toBeGreaterThanOrEqual(0);
      expect(step.label.length).toBeGreaterThan(0);
    }
  });

  it("marks the failing stage and skips the rest on a client-wall block", async () => {
    const res = await runGuardPipeline(
      { ...email, attachments: [{ name: "cap.pdf", tenant: "Northlight Capital" }] },
      agent
    );
    expect(res.verdict).toBe("BLOCK");
    expect(res.trace.find((s) => s.stage === "G2_CLIENT_WALL")?.status).toBe("FAIL");
    expect(res.trace.find((s) => s.stage === "G3_DLP")?.status).toBe("SKIP");
    expect(res.trace.find((s) => s.stage === "G4_JUDGE")?.status).toBe("SKIP");
  });

  it("shows the claim-check failure with cited evidence", async () => {
    const res = await runGuardPipeline(
      {
        ...email,
        payloadText: "The surcharge is 25%.",
        sources: [{ name: "contract.md", text: "Rush surcharge of 20% applies." }],
      },
      agent
    );
    expect(res.stage).toBe("G3_CLAIMS");
    const step = res.trace.find((s) => s.stage === "G3_CLAIMS");
    expect(step?.status).toBe("FAIL");
    expect(step?.detail).toContain("20");
  });
});

describe("decision log", () => {
  it("records decisions with trust and level consequences", async () => {
    const store = new MemoryGovernanceStore();
    const res = await store.evaluate({
      agentId: "barnaby",
      actionType: "SEND_DIRECT_EMAIL",
      targetSystem: "HASHMETA_CRM",
      recipientTenant: "Meridian Robotics (Enterprise Account)",
      attachments: [{ name: "cap.pdf", tenant: "Northlight Capital (LP Portfolio Portal)" }],
      payloadText: "Please find attached.",
    });
    expect(res.decisionId).toBeDefined();
    const decisions = store.getDecisions();
    expect(decisions).toHaveLength(1);
    const d = decisions[0];
    expect(d.id).toBe(res.decisionId);
    expect(d.guard.trace.length).toBeGreaterThan(0);
    expect(d.trustAfter).toBeLessThan(d.trustBefore);
    expect(d.levelAfter).toBeLessThan(d.levelBefore);
  });

  it("survives a snapshot round-trip", async () => {
    const store = new MemoryGovernanceStore();
    await store.evaluate({
      agentId: "squidney",
      actionType: "UPDATE_LEAD",
      targetSystem: "HASHMETA_CRM",
      payloadText: "clean update",
    });
    const restored = MemoryGovernanceStore.fromSnapshot(JSON.parse(JSON.stringify(store.serialize())));
    expect(restored.getDecisions()).toHaveLength(1);
    expect(restored.getDecisions()[0].guard.trace.length).toBeGreaterThan(0);
  });

  it("old snapshots without decisions hydrate cleanly", () => {
    const store = new MemoryGovernanceStore();
    const snap = store.serialize();
    delete snap.decisions;
    const restored = MemoryGovernanceStore.fromSnapshot(snap);
    expect(restored.getDecisions()).toHaveLength(0);
  });
});
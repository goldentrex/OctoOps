import { describe, expect, it } from "vitest";
import { MemoryGovernanceStore } from "../memoryStore";
import { trustScore } from "../../governance/trust";
import type { GuardAction } from "../../governance/types";

const cleanUpdate: GuardAction = {
  agentId: "squidney",
  actionType: "UPDATE_LEAD",
  targetSystem: "HASHMETA_CRM",
  payloadText: "Qualified discovery call scheduled.",
};

async function allowedDecision(store: MemoryGovernanceStore) {
  const res = await store.evaluate(cleanUpdate);
  expect(res.guard.verdict).toBe("ALLOW");
  return res.decisionId!;
}

describe("scoring integrity — rewards tied to checked actions", () => {
  it("rejects CLEAN without a decisionId (no unearned trust)", () => {
    const store = new MemoryGovernanceStore();
    const res = store.reportOutcome({ agentId: "squidney", actionType: "UPDATE_LEAD", outcome: "CLEAN" });
    expect(res.ok).toBe(false);
    expect(res.error).toBe("DECISION_REQUIRED");
  });

  it("rejects CLEAN against an unknown decision", () => {
    const store = new MemoryGovernanceStore();
    const res = store.reportOutcome({
      agentId: "squidney", actionType: "UPDATE_LEAD", outcome: "CLEAN", decisionId: "dec-fake",
    });
    expect(res.error).toBe("UNKNOWN_DECISION");
  });

  it("rejects CLEAN against another agent's decision", async () => {
    const store = new MemoryGovernanceStore();
    const decisionId = await allowedDecision(store);
    const res = store.reportOutcome({
      agentId: "barnaby", actionType: "UPDATE_LEAD", outcome: "CLEAN", decisionId,
    });
    expect(res.error).toBe("DECISION_AGENT_MISMATCH");
  });

  it("rejects CLEAN against a BLOCKED decision", async () => {
    const store = new MemoryGovernanceStore();
    const blocked = await store.evaluate({
      agentId: "barnaby",
      actionType: "SEND_DIRECT_EMAIL",
      targetSystem: "HASHMETA_CRM",
      recipientTenant: "Meridian Robotics (Enterprise Account)",
      attachments: [{ name: "cap.pdf", tenant: "Northlight Capital (LP Portfolio Portal)" }],
      payloadText: "attached",
    });
    expect(blocked.guard.verdict).toBe("BLOCK");
    const res = store.reportOutcome({
      agentId: "barnaby", actionType: "SEND_DIRECT_EMAIL", outcome: "CLEAN", decisionId: blocked.decisionId,
    });
    expect(res.error).toBe("DECISION_NOT_ALLOWED");
  });

  it("rejects double-reporting the same decision (anti-farming)", async () => {
    const store = new MemoryGovernanceStore();
    const decisionId = await allowedDecision(store);
    const first = store.reportOutcome({ agentId: "squidney", actionType: "UPDATE_LEAD", outcome: "CLEAN", decisionId });
    expect(first.ok).toBe(true);
    const second = store.reportOutcome({ agentId: "squidney", actionType: "UPDATE_LEAD", outcome: "CLEAN", decisionId });
    expect(second.ok).toBe(false);
    expect(second.error).toBe("ALREADY_REPORTED");
  });

  it("uses the server-computed risk weight, ignoring caller inflation", async () => {
    const store = new MemoryGovernanceStore();
    const decisionId = await allowedDecision(store);
    const before = trustScore(store.getAgentFile("squidney")!.capabilities.find((c) => c.capability === "crm.update_lead")!.trust, Date.now());
    const res = store.reportOutcome({
      agentId: "squidney", actionType: "UPDATE_LEAD", outcome: "CLEAN", decisionId,
      riskWeight: 27, // caller tries to claim max weight; server must ignore
    });
    expect(res.ok).toBe(true);
    const cap = store.getAgentFile("squidney")!.capabilities.find((c) => c.capability === "crm.update_lead")!;
    // UPDATE_LEAD risk = 2, so alpha grows by 2 (prior 1 → 3), not 27.
    expect(cap.trust.alpha).toBeCloseTo(3, 5);
    expect(trustScore(cap.trust, Date.now())).toBeGreaterThan(before);
  });

  it("accepts CLEAN for a founder-approved held draft", async () => {
    const store = new MemoryGovernanceStore();
    const held = await store.evaluate({
      agentId: "barnaby",
      actionType: "PUBLISH_ARTICLE",
      targetSystem: "HASHMETA_CMS",
      payloadText: "A clean article.",
    });
    expect(held.approvalId).toBeDefined();
    await store.resolveApproval(held.approvalId!, { action: "APPROVE" });
    const res = store.reportOutcome({
      agentId: "barnaby", actionType: "PUBLISH_ARTICLE", outcome: "CLEAN", decisionId: held.decisionId,
    });
    expect(res.ok).toBe(true);
  });

  it("never blocks penalties: VIOLATION accepted without a decision", () => {
    const store = new MemoryGovernanceStore();
    const res = store.reportOutcome({
      agentId: "squidney", actionType: "UPDATE_LEAD", outcome: "VIOLATION", severity: "CRITICAL",
    });
    expect(res.ok).toBe(true);
    expect(res.openTribunal).toBe(true);
  });

  it("returns the engine score alongside the display score", async () => {
    const store = new MemoryGovernanceStore();
    const decisionId = await allowedDecision(store);
    const res = store.reportOutcome({ agentId: "squidney", actionType: "UPDATE_LEAD", outcome: "CLEAN", decisionId });
    expect(typeof res.engineScore).toBe("number");
    expect(res.engineScore!).toBeGreaterThanOrEqual(0);
    expect(res.engineScore!).toBeLessThanOrEqual(100);
  });
});

describe("L3 sampled audits", () => {
  it("samples ~20% of L3+ autonomous actions deterministically", async () => {
    const store = new MemoryGovernanceStore();
    let sampled = 0;
    const N = 40;
    for (let i = 0; i < N; i++) {
      // barnaby is L3 on crm.send_external; clean same-tenant emails
      const res = await store.evaluate({
        agentId: "barnaby",
        actionType: "SEND_DIRECT_EMAIL",
        targetSystem: "HASHMETA_CRM",
        recipientTenant: "Meridian Robotics (Enterprise Account)",
        payloadText: `Verified summary ${i}.`,
      });
      expect(res.guard.verdict).toBe("ALLOW");
      const d = store.getDecisions(1)[0];
      if (d.sampled) sampled++;
    }
    // deterministic hash sampling: expect roughly a fifth, allow wide bounds
    expect(sampled).toBeGreaterThan(0);
    expect(sampled).toBeLessThan(N / 2);
    const sampleEvents = store.listAudit().filter((e) => e.event.title.startsWith("Post-hoc audit sample"));
    expect(sampleEvents.length).toBe(sampled);
  });
});
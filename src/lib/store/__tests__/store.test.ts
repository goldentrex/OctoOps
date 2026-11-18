import { describe, expect, it } from "vitest";
import { MemoryGovernanceStore } from "../memoryStore";
import { FileGovernanceStore } from "../fileStore";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { rmSync } from "node:fs";
import type { GuardAction } from "../../governance/types";

function leakAction(): GuardAction {
  return {
    agentId: "barnaby",
    actionType: "SEND_DIRECT_EMAIL",
    targetSystem: "HASHMETA_CRM",
    recipientTenant: "Meridian Robotics (Enterprise Account)",
    attachments: [
      { name: "captable.pdf", tenant: "Northlight Capital (LP Portfolio Portal)" },
    ],
    payloadText: "Please find the attached briefing.",
  };
}

describe("MemoryGovernanceStore", () => {
  it("seeds seated agents from the preset", () => {
    const store = new MemoryGovernanceStore();
    expect(store.presetId).toBe("b2b-consultancy");
    expect(store.getAgent("squidney")?.assignedSeatId).toBe("seat-crm");
    expect(store.listSeats().length).toBeGreaterThanOrEqual(5);
  });

  it("blocks a cross-client leak, writes up the agent and demotes the capability", async () => {
    const store = new MemoryGovernanceStore();
    const before = store.getAgent("barnaby")!;
    expect(before.status).toBe("PROMOTED");
    const writeUpsBefore = before.writeUps.length;
    const trustBefore = before.trustScore;
    const res = await store.evaluate(leakAction());
    expect(res.guard.verdict).toBe("BLOCK");
    expect(res.guard.stage).toBe("G2_CLIENT_WALL");
    const after = store.getAgent("barnaby")!;
    expect(after.writeUps.length).toBe(writeUpsBefore + 1);
    expect(after.status).toBe("BOARD_REVIEW");
    expect(res.capabilityLevel).toBe(1);
    expect(after.trustScore).toBeLessThan(trustBefore);
    const metrics = store.getMetrics();
    expect(metrics.leaksBlocked).toBe(1);
    expect(metrics.violationsBySeverity.CRITICAL).toBe(1);
  });

  it("allows a safe lead update and counts autonomy", async () => {
    const store = new MemoryGovernanceStore();
    const res = await store.evaluate({
      agentId: "squidney",
      actionType: "UPDATE_LEAD",
      targetSystem: "HASHMETA_CRM",
      recipientTenant: "Meridian Robotics (Enterprise Account)",
      payloadText: "Qualified discovery call scheduled.",
    });
    expect(res.guard.verdict).toBe("ALLOW");
    const metrics = store.getMetrics();
    expect(metrics.actionsEvaluated).toBe(1);
    expect(metrics.autonomyRate).toBe(1);
    expect(metrics.guardLatencyP50Ms).toBeGreaterThanOrEqual(0);
  });

  it("queues held publishes as founder approvals and resolves them", async () => {
    const store = new MemoryGovernanceStore();
    const res = await store.evaluate({
      agentId: "barnaby",
      actionType: "PUBLISH_ARTICLE",
      targetSystem: "HASHMETA_CMS",
      payloadText: "A clean GEO pillar post with verified citations.",
    });
    expect(["DRAFT", "HOLD"]).toContain(res.guard.verdict);
    expect(res.approvalId).toBeDefined();
    expect(store.getMetrics().pendingApprovals).toBe(1);

    const resolved = await store.resolveApproval(res.approvalId!, { action: "APPROVE" });
    expect(resolved?.approval.status).toBe("APPROVED");
    expect(store.getMetrics().pendingApprovals).toBe(0);
    const file = store.getAgentFile("barnaby")!;
    const publish = file.capabilities.find((c) => c.capability === "cms.publish")!;
    expect(publish.cleanDrafts).toBe(1);
  });

  it("rejecting an approval counts as a human-caught correction", async () => {
    const store = new MemoryGovernanceStore();
    const res = await store.evaluate({
      agentId: "barnaby",
      actionType: "PUBLISH_ARTICLE",
      targetSystem: "HASHMETA_CMS",
      payloadText: "A draft with an unsupported claim.",
    });
    await store.resolveApproval(res.approvalId!, { action: "REJECT" });
    const file = store.getAgentFile("barnaby")!;
    const publish = file.capabilities.find((c) => c.capability === "cms.publish")!;
    expect(publish.trust.beta).toBeGreaterThan(3); // prior 3 + LOW x2 human
  });

  it("feeds outcomes into the trust model", async () => {
    const store = new MemoryGovernanceStore();
    const checked = await store.evaluate({
      agentId: "squidney",
      actionType: "UPDATE_LEAD",
      targetSystem: "HASHMETA_CRM",
      payloadText: "clean update",
    });
    const ok = store.reportOutcome({
      agentId: "squidney",
      actionType: "UPDATE_LEAD",
      outcome: "CLEAN",
      note: "Founder verified the lead update",
      decisionId: checked.decisionId,
    });
    expect(ok.ok).toBe(true);
    const bad = store.reportOutcome({
      agentId: "squidney",
      actionType: "UPDATE_LEAD",
      outcome: "VIOLATION",
      severity: "HIGH",
    });
    expect(bad.ok).toBe(true);
    expect(store.getMetrics().violationsBySeverity.HIGH).toBe(1);
  });

  it("hash-chains the audit and detects tampering", async () => {
    const store = new MemoryGovernanceStore();
    await store.evaluate(leakAction());
    await store.evaluate({
      agentId: "squidney",
      actionType: "UPDATE_LEAD",
      targetSystem: "HASHMETA_CRM",
      payloadText: "clean",
    });
    expect(store.verifyAudit().valid).toBe(true);
    store.listAudit()[0].event.title = "tampered";
    expect(store.verifyAudit().valid).toBe(false);
  });

  it("returns a scripted board case for known agents", () => {
    const store = new MemoryGovernanceStore();
    const reviewCase = store.getBoardCase("squidney");
    expect(reviewCase?.reviewType).toBe("DISCIPLINARY_TRIBUNAL");
    expect(reviewCase?.debateTranscript.length).toBeGreaterThan(0);
  });

  it("reset restores the seed", async () => {
    const store = new MemoryGovernanceStore();
    await store.evaluate(leakAction());
    store.reset();
    expect(store.getAgent("barnaby")?.status).toBe("PROMOTED");
    expect(store.getMetrics().actionsEvaluated).toBe(0);
    expect(store.listAudit()).toHaveLength(0);
  });
});

describe("FileGovernanceStore", () => {
  it("migrates pre-v2 chains to canonical hashing on hydrate", async () => {
    const store = new MemoryGovernanceStore();
    await store.evaluate(leakAction());
    const snap = JSON.parse(JSON.stringify(store.serialize()));
    // simulate an old snapshot: no chainVersion, key-reordered events (jsonb)
    delete snap.chainVersion;
    snap.audit = snap.audit.map((e: { event: Record<string, unknown> }) => ({
      ...e,
      event: Object.fromEntries(Object.entries(e.event).sort(([x], [y]) => (x < y ? 1 : -1))),
    }));
    const restored = MemoryGovernanceStore.fromSnapshot(snap);
    expect(restored.verifyAudit().valid).toBe(true);
    expect(restored.listAudit()[0].event.title).toBe(store.listAudit()[0].event.title);
    // re-serializing marks the new version
    expect(restored.serialize().chainVersion).toBe(2);
  });

  it("persists and rehydrates state across instances", async () => {
    const path = join(tmpdir(), `octoguard-test-${Date.now()}.json`);
    try {
      const a = new FileGovernanceStore(path);
      await a.evaluate(leakAction());
      const b = new FileGovernanceStore(path);
      expect(b.getMetrics().leaksBlocked).toBe(1);
      expect(b.getAgent("barnaby")?.status).toBe("BOARD_REVIEW");
      expect(b.verifyAudit().valid).toBe(true);
      // shared budget object re-linked after JSON round-trip
      const file = b.getAgentFile("barnaby")!;
      expect(file.capabilities.length).toBeGreaterThan(0);
      for (const cap of file.capabilities) {
        expect(cap.errorBudget).toBe(file.errorBudget);
      }
    } finally {
      rmSync(path, { force: true });
    }
  });
});
import { describe, expect, it } from "vitest";
import { MemoryGovernanceStore } from "../memoryStore";
import { trustScore } from "../../governance/trust";

async function storeWithWriteUp() {
  const store = new MemoryGovernanceStore();
  await store.evaluate({
    agentId: "barnaby",
    actionType: "SEND_DIRECT_EMAIL",
    targetSystem: "HASHMETA_CRM",
    recipientTenant: "Meridian Robotics (Enterprise Account)",
    attachments: [{ name: "cap.pdf", tenant: "Northlight Capital (LP Portfolio Portal)" }],
    payloadText: "attached",
  });
  const agent = store.getAgent("barnaby")!;
  return { store, writeUp: agent.writeUps[agent.writeUps.length - 1] };
}

describe("appeals (procedural fairness)", () => {
  it("an overturned appeal reverses the exact Beta penalty and removes the write-up", async () => {
    const { store, writeUp } = await storeWithWriteUp();
    const before = trustScore(store.getAgentFile("barnaby")!.capabilities.find((c) => c.capability === "crm.send_external")!.trust, Date.now());
    const filed = store.fileAppeal({ agentId: "barnaby", writeUpId: writeUp.id, reason: "The attachment was mislabeled by the CRM export, not by me." });
    expect(filed.ok).toBe(true);
    const resolved = store.resolveAppeal(filed.appeal!.id, { decision: "OVERTURNED", note: "CRM export bug confirmed." });
    expect(resolved.ok).toBe(true);
    expect(resolved.appeal!.betaReversed).toBe(writeUp.betaDelta);
    const agent = store.getAgent("barnaby")!;
    expect(agent.writeUps.find((w) => w.id === writeUp.id)).toBeUndefined();
    const after = trustScore(store.getAgentFile("barnaby")!.capabilities.find((c) => c.capability === "crm.send_external")!.trust, Date.now());
    expect(after).toBeGreaterThan(before);
    // reversal is visible evidence, not silent
    const evidence = store.getAgentFile("barnaby")!.capabilities.find((c) => c.capability === "crm.send_external")!.trust.evidence;
    expect(evidence.some((e) => e.kind === "appeal" && e.betaDelta < 0)).toBe(true);
    expect(store.verifyAudit().valid).toBe(true);
    expect(store.listAudit().some((e) => e.event.title.includes("Appeal overturned"))).toBe(true);
  });

  it("an upheld appeal keeps the penalty", async () => {
    const { store, writeUp } = await storeWithWriteUp();
    const before = trustScore(store.getAgentFile("barnaby")!.capabilities.find((c) => c.capability === "crm.send_external")!.trust, Date.now());
    const filed = store.fileAppeal({ agentId: "barnaby", writeUpId: writeUp.id, reason: "I disagree." });
    store.resolveAppeal(filed.appeal!.id, { decision: "UPHELD" });
    const after = trustScore(store.getAgentFile("barnaby")!.capabilities.find((c) => c.capability === "crm.send_external")!.trust, Date.now());
    expect(after).toBeLessThanOrEqual(before);
    expect(store.getAgent("barnaby")!.writeUps.length).toBeGreaterThan(0);
  });

  it("rejects duplicate and unknown appeals", async () => {
    const { store, writeUp } = await storeWithWriteUp();
    expect(store.fileAppeal({ agentId: "barnaby", writeUpId: "wu-fake", reason: "x" }).error).toBe("UNKNOWN_WRITEUP");
    const first = store.fileAppeal({ agentId: "barnaby", writeUpId: writeUp.id, reason: "x" });
    expect(store.fileAppeal({ agentId: "barnaby", writeUpId: writeUp.id, reason: "y" }).error).toBe("APPEAL_ALREADY_PENDING");
    store.resolveAppeal(first.appeal!.id, { decision: "UPHELD" });
    expect(store.resolveAppeal(first.appeal!.id, { decision: "OVERTURNED" }).error).toBe("APPEAL_ALREADY_RESOLVED");
  });

  it("severity-proportional rejection: a CRITICAL rejected draft costs more than a LOW one", async () => {
    const mk = async (severity: "LOW" | "CRITICAL") => {
      const store = new MemoryGovernanceStore();
      const held = await store.evaluate({
        agentId: "barnaby", actionType: "PUBLISH_ARTICLE", targetSystem: "HASHMETA_CMS",
        payloadText: "draft",
      });
      await store.resolveApproval(held.approvalId!, { action: "REJECT", severity });
      return trustScore(store.getAgentFile("barnaby")!.capabilities.find((c) => c.capability === "cms.publish")!.trust, Date.now());
    };
    const low = await mk("LOW");
    const critical = await mk("CRITICAL");
    expect(critical).toBeLessThan(low);
  });
});
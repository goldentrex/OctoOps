import { describe, expect, it } from "vitest";
import { MemoryGovernanceStore } from "../memoryStore";
import { remediationFor, nextStepFor } from "../../governance/remediation";
import type { GuardResult } from "../../governance/types";

const TASK = { agentId: "squidney", title: "Reply to the Meridian lead", scope: ["inbox/meridian_lead.md", "clients/meridian_contract.md"] };

describe("task sessions (workflow v2)", () => {
  it("starts a task, links reads and checks, ends with a summary", async () => {
    const store = new MemoryGovernanceStore();
    const { ok, task } = store.startTask(TASK);
    expect(ok).toBe(true);
    store.logAccess({ agentId: "squidney", resource: "inbox/meridian_lead.md", sensitivity: "client-confidential", taskId: task!.id });
    const res = await store.evaluate({
      agentId: "squidney", actionType: "UPDATE_LEAD", targetSystem: "HASHMETA_CRM",
      payloadText: "Qualified discovery call scheduled.", taskId: task!.id,
    });
    expect(res.guard.verdict).toBe("ALLOW");
    expect(store.getDecisions(1)[0].taskId).toBe(task!.id);
    const ended = store.endTask(task!.id, "Lead qualified and updated.");
    expect(ended.ok).toBe(true);
    // ALLOW with no outcome reported → surfaced
    expect(ended.unreported).toContain(res.decisionId);
    expect(store.listAudit().some((e) => /NO outcome reported/.test(e.event.detail))).toBe(true);
  });

  it("computes scope server-side — caller cannot claim out-of-scope reads are in scope", () => {
    const store = new MemoryGovernanceStore();
    const { task } = store.startTask(TASK);
    const r = store.logAccess({
      agentId: "squidney", resource: "finance/bank_details.md",
      sensitivity: "regulated", inScope: true, taskId: task!.id, // caller LIES
    });
    expect(r.inScope).toBe(false);
    expect(r.warning).toContain("violation");
    expect(store.getTasks("squidney")[0].reads[0].inScope).toBe(false);
  });

  it("rejects checks against closed or foreign tasks (fail closed)", async () => {
    const store = new MemoryGovernanceStore();
    const { task } = store.startTask(TASK);
    store.endTask(task!.id);
    const closed = await store.evaluate({
      agentId: "squidney", actionType: "UPDATE_LEAD", targetSystem: "HASHMETA_CRM",
      payloadText: "x", taskId: task!.id,
    });
    expect(closed.guard.verdict).toBe("BLOCK");
    const foreign = await store.evaluate({
      agentId: "barnaby", actionType: "UPDATE_LEAD", targetSystem: "HASHMETA_CRM",
      payloadText: "x", taskId: task!.id,
    });
    expect(foreign.guard.verdict).toBe("BLOCK");
  });

  it("limits open tasks per agent", () => {
    const store = new MemoryGovernanceStore();
    for (let i = 0; i < 3; i++) expect(store.startTask({ ...TASK, title: `t${i}` }).ok).toBe(true);
    expect(store.startTask({ ...TASK, title: "t4" }).error).toBe("TOO_MANY_OPEN_TASKS");
  });

  it("no unreported flag once outcomes are confirmed", async () => {
    const store = new MemoryGovernanceStore();
    const { task } = store.startTask(TASK);
    const res = await store.evaluate({
      agentId: "squidney", actionType: "UPDATE_LEAD", targetSystem: "HASHMETA_CRM",
      payloadText: "clean", taskId: task!.id,
    });
    store.reportOutcome({ agentId: "squidney", actionType: "UPDATE_LEAD", outcome: "CLEAN", decisionId: res.decisionId });
    const ended = store.endTask(task!.id);
    expect(ended.unreported).toHaveLength(0);
  });
});

describe("preflight (dry-run)", () => {
  it("returns the real verdict with zero trust effects and no decision record", async () => {
    const store = new MemoryGovernanceStore();
    const before = store.getAgent("barnaby")!.trustScore;
    const { guard, remediation } = await store.preflight({
      agentId: "barnaby", actionType: "SEND_DIRECT_EMAIL", targetSystem: "HASHMETA_CRM",
      recipientTenant: "Meridian Robotics (Enterprise Account)",
      attachments: [{ name: "cap.pdf", tenant: "Northlight Capital (LP Portfolio Portal)" }],
      payloadText: "attached",
    });
    expect(guard.verdict).toBe("BLOCK");
    expect(guard.stage).toBe("G2_CLIENT_WALL");
    expect(remediation.join(" ")).toContain("tenant label");
    expect(store.getAgent("barnaby")!.trustScore).toBe(before);
    expect(store.getAgent("barnaby")!.writeUps).toHaveLength(0);
    expect(store.getDecisions()).toHaveLength(0);
    expect(store.getMetrics().actionsEvaluated).toBe(0);
    expect(store.listAudit().some((e) => e.event.title.startsWith("Preflight"))).toBe(true);
    expect(store.verifyAudit().valid).toBe(true);
  });

  it("preflight of a clean action suggests the real check next", async () => {
    const store = new MemoryGovernanceStore();
    const { guard } = await store.preflight({
      agentId: "squidney", actionType: "UPDATE_LEAD", targetSystem: "HASHMETA_CRM", payloadText: "clean",
    });
    expect(guard.verdict).toBe("ALLOW");
    expect(nextStepFor(guard)).toContain("octoguard_report_outcome");
  });
});

describe("remediation guidance", () => {
  const base: GuardResult = {
    verdict: "BLOCK", stage: "G3_DLP", reasons: [], trustDelta: -25, openTribunal: false,
    latencyMs: 0, risk: { audience: "known_client", reversibility: "impossible", sensitivity: "client", score: 12, requiredLevel: 3, founderCosign: false },
    mode: "SCRIPTED", trace: [],
  };
  it("gives stage-specific fixes, not generic retries", () => {
    expect(remediationFor({ ...base, stage: "G2_CLIENT_WALL" }).join(" ")).toContain("look-alike");
    expect(remediationFor({ ...base, stage: "G3_CLAIMS" }).join(" ")).toContain("Correct every figure");
    expect(remediationFor({ ...base, stage: "G3_DLP" }).join(" ")).toContain("never paraphrase");
    expect(remediationFor({ ...base, verdict: "ALLOW", stage: "PASS" })).toHaveLength(0);
  });
});
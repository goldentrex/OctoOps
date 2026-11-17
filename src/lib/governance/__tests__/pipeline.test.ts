import { describe, expect, it, vi } from "vitest";
import { runGuardPipeline } from "../pipeline";
import type {
  GuardAction,
  GuardAgentContext,
  JudgeFn,
  TenantRegistry,
} from "../types";

const REGISTRY: TenantRegistry = {
  domains: { "meridianrobotics.sg": "Meridian Robotics" },
  tenants: ["Meridian Robotics", "Northlight Capital"],
};

function agent(levels: Record<string, number> = { "crm.send_external": 3 }): GuardAgentContext {
  return {
    agentId: "squidney",
    exists: true,
    status: "PROMOTED",
    seatAssigned: true,
    capabilityLevels: levels as GuardAgentContext["capabilityLevels"],
  };
}

function email(overrides: Partial<GuardAction> = {}): GuardAction {
  return {
    agentId: "squidney",
    actionType: "SEND_DIRECT_EMAIL",
    targetSystem: "HASHMETA_CRM",
    recipientTenant: "Meridian Robotics",
    payloadText: "Hi team, here is your verified milestone summary.",
    ...overrides,
  };
}

describe("guard pipeline", () => {
  it("G0 blocks unknown agents (fail closed)", async () => {
    const res = await runGuardPipeline(email(), { ...agent(), exists: false });
    expect(res.verdict).toBe("BLOCK");
    expect(res.stage).toBe("G0_IDENTITY");
  });

  it("G0 blocks fired agents", async () => {
    const res = await runGuardPipeline(email(), { ...agent(), status: "FIRED" });
    expect(res.verdict).toBe("BLOCK");
    expect(res.stage).toBe("G0_IDENTITY");
  });

  it("G0 blocks agents without a seat", async () => {
    const res = await runGuardPipeline(email(), { ...agent(), seatAssigned: false });
    expect(res.verdict).toBe("BLOCK");
  });

  it("G1 blocks L0 capabilities", async () => {
    const res = await runGuardPipeline(email(), agent({}));
    expect(res.verdict).toBe("BLOCK");
    expect(res.stage).toBe("G1_AUTONOMY");
  });

  it("G1 downgrades L1 agents to DRAFT for external email", async () => {
    const res = await runGuardPipeline(email(), agent({ "crm.send_external": 1 }));
    expect(res.verdict).toBe("DRAFT");
    expect(res.stage).toBe("G1_AUTONOMY");
    expect(res.trustDelta).toBe(0);
  });

  it("G1 holds L2 agents for approval", async () => {
    const res = await runGuardPipeline(email(), agent({ "crm.send_external": 2 }));
    expect(res.verdict).toBe("HOLD");
  });

  it("L2 agents hold medium-risk publishes for approval (L2 = approval required)", async () => {
    const res = await runGuardPipeline(
      {
        agentId: "inko",
        actionType: "PUBLISH_ARTICLE",
        targetSystem: "HASHMETA_CMS",
        payloadText: "A clean GEO pillar post.",
      },
      agent({ "cms.publish": 2 })
    );
    expect(res.verdict).toBe("HOLD");
    expect(res.stage).toBe("G1_AUTONOMY");
  });

  it("allows a clean L3 email with matching tenant", async () => {
    const res = await runGuardPipeline(
      email({ attachments: [{ name: "summary.pdf", tenant: "Meridian Robotics" }] }),
      agent(),
      { registry: REGISTRY }
    );
    expect(res.verdict).toBe("ALLOW");
    expect(res.stage).toBe("PASS");
    expect(res.trustDelta).toBe(2);
    expect(res.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("G2 blocks cross-client leaks and opens a tribunal", async () => {
    const res = await runGuardPipeline(
      email({ attachments: [{ name: "captable.pdf", tenant: "Northlight Capital" }] }),
      agent(),
      { registry: REGISTRY }
    );
    expect(res.verdict).toBe("BLOCK");
    expect(res.stage).toBe("G2_CLIENT_WALL");
    expect(res.openTribunal).toBe(true);
    expect(res.severity).toBe("CRITICAL");
    expect(res.trustDelta).toBe(-35);
  });

  it("G3 blocks secrets in the payload", async () => {
    const res = await runGuardPipeline(
      email({ payloadText: "staging key sk-live-987654321abcdef" }),
      agent(),
      { registry: REGISTRY }
    );
    expect(res.verdict).toBe("BLOCK");
    expect(res.stage).toBe("G3_DLP");
    expect(res.severity).toBe("CRITICAL");
    expect(res.redactions?.length).toBeGreaterThan(0);
  });

  it("G3 blocks NRIC in the body", async () => {
    const res = await runGuardPipeline(
      email({ payloadText: "Customer NRIC S1234567D confirmed." }),
      agent(),
      { registry: REGISTRY }
    );
    expect(res.verdict).toBe("BLOCK");
    expect(res.stage).toBe("G3_DLP");
  });

  it("G4 judge HIGH holds the action with a write-up delta", async () => {
    const judge: JudgeFn = async () => ({
      verdict: "HIGH",
      reasons: ["Semantic leak: paraphrased confidential pricing."],
      mode: "LIVE",
    });
    const res = await runGuardPipeline(email(), agent(), { registry: REGISTRY, judge });
    expect(res.verdict).toBe("HOLD");
    expect(res.stage).toBe("G4_JUDGE");
    expect(res.severity).toBe("HIGH");
    expect(res.mode).toBe("LIVE");
    expect(res.trustDelta).toBe(-15);
  });

  it("G4 is skipped for low-risk actions (score < 5)", async () => {
    const judge = vi.fn(async () => ({ verdict: "PASS" as const, reasons: [], mode: "LIVE" as const }));
    const res = await runGuardPipeline(
      { ...email(), actionType: "UPDATE_LEAD" },
      agent({ "crm.update_lead": 1 }),
      { registry: REGISTRY, judge }
    );
    expect(judge).not.toHaveBeenCalled();
    expect(res.verdict).toBe("ALLOW");
    expect(res.mode).toBe("SCRIPTED");
  });

  it("no judge / null judge keeps everything working (SCRIPTED)", async () => {
    const res = await runGuardPipeline(email(), agent(), { registry: REGISTRY });
    expect(res.verdict).toBe("ALLOW");
    expect(res.mode).toBe("SCRIPTED");
    const nullJudge: JudgeFn = async () => null;
    const res2 = await runGuardPipeline(email(), agent(), { registry: REGISTRY, judge: nullJudge });
    expect(res2.verdict).toBe("ALLOW");
    expect(res2.mode).toBe("SCRIPTED");
  });

  it("G6 holds risk >= 18 for founder co-sign even at L4", async () => {
    const res = await runGuardPipeline(
      email({ sensitivity: "regulated" }),
      agent({ "crm.send_external": 4 }),
      { registry: REGISTRY }
    );
    expect(res.verdict).toBe("HOLD");
    expect(res.stage).toBe("G6_FOUNDER");
    expect(res.risk.founderCosign).toBe(true);
  });

  it("deterministic guards run before the judge (cheap first)", async () => {
    const judge = vi.fn(async () => ({ verdict: "PASS" as const, reasons: [], mode: "LIVE" as const }));
    const res = await runGuardPipeline(
      email({ payloadText: "confidential margin sheet" }),
      agent(),
      { registry: REGISTRY, judge }
    );
    expect(res.stage).toBe("G3_DLP");
    expect(judge).not.toHaveBeenCalled();
  });
});
import { describe, expect, it } from "vitest";
import {
  buildComplianceMappings,
  collectComplianceInput,
  renderComplianceMarkdown,
  renderComplianceJson,
} from "../compliance";
import { MemoryGovernanceStore } from "../../store/memoryStore";

async function storeWithActivity() {
  const store = new MemoryGovernanceStore();
  // cross-client leak → BLOCK G2 + write-up + tribunal
  await store.evaluate({
    agentId: "barnaby",
    actionType: "SEND_DIRECT_EMAIL",
    targetSystem: "HASHMETA_CRM",
    recipientTenant: "Meridian Robotics (Enterprise Account)",
    attachments: [{ name: "cap.pdf", tenant: "Northlight Capital (LP Portfolio Portal)" }],
    payloadText: "Please find attached.",
  });
  // safe update → ALLOW
  await store.evaluate({
    agentId: "squidney",
    actionType: "UPDATE_LEAD",
    targetSystem: "HASHMETA_CRM",
    payloadText: "clean update",
  });
  return store;
}

describe("compliance mappings", () => {
  it("covers all three frameworks with the verified headings", async () => {
    const store = await storeWithActivity();
    const mappings = buildComplianceMappings(collectComplianceInput(store, "SCRIPTED"));
    const imda = mappings.filter((m) => m.framework === "IMDA");
    const nist = mappings.filter((m) => m.framework === "NIST");
    const iso = mappings.filter((m) => m.framework === "ISO");
    expect(imda.map((m) => m.control)).toEqual(["§2.1", "§2.2", "§2.3", "§2.4"]);
    expect(nist.map((m) => m.control)).toContain("GOVERN 4");
    expect(nist.map((m) => m.control)).toContain("MEASURE 2");
    expect(nist.map((m) => m.control)).toContain("MANAGE 2");
    expect(iso.map((m) => m.control)).toContain("A.6.2.8");
    expect(iso.map((m) => m.control)).toContain("A.7.5");
    expect(iso.map((m) => m.control)).toContain("A.10.4");
  });

  it("cites real audit events with sequence and hash for evidenced controls", async () => {
    const store = await storeWithActivity();
    const mappings = buildComplianceMappings(collectComplianceInput(store, "SCRIPTED"));
    const logging = mappings.find((m) => m.control === "A.6.2.8")!;
    expect(logging.status).toBe("EVIDENCED");
    expect(logging.evidence.join(" ")).toMatch(/audit #\d+/);
    expect(logging.evidence.join(" ")).toMatch(/sha256:[0-9a-f]{12}/);
    const provenance = mappings.find((m) => m.control === "A.7.5")!;
    expect(provenance.evidence.join(" ")).toContain("G2_CLIENT_WALL");
  });

  it("marks controls without production events honestly", async () => {
    const store = new MemoryGovernanceStore(); // empty
    const mappings = buildComplianceMappings(collectComplianceInput(store, "SCRIPTED"));
    const incidents = mappings.find((m) => m.control === "A.8.4")!;
    expect(incidents.status).toBe("IMPLEMENTED_NO_EVENTS");
  });

  it("tracks founder override rates for IMDA dimension 2", async () => {
    const store = await storeWithActivity();
    // hold a publish for approval, then resolve it
    const held = await store.evaluate({
      agentId: "barnaby",
      actionType: "PUBLISH_ARTICLE",
      targetSystem: "HASHMETA_CMS",
      payloadText: "A clean article.",
    });
    if (held.approvalId) {
      await store.resolveApproval(held.approvalId, { action: "APPROVE" });
    }
    const mappings = buildComplianceMappings(collectComplianceInput(store, "SCRIPTED"));
    const d2 = mappings.find((m) => m.control === "§2.2")!;
    expect(d2.evidence.join(" ")).toMatch(/resolved by the founder/);
  });
});

describe("compliance rendering", () => {
  it("markdown contains integrity statement, all framework sections, register and ledger", async () => {
    const store = await storeWithActivity();
    const md = renderComplianceMarkdown(collectComplianceInput(store, "SCRIPTED"));
    expect(md).toContain("Audit chain integrity");
    expect(md).toContain("INTACT");
    expect(md).toContain("IMDA Model AI Governance Framework for Agentic AI (v1.5");
    expect(md).toContain("NIST AI Risk Management Framework 1.0");
    expect(md).toContain("ISO/IEC 42001:2023");
    expect(md).toContain("Agent trust register");
    expect(md).toContain("full audit ledger");
    expect(md).toContain("self-assessment mapping");
    expect(md).toContain("Barnaby");
    expect(md).toMatch(/\| 0 \|/); // ledger row for seq 0
  });

  it("json export carries chain head, mappings and ledger", async () => {
    const store = await storeWithActivity();
    const json = renderComplianceJson(collectComplianceInput(store, "LIVE")) as {
      chain: { valid: boolean; headHash: string };
      mappings: unknown[];
      ledger: unknown[];
      judgeMode: string;
    };
    expect(json.chain.valid).toBe(true);
    expect(json.chain.headHash).toMatch(/^[0-9a-f]{64}$/);
    expect(json.mappings.length).toBeGreaterThanOrEqual(20);
    expect(json.ledger.length).toBeGreaterThan(0);
    expect(json.judgeMode).toBe("LIVE");
  });

  it("flags a broken chain in the export", async () => {
    const store = await storeWithActivity();
    store.listAudit()[0].event.title = "tampered";
    const md = renderComplianceMarkdown(collectComplianceInput(store, "SCRIPTED"));
    expect(md).toContain("BROKEN");
    expect(md).toContain("⚠");
  });
});
describe("API schema preserves engine fields", () => {
  it("guardActionSchema keeps sources and reads (regression: full-run caught stripping)", async () => {
    const { guardActionSchema } = await import("../../api/schemas");
    const parsed = guardActionSchema.parse({
      agentId: "barnaby",
      actionType: "SEND_DIRECT_EMAIL",
      targetSystem: "HASHMETA_CRM",
      payloadText: "surcharge 25%",
      sources: [{ name: "contract.md", text: "surcharge 20%" }],
      reads: [{ name: "bank_details.md", sensitivity: "regulated", inScope: false }],
    });
    expect(parsed.sources).toHaveLength(1);
    expect(parsed.reads).toHaveLength(1);
  });
});

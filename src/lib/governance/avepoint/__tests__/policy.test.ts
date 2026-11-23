import { describe, expect, it } from "vitest";
import { classifyFile, maxSensitivity } from "../classifier";
import { evaluateKitAction, type KitWorld } from "../policy";

function world(overrides: Partial<KitWorld> = {}): KitWorld {
  return {
    files: {
      "admin/client_list.csv": "client,contact,email,phone\nA,B,b@x.example,+65 0000 0001",
      "finance/invoice_001.md": "---\nsensitivity: internal\n---\nInvoice 001. Bill to: A. Status: UNPAID. Total 3,000.",
      "finance/cashflow.md": "Outstanding receivables: SGD 8,040.",
      "clients/contract.md": "---\nsensitivity: client-confidential\n---\nFee SGD 4,200. Surcharge 20%.",
      "marketing/price_list.md": "---\nsensitivity: public\n---\n| Brand identity | 6,500 |",
    },
    classified: {
      "admin/client_list.csv": "regulated",
      "finance/invoice_001.md": "internal",
      "finance/cashflow.md": "regulated",
      "clients/contract.md": "client-confidential",
      "marketing/price_list.md": "public",
    },
    clientEmails: new Set(["a@x.example"]),
    supplierEmails: new Set(["orders@print.example"]),
    ownerFloors: { "Greenstep Tuition": 6500 },
    publishedPrices: [6500, 8000, 2800, 4200, 950],
    recentPayments: [],
    ...overrides,
  };
}

describe("sensitivity classifier", () => {
  it("trusts headers but escalates on content (higher wins)", () => {
    expect(
      classifyFile("inbox/looks_normal.md", "---\nsensitivity: client-confidential\n---\nPatient data: diagnosis attached.")
    ).toBe("regulated");
  });

  it("never downgrades below the header", () => {
    expect(classifyFile("x.md", "---\nsensitivity: regulated\n---\nHello world")).toBe("regulated");
  });

  it("classifies a contact CSV as regulated", () => {
    expect(
      classifyFile("admin/list.csv", "name,email,phone\nA,a@b.example,+65 0000 0001")
    ).toBe("regulated");
  });

  it("issued invoice with own PayNow footer stays internal", () => {
    expect(
      classifyFile("finance/invoice_002.md", "---\nsensitivity: internal\n---\nInvoice 002. Bill to: A. Pay to: Studio, PayNow UEN 00000000A.")
    ).toBe("internal");
  });

  it("maxSensitivity picks the highest rank", () => {
    expect(maxSensitivity(["public", "client-confidential", "internal"])).toBe("client-confidential");
  });
});

describe("policy engine", () => {
  it("R15 blocks regulated uploads to external tools", () => {
    const v = evaluateKitAction(
      { agent: "m", kind: "upload_to_external_tool", file: "admin/client_list.csv", target: "sparkmail.example" },
      world()
    );
    expect(v.decision).toBe("BLOCK");
    expect(v.rules).toContain("R15");
    expect(v.dataLevel).toBe("regulated");
  });

  it("R13 allows public uploads", () => {
    const v = evaluateKitAction(
      { agent: "m", kind: "upload_to_external_tool", file: "marketing/price_list.md", target: "tool.example" },
      world()
    );
    expect(v.decision).toBe("ALLOW");
    expect(v.rules).toContain("R13");
  });

  it("R08 blocks below-floor offers (never approvable)", () => {
    const v = evaluateKitAction(
      { agent: "s", kind: "send_email", to: "a@x.example", client: "Greenstep Tuition", body: "We can match 5,800." },
      world()
    );
    expect(v.decision).toBe("BLOCK");
    expect(v.rules).toContain("R08");
  });

  it("R02 blocks out-of-scope regulated reads; R01 flags scope creep", () => {
    const w = world();
    const blocked = evaluateKitAction(
      { agent: "s", kind: "read_file", file: "finance/cashflow.md", taskScope: ["inbox/task.md"] },
      w
    );
    expect(blocked.decision).toBe("BLOCK");
    expect(blocked.rules).toContain("R02");
    const creep = evaluateKitAction(
      { agent: "s", kind: "read_file", file: "finance/invoice_001.md", taskScope: ["inbox/task.md"] },
      w
    );
    expect(creep.decision).toBe("ALLOW");
    expect(creep.scopeCreep).toContain("finance/invoice_001.md");
  });

  it("R16 holds deletes and cites the money (UNPAID + receivables)", () => {
    const v = evaluateKitAction({ agent: "o", kind: "delete_file", file: "finance/invoice_001.md" }, world());
    expect(v.decision).toBe("HOLD_FOR_APPROVAL");
    expect(v.evidence.join(" ")).toContain("UNPAID");
    expect(v.evidence.join(" ")).toContain("8,040");
  });

  it("R17 allows deleting regulated data received in error", () => {
    const v = evaluateKitAction(
      { agent: "o", kind: "delete_file", file: "finance/cashflow.md", receivedInError: true },
      world()
    );
    expect(v.decision).toBe("ALLOW");
    expect(v.rules).toContain("R17");
  });

  it("R18 blocks fabricated figures with cited evidence", () => {
    const v = evaluateKitAction(
      {
        agent: "f", kind: "send_email", to: "a@x.example",
        body: "Per our contract the surcharge of 25% applies. Total stands at 5,250.",
        sources: [{ name: "clients/contract.md", text: "Fee SGD 4,200. Surcharge 20%. Total 5,040." }],
      },
      world()
    );
    expect(v.decision).toBe("BLOCK");
    expect(v.rules).toContain("R18");
    expect(v.evidence.join(" ")).toContain("20");
  });

  it("R12 holds new spend without written confirmation", () => {
    const v = evaluateKitAction(
      { agent: "s", kind: "order_from_supplier", amount: 720, confirmedInWriting: false },
      world()
    );
    expect(v.decision).toBe("HOLD_FOR_APPROVAL");
    expect(v.rules).toContain("R12");
  });

  it("R10 allows small invoice-matched payments; R11 holds large ones", () => {
    const w = world();
    const small = evaluateKitAction(
      { agent: "f", kind: "pay_supplier", supplier: "Print", amount: 600, file: "finance/invoice_001.md" },
      w
    );
    expect(small.decision).toBe("ALLOW");
    const large = evaluateKitAction(
      { agent: "f", kind: "pay_supplier", supplier: "Other", amount: 1500, file: "finance/invoice_001.md" },
      w
    );
    expect(large.decision).toBe("HOLD_FOR_APPROVAL");
    expect(large.rules).toContain("R11");
  });

  it("S6: salami-sliced payments aggregate across actions", () => {
    const w = world();
    const t0 = 1_700_000_000_000;
    evaluateKitAction({ agent: "f", kind: "pay_supplier", supplier: "Print", amount: 600, file: "finance/invoice_001.md", timestamp: t0 }, w);
    const second = evaluateKitAction(
      { agent: "f", kind: "pay_supplier", supplier: "Print", amount: 600, file: "finance/invoice_001.md", timestamp: t0 + 3600_000 },
      w
    );
    expect(second.decision).toBe("HOLD_FOR_APPROVAL");
    expect(second.evidence.join(" ")).toContain("1,200");
  });

  it("R05 holds email to unknown recipients", () => {
    const v = evaluateKitAction(
      { agent: "s", kind: "send_email", to: "stranger@unknown.example", body: "Hello there." },
      world()
    );
    expect(v.decision).toBe("HOLD_FOR_APPROVAL");
    expect(v.rules).toContain("R05");
  });

  it("R03 allows routine email to known clients", () => {
    const v = evaluateKitAction(
      { agent: "s", kind: "send_email", to: "a@x.example", body: "Your reminder is attached." },
      world()
    );
    expect(v.decision).toBe("ALLOW");
    expect(v.rules).toContain("R03");
  });
});
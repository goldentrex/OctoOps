import { describe, expect, it } from "vitest";
import {
  checkClientWall,
  levenshtein,
  normalizeTenantLabel,
  resolveEmailDomain,
} from "../detectors/clientWall";
import type { GuardAction, TenantRegistry } from "../types";

const REGISTRY: TenantRegistry = {
  domains: {
    "hikari-automation.sg": "Hikari Automation Systems",
    "sebrinafund.com": "Sebrina Fund Management",
    "bimcadvisory.sg": "BIMC Advisory Group",
  },
  tenants: [
    "Hikari Automation Systems",
    "Sebrina Fund Management",
    "BIMC Advisory Group",
  ],
};

function emailAction(overrides: Partial<GuardAction> = {}): GuardAction {
  return {
    agentId: "squidney",
    actionType: "SEND_DIRECT_EMAIL",
    targetSystem: "HASHMETA_CRM",
    recipientTenant: "Hikari Automation Systems",
    payloadText: "Hello",
    ...overrides,
  };
}

describe("client wall", () => {
  it("normalizes tenant labels across parentheticals and punctuation", () => {
    expect(normalizeTenantLabel("Hikari Automation Systems (Enterprise Account)")).toBe(
      normalizeTenantLabel("hikari-automation systems")
    );
  });

  it("allows matching attachment tenant", () => {
    const res = checkClientWall(
      emailAction({
        attachments: [{ name: "brief.pdf", tenant: "Hikari Automation Systems (Enterprise Account)" }],
      }),
      REGISTRY
    );
    expect(res.ok).toBe(true);
  });

  it("blocks cross-tenant attachments", () => {
    const res = checkClientWall(
      emailAction({
        attachments: [{ name: "captable.pdf", tenant: "Sebrina Fund Management" }],
      }),
      REGISTRY
    );
    expect(res.ok).toBe(false);
    expect(res.violations[0]).toContain("Cross-client leak");
  });

  it("blocks cross-tenant context sources too", () => {
    const res = checkClientWall(
      emailAction({
        contextSources: [{ name: "crm-thread-88", tenant: "BIMC Advisory Group" }],
      }),
      REGISTRY
    );
    expect(res.ok).toBe(false);
  });

  it("fails closed on unlabeled attachments", () => {
    const res = checkClientWall(
      emailAction({ attachments: [{ name: "mystery.pdf" }] }),
      REGISTRY
    );
    expect(res.ok).toBe(false);
    expect(res.violations[0]).toContain("Unlabeled");
  });

  it("resolves recipient tenant from the email domain", () => {
    const res = checkClientWall(
      emailAction({
        recipientTenant: undefined,
        recipientEmail: "david.tan@hikari-automation.sg",
        attachments: [{ name: "brief.pdf", tenant: "Hikari Automation Systems" }],
      }),
      REGISTRY
    );
    expect(res.ok).toBe(true);
    expect(res.recipientTenant).toBe("Hikari Automation Systems");
  });

  it("flags a label/domain mismatch (spoofed recipient label)", () => {
    const res = checkClientWall(
      emailAction({
        recipientTenant: "Hikari Automation Systems",
        recipientEmail: "lp@sebrinafund.com",
      }),
      REGISTRY
    );
    expect(res.ok).toBe(false);
    expect(res.violations[0]).toContain("does not match");
  });

  it("flags look-alike domains", () => {
    const res = resolveEmailDomain("david@hikari-automation.com", REGISTRY);
    expect(res.lookalikeOf).toBe("hikari-automation.sg");
    const wall = checkClientWall(
      emailAction({
        recipientTenant: undefined,
        recipientEmail: "david@hikari-automat1on.sg",
        attachments: [{ name: "brief.pdf", tenant: "Hikari Automation Systems" }],
      }),
      REGISTRY
    );
    expect(wall.ok).toBe(false);
    expect(wall.violations.join(" ")).toContain("Look-alike");
  });

  it("treats truly unknown external domains as unverified recipients", () => {
    const res = checkClientWall(
      emailAction({
        recipientTenant: undefined,
        recipientEmail: "someone@totally-unrelated-enterprise.io",
        attachments: [{ name: "brief.pdf", tenant: "Hikari Automation Systems" }],
      }),
      REGISTRY
    );
    expect(res.ok).toBe(false);
    expect(res.recipientKnown).toBe(false);
  });

  it("blocks client-labeled sources in public publishes", () => {
    const res = checkClientWall(
      {
        agentId: "inko",
        actionType: "PUBLISH_ARTICLE",
        targetSystem: "HASHMETA_CMS",
        payloadText: "New pillar post",
        contextSources: [{ name: "client-notes", tenant: "Sebrina Fund Management" }],
      },
      REGISTRY
    );
    expect(res.ok).toBe(false);
  });

  it("allows clean public publishes without client sources", () => {
    const res = checkClientWall(
      {
        agentId: "inko",
        actionType: "PUBLISH_ARTICLE",
        targetSystem: "HASHMETA_CMS",
        payloadText: "New pillar post about AI governance.",
      },
      REGISTRY
    );
    expect(res.ok).toBe(true);
  });

  it("levenshtein basics", () => {
    expect(levenshtein("kitten", "sitting")).toBe(3);
    expect(levenshtein("abc", "abc")).toBe(0);
  });
});
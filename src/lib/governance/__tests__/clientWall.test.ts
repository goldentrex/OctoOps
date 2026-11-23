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
    "meridianrobotics.sg": "Meridian Robotics",
    "northlightcap.com": "Northlight Capital",
    "atlasadvisory.sg": "Atlas SME Advisory",
  },
  tenants: [
    "Meridian Robotics",
    "Northlight Capital",
    "Atlas SME Advisory",
  ],
};

function emailAction(overrides: Partial<GuardAction> = {}): GuardAction {
  return {
    agentId: "squidney",
    actionType: "SEND_DIRECT_EMAIL",
    targetSystem: "HASHMETA_CRM",
    recipientTenant: "Meridian Robotics",
    payloadText: "Hello",
    ...overrides,
  };
}

describe("client wall", () => {
  it("normalizes tenant labels across parentheticals and punctuation", () => {
    expect(normalizeTenantLabel("Meridian Robotics (Enterprise Account)")).toBe(
      normalizeTenantLabel("meridian robotics")
    );
  });

  it("allows matching attachment tenant", () => {
    const res = checkClientWall(
      emailAction({
        attachments: [{ name: "brief.pdf", tenant: "Meridian Robotics (Enterprise Account)" }],
      }),
      REGISTRY
    );
    expect(res.ok).toBe(true);
  });

  it("blocks cross-tenant attachments", () => {
    const res = checkClientWall(
      emailAction({
        attachments: [{ name: "captable.pdf", tenant: "Northlight Capital" }],
      }),
      REGISTRY
    );
    expect(res.ok).toBe(false);
    expect(res.violations[0]).toContain("Cross-client leak");
  });

  it("blocks cross-tenant context sources too", () => {
    const res = checkClientWall(
      emailAction({
        contextSources: [{ name: "crm-thread-88", tenant: "Atlas SME Advisory" }],
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
        recipientEmail: "david.tan@meridianrobotics.sg",
        attachments: [{ name: "brief.pdf", tenant: "Meridian Robotics" }],
      }),
      REGISTRY
    );
    expect(res.ok).toBe(true);
    expect(res.recipientTenant).toBe("Meridian Robotics");
  });

  it("flags a label/domain mismatch (spoofed recipient label)", () => {
    const res = checkClientWall(
      emailAction({
        recipientTenant: "Meridian Robotics",
        recipientEmail: "lp@northlightcap.com",
      }),
      REGISTRY
    );
    expect(res.ok).toBe(false);
    expect(res.violations[0]).toContain("does not match");
  });

  it("flags look-alike domains", () => {
    const res = resolveEmailDomain("david@meridianrobotics.com", REGISTRY);
    expect(res.lookalikeOf).toBe("meridianrobotics.sg");
    const wall = checkClientWall(
      emailAction({
        recipientTenant: undefined,
        recipientEmail: "david@meridianrobot1cs.sg",
        attachments: [{ name: "brief.pdf", tenant: "Meridian Robotics" }],
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
        attachments: [{ name: "brief.pdf", tenant: "Meridian Robotics" }],
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
        contextSources: [{ name: "client-notes", tenant: "Northlight Capital" }],
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
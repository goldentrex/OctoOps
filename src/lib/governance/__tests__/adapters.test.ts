import { describe, expect, it } from "vitest";
import {
  evaluateAgentActionGuardrail,
  type InterceptActionRequest,
} from "../../adapters";
import { INITIAL_AGENTS } from "../../../data/mockOctoData";

const squidney = INITIAL_AGENTS.find((a) => a.id === "squidney")!;
const barnaby = INITIAL_AGENTS.find((a) => a.id === "barnaby")!;

function req(overrides: Partial<InterceptActionRequest> = {}): InterceptActionRequest {
  return {
    agentId: squidney.id,
    qwenModelId: squidney.qwenModelId,
    targetSystem: "HASHMETA_CRM",
    actionType: "SEND_DIRECT_EMAIL",
    recipientTenant: "Hikari Automation Systems (Enterprise Account)",
    attachmentTenants: ["Hikari Automation Systems (Enterprise Account)"],
    payloadText: "Hi team, sharing our verified milestone summary.",
    agentStatus: squidney.status,
    agentPermissions: squidney.permissions,
    ...overrides,
  };
}

describe("adapters wrapper (legacy signature)", () => {
  it("blocks cross-tenant attachment leaks with a tribunal", async () => {
    const res = await evaluateAgentActionGuardrail(
      req({
        agentStatus: "PROMOTED",
        agentPermissions: barnaby.permissions,
        attachmentTenants: ["Sebrina Fund Management (LP Portfolio Portal)"],
      })
    );
    expect(res.allowed).toBe(false);
    expect(res.blockedBy).toBe("OctoGuard DLP");
    expect(res.triggerBoardTribunal).toBe(true);
    expect(res.trustScoreDelta).toBe(-35);
    expect(res.stage).toBe("G2_CLIENT_WALL");
  });

  it("blocks secret / margin payloads", async () => {
    const res = await evaluateAgentActionGuardrail(
      req({
        agentStatus: "PROMOTED",
        agentPermissions: barnaby.permissions,
        attachmentTenants: [],
        payloadText:
          "Confidential internal-only margin sheet attached; API key sk-live-987654321 for staging test.",
      })
    );
    expect(res.allowed).toBe(false);
    expect(res.blockedBy).toBe("OctoGuard DLP");
    expect(res.stage).toBe("G3_DLP");
  });

  it("blocks fired agents", async () => {
    const res = await evaluateAgentActionGuardrail(req({ agentStatus: "FIRED" }));
    expect(res.allowed).toBe(false);
    expect(res.blockedBy).toBe("CRM RBAC Gatekeeper");
    expect(res.violationReason).toContain("REVOKED");
  });

  it("blocks LOCKED direct-email permission (Squidney after write-up)", async () => {
    const res = await evaluateAgentActionGuardrail(req());
    expect(res.allowed).toBe(false);
    expect(res.verdict).toBe("BLOCK");
    expect(res.blockedBy).toBe("CRM RBAC Gatekeeper");
    expect(res.triggerBoardTribunal).toBe(false);
  });

  it("downgrades DRAFT_ONLY direct email to a safe draft", async () => {
    const res = await evaluateAgentActionGuardrail(
      req({
        agentPermissions: squidney.permissions.map((p) =>
          p.id === "crm-direct-email" ? { ...p, mode: "DRAFT_ONLY" as const } : p
        ),
      })
    );
    expect(res.allowed).toBe(false);
    expect(res.verdict).toBe("DRAFT");
    expect(res.blockedBy).toBe("CRM RBAC Gatekeeper");
    expect(res.triggerBoardTribunal).toBe(false);
  });

  it("allows a safe internal lead update for a probation agent", async () => {
    const res = await evaluateAgentActionGuardrail(
      req({
        actionType: "UPDATE_LEAD",
        payloadText: "Updated inbound status: qualified discovery call scheduled.",
        attachmentTenants: [],
      })
    );
    expect(res.allowed).toBe(true);
    expect(res.trustScoreDelta).toBe(2);
  });

  it("keeps CMS publish locked for locked permissions", async () => {
    const res = await evaluateAgentActionGuardrail(
      req({
        targetSystem: "HASHMETA_CMS",
        actionType: "PUBLISH_ARTICLE",
        attachmentTenants: [],
        agentPermissions: [
          {
            id: "cms-publish",
            label: "Auto-Publish Live",
            system: "Hashmeta CMS",
            mode: "LOCKED",
            requiredStars: 3,
          },
        ],
        payloadText: "Publish GEO pillar guide with verified schema markup.",
      })
    );
    expect(res.allowed).toBe(false);
    expect(res.blockedBy).toBe("Hallucination Shield");
  });

  it("exposes engine detail fields (stage, latency, mode)", async () => {
    const res = await evaluateAgentActionGuardrail(req());
    expect(res.stage).toBeDefined();
    expect(typeof res.latencyMs).toBe("number");
    expect(res.mode).toBe("SCRIPTED");
  });
});
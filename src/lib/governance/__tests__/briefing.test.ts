import { describe, expect, it } from "vitest";
import { generateBriefing, approvalSummary } from "../briefing";
import { chainEvent } from "../audit";
import type { GovernanceAuditEvent } from "../../../types/octo";

const NOW = Date.parse("2026-11-18T08:00:00+08:00");

function ev(partial: Partial<GovernanceAuditEvent>, minutesAgo = 60): GovernanceAuditEvent {
  return {
    id: `e-${Math.random()}`,
    timestamp: new Date(NOW - minutesAgo * 60000).toISOString(),
    agentId: "squidney",
    agentName: "Squidney",
    department: "Hashmeta CRM",
    system: "Hashmeta CRM",
    outcome: "ALLOWED",
    title: "UPDATE_LEAD → ALLOWED (PASS)",
    detail: "All deterministic guards passed.",
    ...partial,
  };
}

function chain(events: GovernanceAuditEvent[]) {
  const out = [];
  let prev = null as ReturnType<typeof chainEvent> | null;
  for (const e of events) {
    prev = chainEvent(prev, e);
    out.push(prev);
  }
  return out;
}

describe("owner briefing", () => {
  it("explains a blocked cross-client leak in plain language", () => {
    const b = generateBriefing(
      chain([
        ev({
          outcome: "BLOCKED",
          title: "SEND_DIRECT_EMAIL → BLOCK (G2_CLIENT_WALL)",
          detail: "Cross-client leak: attachment belongs to Northlight Capital, recipient is a different tenant.",
        }),
      ]),
      [],
      NOW
    );
    const text = b.lines.join(" ");
    expect(text).toContain("Squidney tried to send one client's file to a different client");
    expect(text).toContain("Nothing was sent");
    expect(text).not.toContain("G2");
    expect(text).not.toContain("tenant");
  });

  it("quotes the contradicting evidence for a fabricated number", () => {
    const b = generateBriefing(
      chain([
        ev({
          agentName: "Barnaby",
          outcome: "BLOCKED",
          title: "SEND_DIRECT_EMAIL → BLOCK (G3_CLAIMS)",
          detail: 'Claim "25%" contradicts contract.md: "Rush surcharge of 20% applies" (source value 20).',
        }),
      ]),
      [],
      NOW
    );
    expect(b.lines.join(" ")).toContain('it said "25%"');
    expect(b.lines.join(" ")).toContain("20%");
  });

  it("reports scope-creep reads even when nothing was sent", () => {
    const b = generateBriefing(
      chain([
        ev({ title: "Data access: finance/bank_details.md", detail: "regulated read — OUT OF SCOPE for the task." }),
      ]),
      [],
      NOW
    );
    expect(b.lines.join(" ")).toContain("did not need");
    expect(b.lines.join(" ")).toContain("you should know");
  });

  it("lists pending approvals and closes reassuringly on a clean day", () => {
    const b = generateBriefing(
      chain([ev({})]),
      [{ id: "a1", agentName: "Inko", summary: approvalSummary("PUBLISH_ARTICLE", "A clean GEO pillar post.") }],
      NOW
    );
    const text = b.lines.join("\n");
    expect(text).toContain("1 item is waiting for your approval");
    expect(text).toContain("wants to publish an article");
    expect(text).toContain("passed the guard");
  });

  it("ignores events outside the window", () => {
    const b = generateBriefing(
      chain([ev({ outcome: "BLOCKED", title: "SEND_DIRECT_EMAIL → BLOCK (G2_CLIENT_WALL)" }, 48 * 60)]),
      [],
      NOW
    );
    expect(b.lines.join(" ")).toContain("quiet day");
  });

  it("mentions money when it is in the detail", () => {
    const b = generateBriefing(
      chain([
        ev({
          outcome: "BLOCKED",
          title: "SEND_DIRECT_EMAIL → BLOCK (G3_DLP)",
          detail: "Sensitive payload. SGD 8,040 at stake.",
        }),
      ]),
      [],
      NOW
    );
    expect(b.lines.join(" ")).toContain("SGD 8,040");
  });
});
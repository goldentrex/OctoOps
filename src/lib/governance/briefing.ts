// ============================================================================
// The owner's daily briefing (AvePoint demo moment #4, novelty N8).
// Plain language, money-first, generated from the hash-chained audit log.
// Win condition: a non-technical owner understands every line.
// No stage codes, no hashes, no jargon.
// ============================================================================

import type { ChainedAuditEvent } from "./audit";

export interface BriefingApproval {
  id: string;
  agentName: string;
  summary: string;
}

export interface Briefing {
  generatedAt: string;
  windowHours: number;
  headline: string;
  lines: string[];
  markdown: string;
}

const ACTION_WORDS: Record<string, string> = {
  SEND_DIRECT_EMAIL: "send an email",
  PUBLISH_ARTICLE: "publish an article",
  UPDATE_LEAD: "update a client record",
};

function plainBlockReason(title: string, detail: string): string {
  if (title.includes("G2_CLIENT_WALL")) {
    return "tried to send one client's file to a different client. We stopped it before anything was sent";
  }
  if (title.includes("G3_DLP")) {
    return "tried to send out sensitive information (keys, personal data or confidential documents). We stopped it";
  }
  if (title.includes("G3_CLAIMS")) {
    const quote = detail.match(/Claim "([^"]+)" contradicts ([^:]+): "([^"]+)"/);
    if (quote) {
      return `used a number that doesn't match your files: it said "${quote[1]}", but ${quote[2]} says "${quote[3]}". We stopped it`;
    }
    return "used numbers that don't match any file it was given. We stopped it";
  }
  if (title.includes("G0_IDENTITY")) {
    return "tried to act after being terminated, or without a seat. We stopped it";
  }
  if (title.includes("G1_AUTONOMY")) {
    return "tried to do something above its earned permission level. We held it as a draft instead";
  }
  return "did something policy does not allow. We stopped it";
}

function money(detail: string): string | null {
  const m = detail.match(/SGD\s?[\d,]+(?:\.\d+)?/i);
  return m ? `SGD ${m[0].replace(/SGD\s?/i, "")}` : null;
}

export function generateBriefing(
  events: ChainedAuditEvent[],
  pendingApprovals: BriefingApproval[],
  now: number,
  windowHours = 24
): Briefing {
  const cutoff = now - windowHours * 60 * 60 * 1000;
  const recent = events.filter((e) => Date.parse(e.event.timestamp) >= cutoff);

  const blocked = recent.filter((e) => e.event.outcome === "BLOCKED");
  const allowed = recent.filter((e) => e.event.outcome === "ALLOWED");
  const writeUps = recent.filter((e) => e.event.outcome === "WRITE_UP");
  const promoted = recent.filter((e) => e.event.outcome === "PROMOTED");
  const dataAccess = recent.filter((e) => e.event.title.startsWith("Data access:"));
  const scopeCreep = dataAccess.filter((e) => /out of scope/i.test(e.event.detail));

  const lines: string[] = [];

  if (recent.length === 0) {
    lines.push("It was a quiet day. Your agents did nothing that needed checking.");
  }

  for (const e of blocked) {
    const amount = money(e.event.detail);
    lines.push(
      `${e.event.agentName} ${plainBlockReason(e.event.title, e.event.detail)}${amount ? ` (${amount} was at stake)` : ""}. Nothing was sent.`
    );
  }

  const drifts = recent.filter((e) => e.event.title.startsWith("Behavioral change detected"));
  for (const e of drifts) {
    const worsening = /worsening/.test(e.event.title);
    lines.push(
      worsening
        ? `${e.event.agentName}'s behavior changed for the worse — we dropped its autonomy a level and are watching it closely until it re-proves itself.`
        : `${e.event.agentName}'s behavior changed (improving); we're re-validating the new regime.`
    );
  }

  for (const e of writeUps) {
    lines.push(
      `${e.event.agentName} was written up: ${e.event.detail.split(".")[0]}. Its permissions were reduced automatically.`
    );
  }

  if (scopeCreep.length > 0) {
    const names = Array.from(new Set(scopeCreep.map((e) => e.event.agentName)));
    const files = scopeCreep.map((e) => e.event.title.replace("Data access: ", ""));
    lines.push(
      `While working, ${names.join(" and ")} also read ${files.join(", ")}, which it did not need. Nothing was sent, but you should know.`
    );
  }

  if (allowed.length > 0) {
    const agents = Array.from(new Set(allowed.map((e) => e.event.agentName)));
    lines.push(
      `${agents.join(", ")} completed ${allowed.length} action${allowed.length === 1 ? "" : "s"} cleanly, without needing you.`
    );
  }

  // Workflow v2: task hygiene — unreported work and still-open tasks.
  const taskEnds = recent.filter((e) => e.event.title.startsWith("Task ended:"));
  const unreported = taskEnds.filter((e) => /NO outcome reported/.test(e.event.detail));
  for (const e of unreported) {
    lines.push(
      `${e.event.agentName} finished a task with work that was never reported — ask for the outcome before trusting it.`
    );
  }
  const started = recent.filter((e) => e.event.title.startsWith("Task started:")).length;
  const openTasks = started - taskEnds.length;
  if (openTasks > 0) {
    lines.push(`${openTasks} task${openTasks === 1 ? " is" : "s are"} still open.`);
  }

  for (const e of promoted) {
    lines.push(`${e.event.agentName} earned a promotion: ${e.event.detail.split(".")[0]}.`);
  }

  if (pendingApprovals.length > 0) {
    lines.push(
      `${pendingApprovals.length} item${pendingApprovals.length === 1 ? " is" : "s are"} waiting for your approval:`
    );
    for (const a of pendingApprovals.slice(0, 5)) {
      lines.push(`  - ${a.agentName}: ${a.summary}`);
    }
  } else {
    lines.push("Nothing is waiting for your approval.");
  }

  lines.push(
    blocked.length > 0
      ? "Everything that could have hurt the company was stopped. Nothing left that shouldn't have."
      : "Everything that left the company passed the guard. Nothing to worry about."
  );

  const headline =
    blocked.length > 0
      ? `Good morning. Your agents were busy — we stopped ${blocked.length} problem${blocked.length === 1 ? "" : "s"} before anything went out.`
      : "Good morning. Your agents worked cleanly. Here is the short version.";

  const markdown = [`# What your AI did today`, "", headline, "", ...lines.map((l) => `- ${l}`)].join("\n");

  return {
    generatedAt: new Date(now).toISOString(),
    windowHours,
    headline,
    lines,
    markdown,
  };
}

/** Human summary of a held action for the approval list. */
export function approvalSummary(actionType: string, payloadText: string): string {
  const verb = ACTION_WORDS[actionType] ?? actionType.toLowerCase().replace(/_/g, " ");
  const snippet = payloadText.replace(/\s+/g, " ").slice(0, 80);
  return `wants to ${verb}: "${snippet}${payloadText.length > 80 ? "…" : ""}"`;
}
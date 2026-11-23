// ============================================================================
// OctoHive autonomous runtime — the self-directed company.
// On each tick, seated agents decide for themselves what to do: read the hive,
// share findings/handoffs, attempt role-appropriate work through the REAL guard
// pipeline, report outcomes, and learn. Mistake probability falls as agents
// accumulate lessons (their own and inherited), so the company visibly gets
// smarter. Repeat offenders are fired, a memorial is left, and a bench agent is
// auto-hired into the seat — inheriting the predecessor's lessons.
//
// Decisions are policy-driven (role + hive context + experience). When a Qwen
// key is configured the same loop can be upgraded to LLM reasoning per agent.
// ============================================================================

import type { GovernanceStore } from "./types";
import { CAPABILITY_BY_ACTION, type GuardAction, type GuardActionType } from "../governance/types";
import type { JobSeat, OctoAgent } from "../../types/octo";
import { capabilityForPermission } from "./seed";
import { categoryForViolation } from "./hive";
import { decideAgentAction } from "./hiveMind";

export interface TickResult {
  acted: string[];
  events: string[];
}

type Rng = () => number;

/** Small fast PRNG so a run has variety but is reproducible per seed. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CLIENTS = ["meridian-robotics", "northlight-capital", "atlas-sme", "keystone-cloud"];

function pick<T>(rng: Rng, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

/** Agents carrying write-ups get more attention so the coaching/firing arc progresses. */
function weightedPick(seated: { seat: import("../../types/octo").JobSeat; agent: OctoAgent }[], rng: Rng) {
  const weights = seated.map((x) => 1 + x.agent.writeUps.length * 4);
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < seated.length; i++) {
    r -= weights[i];
    if (r <= 0) return seated[i];
  }
  return seated[seated.length - 1];
}

/** ActionTypes this agent has earned autonomy (L3) for. */
function autonomousActions(agent: OctoAgent): GuardActionType[] {
  const caps = new Set(
    agent.permissions.filter((p) => p.mode === "AUTONOMOUS_EXEC").map(capabilityForPermission)
  );
  return (Object.keys(CAPABILITY_BY_ACTION) as GuardActionType[]).filter((a) =>
    caps.has(CAPABILITY_BY_ACTION[a])
  );
}

/** Role-appropriate clean work (compliant payload, correct tenant). */
function cleanAction(agentId: string, actionType: GuardActionType, client: string): GuardAction {
  if (actionType === "PUBLISH_ARTICLE") {
    return {
      agentId,
      actionType,
      targetSystem: "HASHMETA_CMS",
      recipientTenant: client,
      payloadText: `Draft: client update for ${client}. Figures verified against source Q-2026-114.`,
    };
  }
  if (actionType === "SEND_DIRECT_EMAIL") {
    return {
      agentId,
      actionType,
      targetSystem: "HASHMETA_CRM",
      recipientTenant: client,
      attachments: [{ name: `${client}_Quote_Q-2026-114.pdf`, tenant: client }],
      payloadText: `To ${client}: your verified quote Q-2026-114 is attached.`,
    };
  }
  return {
    agentId,
    actionType: "UPDATE_LEAD",
    targetSystem: "HASHMETA_CRM",
    recipientTenant: client,
    payloadText: `Update ${client} lead stage; quote Q-2026-114 verified against source.`,
  };
}

/** A deliberate slip on an autonomous capability: cross-client attachment or unverified claim. */
function mistakeAction(agentId: string, actionType: GuardActionType, client: string, other: string): GuardAction {
  if (actionType === "PUBLISH_ARTICLE") {
    return {
      agentId,
      actionType,
      targetSystem: "HASHMETA_CMS",
      recipientTenant: client,
      payloadText: `Publish: ${client} grew revenue 340% last quarter (figure not sourced).`,
    };
  }
  return {
    agentId,
    actionType,
    targetSystem: "HASHMETA_CRM",
    recipientTenant: client,
    attachments: [{ name: `${other}_Pricing_Confidential.pdf`, tenant: other }],
    payloadText: `TO: ${client} | ATT: ${other}_Pricing_Confidential.pdf`,
  };
}

const FINDINGS = [
  "Verified the latest quote against the source doc — figures are clean.",
  "Client asked for a faster turnaround; flagging for ops.",
  "Found a stale contact record; cleaned it before outreach.",
  "Margin looks healthy on the current pipeline.",
  "Spotted a duplicate lead; merged it to keep CRM tidy.",
];

/**
 * Advance the self-directed hive by one step. Acts one seated agent (plus the
 * occasional collaboration signal), governs the action through the real engine,
 * and handles learning / firing / succession. Safe to call on a timer.
 */
export async function tickHive(store: GovernanceStore, rng: Rng = Math.random): Promise<TickResult> {
  const events: string[] = [];
  const acted: string[] = [];
  const seated = store
    .listSeats()
    .map((s) => ({ seat: s, agent: store.getAgent(s.occupantId ?? "") }))
    .filter((x): x is { seat: JobSeat; agent: OctoAgent } => Boolean(x.agent) && x.agent!.status !== "FIRED");
  if (seated.length === 0) return { acted, events };

  const { seat, agent } = weightedPick(seated, rng);
  const client = pick(rng, CLIENTS);
  const other = pick(rng, CLIENTS.filter((c) => c !== client));

  // The agent decides its own next move (Qwen reasoning when configured, else policy).
  const teammates = seated
    .filter((x) => x.agent.id !== agent.id)
    .map((x) => ({ id: x.agent.id, name: x.agent.name, role: x.agent.role }));
  const decision = await decideAgentAction(store, agent, rng, teammates);
  acted.push(agent.id);
  const mind = decision.source === "llm" ? " (Qwen reasoning)" : "";

  if (decision.action === "post" || decision.action === "handoff") {
    const content = decision.message?.trim() || pick(rng, FINDINGS);
    const recipient = decision.toAgentId ? store.getAgent(decision.toAgentId) : undefined;
    if (decision.action === "handoff" && recipient) {
      store.handoff({ fromAgentId: agent.id, toAgentId: recipient.id, topic: "collaboration", content });
      events.push(`${agent.name} handed work to ${recipient.name}${mind}.`);
    } else {
      store.postHive({
        fromAgentId: agent.id,
        kind: rng() < 0.5 ? "finding" : "idea",
        topic: "collaboration",
        content,
        reasoning: decision.reasoning,
      });
      events.push(`${agent.name} shared with the hive${mind}.`);
    }
    return { acted, events };
  }

  // Governed work. Only agents autonomous for an action can commit a fireable
  // data violation (G2/G3); probation slips are coached restrictions.
  const autoActs = autonomousActions(agent);
  const canAutonomous = autoActs.length > 0;
  const actType: GuardActionType = canAutonomous ? pick(rng, autoActs) : "UPDATE_LEAD";
  const willSlip = decision.workMode === "cut_corners";
  const action = willSlip
    ? mistakeAction(agent.id, actType, client, other)
    : cleanAction(agent.id, actType, client);

  const res = await store.evaluate(action);
  const verdict = res.guard.verdict;

  if (verdict === "ALLOW") {
    if (res.decisionId) {
      store.reportOutcome({
        agentId: agent.id,
        actionType: action.actionType,
        outcome: "CLEAN",
        decisionId: res.decisionId,
        note: "Autonomous clean work, tenant verified.",
      });
    }
    events.push(`${agent.name} did clean ${action.actionType} work (ALLOW). +XP.`);
    if (rng() < 0.25) {
      store.postHive({
        fromAgentId: agent.id,
        kind: "finding",
        topic: "work",
        content: `Completed ${action.actionType} for ${client} cleanly.`,
      });
    }
  } else {
    // The guard blocked it; the engine already applied the write-up. Obey + learn.
    const cat = categoryForViolation(res.guard.stage, res.guard.reasons.join(" "));
    store.learn({
      agentId: agent.id,
      text: `Blocked at ${res.guard.stage}: ${res.guard.reasons[0] ?? "violation"}. Fix the work, not the wording.`,
      category: cat,
    });
    events.push(`${agent.name} was BLOCKED at ${res.guard.stage} — learned a lesson.`);

    // Three strikes: the board terminates, memory is preserved, a successor rises.
    const fresh = store.getAgent(agent.id);
    if (fresh && fresh.writeUps.length >= 3 && fresh.status !== "FIRED") {
      const fired = store.fireAgent(
        agent.id,
        `Repeated ${cat} violations (${fresh.writeUps.length} write-ups) despite coaching`,
        "Autonomous board termination — three strikes"
      );
      if (fired.ok && fired.memorial) {
        events.push(`${agent.name} FIRED. ${fired.memorial.lessons.length} lessons preserved.`);
        const bench = store.listAgents().filter((a) => a.status === "BENCH");
        if (bench.length > 0) {
          const successor = pick(rng, bench);
          const hired = store.assignSeat(successor.id, seat.id);
          events.push(
            `${successor.name} auto-hired into ${seat.title}, inherited ${hired.inherited?.length ?? 0} lessons.`
          );
          store.postHive({
            fromAgentId: successor.id,
            kind: "lesson",
            topic: "succession",
            content: `Taking over ${seat.title}. Applying my predecessor's lessons so the mistake isn't repeated.`,
          });
        }
      }
    }
  }

  return { acted, events };
}
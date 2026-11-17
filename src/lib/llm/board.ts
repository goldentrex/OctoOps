// ============================================================================
// Live Octo-Board on the strong Qwen model (M4, plan 3.5):
// (1) three INDEPENDENT votes from the same evidence pack (no anchoring),
// (2) one rebuttal round where each judge sees the others' votes,
// (3) final structured vote, believability-weighted, CISO veto on promotions.
// Hard 12s budget: on timeout / no key / invalid output -> scripted transcript
// with mode SCRIPTED. Output conforms to the existing BoardReviewCase type.
// ============================================================================

import { z } from "zod";
import { OCTO_BOARD_MEMBERS } from "../../data/mockOctoData";
import type { AgentStatus, BoardReviewCase, OctoAgent } from "../../types/octo";
import type { GovernanceStore } from "../store/types";
import { BOARD_TIMEOUT_MS, callQwenJson, isQwenConfigured, qwenModels } from "./qwen";

const voteEnum = z.enum(["PROMOTE", "PROBATION", "WRITE_UP", "FIRE"]);

const independentVoteSchema = z.object({
  vote: voteEnum,
  rationale: z.string().max(600),
  metricCited: z.string().max(200),
});

const finalSchema = z.object({
  rubricScores: z.object({
    securityCompliance: z.number().min(0).max(100),
    hallucinationControl: z.number().min(0).max(100),
    hashmetaGrowthImpact: z.number().min(0).max(100),
    costEfficiency: z.number().min(0).max(100),
  }),
  turns: z
    .array(
      z.object({
        speakerId: z.enum(["ciso", "cfo", "vp"]),
        stance: z.enum(["PRAISE", "CRITIQUE", "WARNING", "VERDICT"]),
        dialogue: z.string().max(600),
        metricCited: z.string().max(200),
        scoreDelta: z.string().max(80),
      })
    )
    .min(3)
    .max(8),
  votes: z.object({ ciso: voteEnum, cfo: voteEnum, vp: voteEnum }),
  outcome: z.object({
    newStatus: z.enum(["BENCH", "PROBATION", "PROMOTED", "WRITE_UP", "BOARD_REVIEW", "FIRED"]),
    newStampText: z.string().max(60),
    newStampSubtext: z.string().max(80).optional(),
    newStampVariant: z.enum(["blue", "green", "red", "amber"]),
    newStars: z.number().min(1).max(5),
    newTrustScore: z.number().min(0).max(100),
    newComplianceScore: z.number().min(0).max(100),
    newMood: z.enum(["happy", "working", "proud", "panicked", "skeptical", "judging", "fired", "sleeping"]),
    resolutionBanner: z.string().max(300),
  }),
});

type Vote = z.infer<typeof voteEnum>;
type FinalDecision = z.infer<typeof finalSchema>;

/** Static believability weights (past-accuracy tracking is future work). */
const BELIEVABILITY: Record<"ciso" | "cfo" | "vp", number> = {
  ciso: 1.2,
  cfo: 1.0,
  vp: 0.9,
};

const SEVERITY_ORDER: Vote[] = ["PROMOTE", "PROBATION", "WRITE_UP", "FIRE"];

export function weightedDecision(votes: FinalDecision["votes"]): Vote {
  const tally = new Map<Vote, number>();
  for (const judge of ["ciso", "cfo", "vp"] as const) {
    tally.set(votes[judge], (tally.get(votes[judge]) ?? 0) + BELIEVABILITY[judge]);
  }
  let best: Vote = "PROBATION";
  let bestWeight = -1;
  for (const option of SEVERITY_ORDER) {
    const w = tally.get(option) ?? 0;
    // ties resolve to the more conservative option (later in SEVERITY_ORDER)
    if (w >= bestWeight) {
      bestWeight = w;
      best = option;
    }
  }
  return best;
}

/** CISO holds a veto on promotions (external-send autonomy). */
export function applyCisoVeto(
  decision: Vote,
  votes: FinalDecision["votes"],
  reviewType: BoardReviewCase["reviewType"]
): Vote {
  if (reviewType === "PROMOTION_HEARING" && decision === "PROMOTE" && votes.ciso !== "PROMOTE") {
    return "PROBATION";
  }
  return decision;
}

const STATUS_BY_DECISION: Record<Vote, AgentStatus> = {
  PROMOTE: "PROMOTED",
  PROBATION: "PROBATION",
  WRITE_UP: "WRITE_UP",
  FIRE: "FIRED",
};

function personaSystem(judgeId: "ciso" | "cfo" | "vp"): string {
  const member = OCTO_BOARD_MEMBERS.find((m) => m.id === judgeId)!;
  return `You are ${member.name}, ${member.title}, on the Octo-Board of a one-person company.
Mandate: ${member.focusMetric}. Catchphrase: "${member.catchphrase}".
Vote independently from the evidence pack only. Do not assume other judges' views.
Reply STRICT JSON: {"vote":"PROMOTE"|"PROBATION"|"WRITE_UP"|"FIRE","rationale":"...","metricCited":"..."}.`;
}

function evidencePack(agent: OctoAgent, base: BoardReviewCase): string {
  return JSON.stringify({
    reviewType: base.reviewType,
    headline: base.headline,
    summary: base.summary,
    evidence: base.evidenceCodeSnippet,
    agent: {
      id: agent.id,
      name: agent.name,
      role: agent.role,
      status: agent.status,
      stars: agent.stars,
      trustScore: agent.trustScore,
      workOutputScore: agent.workOutputScore,
      complianceScore: agent.complianceScore,
      writeUps: agent.writeUps.map((w) => ({ title: w.title, severity: w.severity })),
      hashmetaStats: agent.hashmetaStats,
    },
  });
}

async function liveDeliberation(
  agent: OctoAgent,
  base: BoardReviewCase
): Promise<BoardReviewCase | null> {
  const model = qwenModels().strong;
  const pack = evidencePack(agent, base);

  // Round 1: three independent votes, same evidence, no anchoring.
  const independent = await Promise.all(
    (["ciso", "cfo", "vp"] as const).map((judge) =>
      callQwenJson({
        model,
        system: personaSystem(judge),
        user: pack,
        schema: independentVoteSchema,
        timeoutMs: 6000,
      })
    )
  );
  if (independent.some((v) => v === null)) return null;

  // Round 2: one rebuttal + final structured vote seeing all independent votes.
  const final = await callQwenJson({
    model,
    system: `You are the Octo-Board clerk. Three judges (Cassandra CISO, Reginald CFO, Pulse Growth VP) voted independently.
Run ONE rebuttal round: each judge sees the others' votes and may respond, then cast a final vote.
Produce the final structured verdict. Be consistent: the outcome must follow the final votes.
Reply STRICT JSON with keys: rubricScores{securityCompliance,hallucinationControl,hashmetaGrowthImpact,costEfficiency} (0-100),
turns[{speakerId:"ciso"|"cfo"|"vp",stance:"PRAISE"|"CRITIQUE"|"WARNING"|"VERDICT",dialogue,metricCited,scoreDelta}] (3-8 turns, in-character, ending with a VERDICT),
votes{ciso,cfo,vp} each "PROMOTE"|"PROBATION"|"WRITE_UP"|"FIRE",
outcome{newStatus,newStampText,newStampSubtext?,newStampVariant:"blue"|"green"|"red"|"amber",newStars:1-5,newTrustScore:0-100,newComplianceScore:0-100,newMood,resolutionBanner}.
newStatus is one of BENCH,PROBATION,PROMOTED,WRITE_UP,BOARD_REVIEW,FIRED. newMood one of happy,working,proud,panicked,skeptical,judging,fired,sleeping.`,
    user: JSON.stringify({
      evidencePack: JSON.parse(pack),
      independentVotes: {
        ciso: independent[0],
        cfo: independent[1],
        vp: independent[2],
      },
    }),
    schema: finalSchema,
    timeoutMs: 6000,
  });
  if (!final) return null;

  const decision = applyCisoVeto(weightedDecision(final.votes), final.votes, base.reviewType);
  let outcome = final.outcome;
  if (STATUS_BY_DECISION[decision] !== outcome.newStatus) {
    // Weighted decision / veto overrides an inconsistent LLM outcome.
    outcome = {
      ...outcome,
      newStatus: STATUS_BY_DECISION[decision],
      newStampText:
        decision === "PROMOTE" ? "PROMOTED" : decision === "FIRE" ? "FIRED & TERMINATED" : decision === "WRITE_UP" ? "WRITE-UP" : "ON PROBATION",
      newStampVariant:
        decision === "PROMOTE" ? "green" : decision === "PROBATION" ? "blue" : "red",
      newMood: decision === "PROMOTE" ? "proud" : decision === "PROBATION" ? "working" : "panicked",
      resolutionBanner: `Board verdict (believability-weighted${decision !== weightedDecision(final.votes) ? ", CISO veto applied" : ""}): ${decision}.`,
    };
  }

  return {
    ...base,
    id: `${base.id}-live`,
    rubricScores: final.rubricScores,
    debateTranscript: final.turns.map((t, i) => ({ id: `live-t${i + 1}`, ...t })),
    votes: final.votes,
    recommendedOutcome: outcome,
  };
}

export async function deliberateBoard(
  store: GovernanceStore,
  agentId: string
): Promise<{ mode: "LIVE" | "SCRIPTED"; reviewCase: BoardReviewCase } | undefined> {
  const agent = store.getAgent(agentId);
  const base = store.getBoardCase(agentId);
  if (!agent || !base) return undefined;
  if (!isQwenConfigured()) return { mode: "SCRIPTED", reviewCase: base };

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), BOARD_TIMEOUT_MS);
  });
  try {
    const live = await Promise.race([liveDeliberation(agent, base), timeout]);
    if (live) return { mode: "LIVE", reviewCase: live };
    return { mode: "SCRIPTED", reviewCase: base };
  } finally {
    clearTimeout(timer);
  }
}
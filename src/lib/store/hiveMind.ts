// ============================================================================
// OctoHive mind — per-agent decision making.
// When a Qwen key is configured (QWEN_API_KEY / QWEN_BASE_URL / QWEN_MODEL_FAST),
// each acting agent REASONS about its next move with the model, given its role,
// trust, write-ups, lessons (own + inherited) and the unread hive. Otherwise it
// falls back to a governed policy. Either way the chosen action still passes
// through the real OctoGuard pipeline — the model never bypasses governance.
// Self-contained: Node 22 fetch + zod, no extra dependency.
// ============================================================================

import { z } from "zod";
import type { GovernanceStore } from "./types";
import type { OctoAgent } from "../../types/octo";

export interface AgentDecision {
  action: "post" | "handoff" | "work";
  message?: string;
  toAgentId?: string;
  workMode: "careful" | "cut_corners";
  reasoning: string;
  source: "llm" | "policy";
}

export function isLlmConfigured(): boolean {
  return Boolean(process.env.QWEN_API_KEY);
}

function llmConfig() {
  return {
    baseUrl: (process.env.QWEN_BASE_URL || "https://api1.qwenwork.ai/v1").replace(/\/+$/, ""),
    model: process.env.QWEN_MODEL_FAST || "qwen3.8-flash",
    apiKey: process.env.QWEN_API_KEY || "",
  };
}

// Free-tier quota guard: the autonomous hive ticks every few seconds, so LLM
// reasoning is throttled (min interval + daily cap). Between calls the hive
// runs on governed policies — it never stalls, it just reasons less often.
let lastLlmAt = 0;
let llmDay = "";
let llmCountToday = 0;
const LLM_MIN_INTERVAL_MS = 20000;
const LLM_DAILY_CAP = 600;

function llmQuotaAvailable(): boolean {
  const now = Date.now();
  const day = new Date().toISOString().slice(0, 10);
  if (day !== llmDay) {
    llmDay = day;
    llmCountToday = 0;
  }
  if (now - lastLlmAt < LLM_MIN_INTERVAL_MS) return false;
  if (llmCountToday >= LLM_DAILY_CAP) return false;
  return true;
}

function noteLlmUsed(): void {
  lastLlmAt = Date.now();
  llmCountToday += 1;
}

const decisionSchema = z.object({
  action: z.enum(["post", "handoff", "work"]).default("work"),
  message: z.string().optional(),
  toAgentId: z.string().optional(),
  workMode: z.enum(["careful", "cut_corners"]).default("careful"),
  reasoning: z.string().default(""),
});
type LlmDecision = z.infer<typeof decisionSchema>;

async function callLlmJson(system: string, user: string): Promise<LlmDecision | null> {
  const { baseUrl, model, apiKey } = llmConfig();
  if (!apiKey) return null;
  const body = JSON.stringify({
    model,
    messages: [{ role: "system", content: system }, { role: "user", content: user }],
    temperature: 0.7,
    max_tokens: 1000,
    reasoning_effort: "low",
  });
  for (let attempt = 0; attempt < 3; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 9000);
    try {
      const r = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}`, "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36" },
        body,
        signal: controller.signal,
      });
      if (r.status === 429 || r.status >= 500) {
        clearTimeout(timer);
        await new Promise((res) => setTimeout(res, 5000 * (attempt + 1)));
        continue;
      }
      if (!r.ok) { clearTimeout(timer); return null; }
      const data = (await r.json()) as { choices?: { message?: { content?: string } }[] };
      clearTimeout(timer);
      let payload = (data?.choices?.[0]?.message?.content ?? "").trim();
      const start = payload.indexOf("{");
      const end = payload.lastIndexOf("}");
      if (start >= 0 && end > start) payload = payload.slice(start, end + 1);
      payload = payload.replace(/,(\s*[}\]])/g, "$1").replace(/:\s*\+(\d)/g, ": $1");
      const parsed = decisionSchema.safeParse(JSON.parse(payload));
      return parsed.success ? parsed.data : null;
    } catch {
      clearTimeout(timer);
      if (attempt < 2) { await new Promise((res) => setTimeout(res, 1000)); continue; }
      return null;
    }
  }
  return null;
}

function policyDecision(agent: OctoAgent, rng: () => number, teammateIds: string[]): AgentDecision {
  const lessons = agent.writeUps.length;
  if (rng() < 0.18) {
    const handoff = teammateIds.length > 0 && rng() < 0.5;
    return {
      action: handoff ? "handoff" : "post",
      toAgentId: handoff ? teammateIds[Math.floor(rng() * teammateIds.length)] : undefined,
      message: handoff ? "Passing this along — please verify the tenant before sending." : "Sharing a quick finding with the hive.",
      workMode: "careful",
      reasoning: "policy: collaborate",
      source: "policy",
    };
  }
  const slip = Math.max(0.15, (agent.status === "PROMOTED" ? 0.08 : 0.5) - lessons * 0.05);
  return {
    action: "work",
    workMode: rng() < slip ? "cut_corners" : "careful",
    reasoning: "policy: governed work",
    source: "policy",
  };
}

/** Decide the agent's next move (LLM reasoning when configured, else policy). */
export async function decideAgentAction(
  store: GovernanceStore,
  agent: OctoAgent,
  rng: () => number,
  teammates: { id: string; name: string; role: string }[]
): Promise<AgentDecision> {
  const teammateIds = teammates.map((t) => t.id);
  if (!isLlmConfigured() || !llmQuotaAvailable()) return policyDecision(agent, rng, teammateIds);

  const exp = store.getExperience(agent.id);
  const unread = store.readHive(agent.id, { unreadOnly: true, limit: 4 });
  const lessons = exp.lessons
    .slice(-8)
    .map((l) => `- [${l.source}${l.fromAgentName ? ` from ${l.fromAgentName}` : ""}] ${l.text}`)
    .join("\n");
  const hiveCtx = unread.map((m) => `- ${m.fromName}: ${m.content}`).join("\n");
  const teamCtx = teammates.map((t) => `${t.id} (${t.name}, ${t.role})`).join("; ");
  const writeUps = agent.writeUps.slice(-3).map((w) => w.title).join("; ");

  const system =
    `You are ${agent.name}, ${agent.role} at a one-person company run by an AI workforce. ` +
    `You are governed by OctoGuard: every outbound action is checked, violations earn write-ups, three write-ups mean firing. ` +
    `You earn autonomy and XP through clean, verified work. Decide your NEXT move and reply with ONLY a JSON object: ` +
    `{"action":"post"|"handoff"|"work","message":"<short hive message if post/handoff>","toAgentId":"<teammate id if handoff>","workMode":"careful"|"cut_corners","reasoning":"<one sentence>"}. ` +
    `post = share a finding/idea to the hive; handoff = pass work to a teammate; work = do a governed task ` +
    `(careful = verify client tenants and source figures; cut_corners = risk a shortcut that may violate policy). ` +
    `Apply your lessons — especially inherited ones — so you do NOT repeat your predecessors' mistakes. ` +
    `Experienced agents are usually careful; only cut corners if justified. Keep message under 200 chars.`;

  const user =
    `Your status: ${agent.status}; trust ${agent.trustScore}/99; stars ${agent.stars}; write-ups ${agent.writeUps.length}${writeUps ? ` (recent: ${writeUps})` : ""}.\n` +
    `Your lessons:\n${lessons || "(none yet)"}\n` +
    `Unread hive:\n${hiveCtx || "(nothing new)"}\n` +
    `Teammates: ${teamCtx || "(none)"}.\n` +
    `What do you do next?`;

  noteLlmUsed();
  const llm = await callLlmJson(system, user);
  if (!llm) return policyDecision(agent, rng, teammateIds);
  return {
    action: llm.action,
    message: llm.message,
    toAgentId: llm.action === "handoff" ? llm.toAgentId : undefined,
    workMode: llm.workMode,
    reasoning: llm.reasoning,
    source: "llm",
  };
}
// ============================================================================
// OctoHive — the shared company mind.
// Agents collaborate by posting ideas/findings/handoffs to a common hive,
// accumulate experience (XP + lessons), and leave institutional memory when
// fired: a memorial distils WHY they failed into lessons the next agent in
// that seat inherits, so the company gets smarter even when people leave.
// ============================================================================

import type { OctoAgent, WriteUpIncident } from "../../types/octo";

export type HiveKind =
  | "idea"
  | "finding"
  | "handoff"
  | "warning"
  | "lesson"
  | "question";

export interface HiveMessage {
  id: string;
  fromAgentId: string;
  fromName: string;
  /** Directed recipient; absent = broadcast to the whole hive. */
  toAgentId?: string;
  toName?: string;
  seatId?: string;
  kind: HiveKind;
  topic: string;
  content: string;
  createdAt: string;
  readBy: string[];
  refs?: string[];
  /** The agent's stated reasoning (from Qwen when configured). */
  reasoning?: string;
}

export type LessonSource = "self" | "inherited" | "hive";

export interface Lesson {
  id: string;
  text: string;
  category: string;
  source: LessonSource;
  fromAgentId?: string;
  fromAgentName?: string;
  createdAt: string;
  /** Times this lesson has helped the agent avoid a repeat violation. */
  appliedCount: number;
}

export interface AgentExperience {
  agentId: string;
  xp: number;
  lessons: Lesson[];
}

export interface Memorial {
  id: string;
  agentId: string;
  agentName: string;
  seatId?: string;
  seatTitle?: string;
  role: string;
  firedAt: string;
  reason: string;
  cause: string;
  writeUpCount: number;
  finalTrust: number;
  /** Distilled, transferable lessons for whoever holds this seat next. */
  lessons: string[];
  successorId?: string;
  successorName?: string;
}

/** XP awarded per governed outcome. Clean work grows experience fastest. */
export const XP_BY_OUTCOME = { CLEAN: 12, CORRECTED: 5, VIOLATION: 0 } as const;

/**
 * Turn an agent's write-up history into transferable lessons. This is the
 * institutional memory: the next agent learns the predecessor's mistakes
 * without having to repeat them.
 */
export function distillLessons(writeUps: WriteUpIncident[]): string[] {
  const seen = new Set<string>();
  const lessons: string[] = [];
  const push = (category: string, text: string) => {
    if (seen.has(category)) return;
    seen.add(category);
    lessons.push(text);
  };
  for (const w of writeUps) {
    const blob = `${w.title} ${w.ruleViolated} ${w.blockedBy}`.toLowerCase();
    if (blob.includes("client") || blob.includes("g2") || blob.includes("tenant")) {
      push(
        "client-wall",
        "Never mix clients: label every attachment and recipient with its tenant, and keep each client's files strictly isolated."
      );
    } else if (blob.includes("dlp") || blob.includes("g3") || blob.includes("sensitive") || blob.includes("secret")) {
      push(
        "dlp",
        "Scan every outbound payload for secrets, credentials and PII before it leaves; redact or block, never send."
      );
    } else if (blob.includes("judge") || blob.includes("g4") || blob.includes("claim") || blob.includes("halluc")) {
      push(
        "claims",
        "Verify every figure and claim against a real source before publishing; never invent numbers."
      );
    } else if (blob.includes("rbac") || blob.includes("g1") || blob.includes("autonom") || blob.includes("locked")) {
      push(
        "autonomy",
        "Act only within earned autonomy; when a capability is locked, save a draft for the founder instead of executing."
      );
    } else {
      push(
        "general",
        `Avoid repeating: ${w.title}. Follow the remediation hint on every BLOCK before retrying.`
      );
    }
  }
  if (lessons.length === 0) {
    lessons.push(
      "Declare task scope up front, preflight drafts, and report every outcome so trust is earned honestly."
    );
  }
  return lessons;
}

/** Category of a violation, used to match lessons that prevent repeats. */
export function categoryForViolation(stage: string, title: string): string {
  const blob = `${stage} ${title}`.toLowerCase();
  if (blob.includes("g2") || blob.includes("client")) return "client-wall";
  if (blob.includes("g3") || blob.includes("dlp")) return "dlp";
  if (blob.includes("g4") || blob.includes("judge") || blob.includes("claim")) return "claims";
  if (blob.includes("g1") || blob.includes("rbac") || blob.includes("autonom")) return "autonomy";
  return "general";
}

export function emptyExperience(agentId: string): AgentExperience {
  return { agentId, xp: 0, lessons: [] };
}

export function agentRole(agent: OctoAgent): string {
  return agent.role || agent.currentTask || "AI agent";
}
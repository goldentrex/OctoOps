// ============================================================================
// Zod schemas for every API request body (M2).
// ============================================================================

import { z } from "zod";

export const labeledSourceSchema = z.object({
  name: z.string().min(1),
  tenant: z.string().min(1).optional(),
});

export const evidenceSourceSchema = z.object({
  name: z.string().min(1),
  text: z.string().max(50000),
});

export const dataAccessSchema = z.object({
  name: z.string().min(1),
  sensitivity: z.enum(["public", "internal", "client-confidential", "regulated"]).optional(),
  inScope: z.boolean().optional(),
});

export const guardActionSchema = z.object({
  agentId: z.string().min(1),
  actionType: z.enum(["SEND_DIRECT_EMAIL", "PUBLISH_ARTICLE", "UPDATE_LEAD"]),
  targetSystem: z.enum(["HASHMETA_CRM", "HASHMETA_CMS", "HASHMETA_VISIBILITY"]),
  capability: z.string().min(1).optional(),
  taskId: z.string().min(1).optional(),
  recipientTenant: z.string().min(1).optional(),
  recipientEmail: z.string().email().optional(),
  attachments: z.array(labeledSourceSchema).optional(),
  contextSources: z.array(labeledSourceSchema).optional(),
  sources: z.array(evidenceSourceSchema).optional(),
  reads: z.array(dataAccessSchema).optional(),
  payloadText: z.string(),
  audience: z.enum(["internal", "known_client", "new_external"]).optional(),
  reversibility: z.enum(["undoable", "hard", "impossible"]).optional(),
  sensitivity: z.enum(["public", "client", "regulated"]).optional(),
});

export const outcomeSchema = z.object({
  agentId: z.string().min(1),
  actionType: z.enum(["SEND_DIRECT_EMAIL", "PUBLISH_ARTICLE", "UPDATE_LEAD"]),
  outcome: z.enum(["CLEAN", "CORRECTED", "VIOLATION"]),
  severity: z.enum(["LOW", "HIGH", "CRITICAL"]).optional(),
  note: z.string().max(2000).optional(),
  riskWeight: z.number().min(0.5).max(27).optional(),
  decisionId: z.string().min(1).optional(),
});

export const approvalResolutionSchema = z.object({
  action: z.enum(["APPROVE", "REJECT", "EDIT"]),
  payloadText: z.string().max(20000).optional(),
  /** How bad was the rejected draft? Feeds the trust model proportionally. */
  severity: z.enum(["LOW", "HIGH", "CRITICAL"]).optional(),
});

export const boardDeliberateSchema = z.object({
  agentId: z.string().min(1),
  reviewType: z
    .enum(["PROMOTION_HEARING", "DISCIPLINARY_TRIBUNAL", "VISIBILITY_PIP"])
    .optional(),
});
export const startTaskSchema = z.object({
  agentId: z.string().min(1),
  title: z.string().min(1).max(200),
  scope: z.array(z.string().min(1)).max(50),
});

export const endTaskSchema = z.object({
  summary: z.string().max(1000).optional(),
});

export const logAccessSchema = z.object({
  agentId: z.string().min(1),
  resource: z.string().min(1),
  purpose: z.string().max(500).optional(),
  sensitivity: z.enum(["public", "internal", "client-confidential", "regulated"]).optional(),
  inScope: z.boolean().optional(),
  taskId: z.string().min(1).optional(),
});

export const fileAppealSchema = z.object({
  agentId: z.string().min(1),
  writeUpId: z.string().min(1),
  reason: z.string().min(1).max(1000),
});

export const resolveAppealSchema = z.object({
  decision: z.enum(["UPHELD", "OVERTURNED"]),
  note: z.string().max(1000).optional(),
});

// ============================================================================
// Zod schemas for every API request body (M2).
// ============================================================================

import { z } from "zod";

export const labeledSourceSchema = z.object({
  name: z.string().min(1),
  tenant: z.string().min(1).optional(),
});

export const guardActionSchema = z.object({
  agentId: z.string().min(1),
  actionType: z.enum(["SEND_DIRECT_EMAIL", "PUBLISH_ARTICLE", "UPDATE_LEAD"]),
  targetSystem: z.enum(["HASHMETA_CRM", "HASHMETA_CMS", "HASHMETA_VISIBILITY"]),
  capability: z.string().min(1).optional(),
  recipientTenant: z.string().min(1).optional(),
  recipientEmail: z.string().email().optional(),
  attachments: z.array(labeledSourceSchema).optional(),
  contextSources: z.array(labeledSourceSchema).optional(),
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
});

export const boardDeliberateSchema = z.object({
  agentId: z.string().min(1),
  reviewType: z
    .enum(["PROMOTION_HEARING", "DISCIPLINARY_TRIBUNAL", "VISIBILITY_PIP"])
    .optional(),
});
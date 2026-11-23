// ============================================================================
// Store seeding from the existing demo presets (src/data). No visual data is
// modified; the engine state (capability records, budgets) is layered on top.
// ============================================================================

import { buildPresetSnapshot } from "../../data/businessPresets";
import type { JobSeat, OctoAgent, PermissionScope } from "../../types/octo";
import {
  createCapabilityRecord,
  createErrorBudget,
  type CapabilityRecord,
  type ErrorBudget,
} from "../governance/ladder";
import type { AutonomyLevel, TenantRegistry } from "../governance/types";

export const DEFAULT_PRESET_ID = "b2b-consultancy";

export const MODE_TO_LEVEL: Record<PermissionScope["mode"], AutonomyLevel> = {
  LOCKED: 0,
  DRAFT_ONLY: 1,
  APPROVAL_REQUIRED: 2,
  AUTONOMOUS_EXEC: 3,
};

export const LEVEL_TO_MODE: Record<AutonomyLevel, PermissionScope["mode"]> = {
  0: "LOCKED",
  1: "DRAFT_ONLY",
  2: "APPROVAL_REQUIRED",
  3: "AUTONOMOUS_EXEC",
  4: "AUTONOMOUS_EXEC",
};

/** Map demo permission ids to engine capability ids. */
export function capabilityForPermission(perm: PermissionScope): string {
  if (perm.id === "crm-direct-email" || perm.id === "crm-nurture" || perm.id === "fin-dunning") {
    return "crm.send_external";
  }
  if (perm.id === "cms-publish") return "cms.publish";
  if (perm.id === "crm-draft-reply") return "crm.update_lead";
  if (perm.id === "crm-discount") return "crm.quote_pricing";
  return perm.id;
}

/** Demo tenant email domains (fictional clients; matches board evidence text). */
const DEMO_DOMAINS: Record<string, string> = {
  "meridianrobotics.sg": "Meridian Robotics",
  "northlightcap.com": "Northlight Capital",
  "atlasadvisory.sg": "Atlas SME Advisory",
  "keystoneaudit.com": "Keystone Cloud Audit",
};

export interface SeedState {
  presetId: string;
  presetName: string;
  seats: JobSeat[];
  agents: OctoAgent[];
  /** agentId -> capability -> record */
  records: Record<string, Record<string, CapabilityRecord>>;
  /** one error budget per seat occupant, shared across capabilities */
  budgets: Record<string, ErrorBudget>;
  registry: TenantRegistry;
}

export function buildSeed(presetId: string = DEFAULT_PRESET_ID, now = Date.now()): SeedState {
  const snap = buildPresetSnapshot(presetId);
  const records: SeedState["records"] = {};
  const budgets: SeedState["budgets"] = {};

  for (const agent of snap.candidates) {
    if (!agent.assignedSeatId) continue;
    const budget = createErrorBudget(now);
    budgets[agent.id] = budget;
    const byCapability: Record<string, CapabilityRecord> = {};
    for (const perm of agent.permissions) {
      const capability = capabilityForPermission(perm);
      if (byCapability[capability]) continue;
      byCapability[capability] = createCapabilityRecord(
        capability,
        now,
        MODE_TO_LEVEL[perm.mode],
        budget
      );
    }
    records[agent.id] = byCapability;
  }

  const domains: Record<string, string> = {};
  for (const [domain, tenant] of Object.entries(DEMO_DOMAINS)) {
    if (snap.preset.clientPortalAccounts.some((a) => a.startsWith(tenant))) {
      domains[domain] = tenant;
    }
  }

  return {
    presetId: snap.preset.id,
    presetName: snap.preset.name,
    seats: snap.seats,
    agents: snap.candidates,
    records,
    budgets,
    registry: { domains, tenants: [...snap.preset.clientPortalAccounts] },
  };
}
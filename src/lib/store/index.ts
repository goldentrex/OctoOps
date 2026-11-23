// ============================================================================
// Store singleton. Survives Next.js dev hot-reloads via globalThis.
// OCTOGUARD_STORE=memory forces the in-memory store; default is the JSON file
// store at .data/governance.json. OCTOGUARD_PRESET selects the seed preset.
// ============================================================================

import { FileGovernanceStore, defaultStorePath } from "./fileStore";
import { MemoryGovernanceStore } from "./memoryStore";
import { DEFAULT_PRESET_ID } from "./seed";
import type { GovernanceStore } from "./types";

const globalKey = "__octoguardStore__" as const;
type GlobalWithStore = typeof globalThis & { [globalKey]?: GovernanceStore };

export function getStore(): GovernanceStore {
  const g = globalThis as GlobalWithStore;
  if (!g[globalKey]) {
    const presetId = process.env.OCTOGUARD_PRESET || DEFAULT_PRESET_ID;
    g[globalKey] =
      process.env.OCTOGUARD_STORE === "memory"
        ? new MemoryGovernanceStore(presetId)
        : new FileGovernanceStore(defaultStorePath(), presetId);
  }
  return g[globalKey];
}

export type { GovernanceStore } from "./types";
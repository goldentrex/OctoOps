// ============================================================================
// JSON-file GovernanceStore for local dev. Persists to .data/ (git-ignored).
// Swap for a hosted database by implementing GovernanceStore.
// ============================================================================

import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { MemoryGovernanceStore, type StoreSnapshot } from "./memoryStore";
import { DEFAULT_PRESET_ID } from "./seed";

export class FileGovernanceStore extends MemoryGovernanceStore {
  constructor(private filePath: string, presetId: string = DEFAULT_PRESET_ID) {
    super(presetId);
    if (existsSync(filePath)) {
      try {
        const snap = JSON.parse(readFileSync(filePath, "utf8")) as StoreSnapshot;
        if (snap?.seed?.presetId === presetId) {
          this.hydrate(snap);
        }
      } catch {
        // Corrupt file: start fresh from presets (fail safe, never crash the demo).
      }
    }
  }

  protected override persist(): void {
    try {
      mkdirSync(dirname(this.filePath), { recursive: true });
      writeFileSync(this.filePath, JSON.stringify(this.serialize()), "utf8");
    } catch {
      // Read-only filesystem (e.g. some hosts): degrade to in-memory.
    }
  }
}

export function defaultStorePath(): string {
  return join(process.cwd(), ".data", "governance.json");
}
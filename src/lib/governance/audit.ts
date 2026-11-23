// ============================================================================
// Append-only, tamper-evident audit chain (plan 3.6).
// Each event carries prevHash and sha256(prevHash + JSON(event)).
// Server-side only (node:crypto).
// ============================================================================

import { createHash } from "node:crypto";
import type { GovernanceAuditEvent } from "../../types/octo";

export const GENESIS_HASH = "0".repeat(64);

/**
 * Canonical JSON: object keys sorted recursively. Hashing must be invariant
 * to key order because databases (e.g. PostgreSQL jsonb) reorder keys on
 * storage — insertion-order JSON would break the chain on reload.
 */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys
    .filter((k) => obj[k] !== undefined)
    .map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`)
    .join(",")}}`;
}

export interface ChainedAuditEvent {
  seq: number;
  prevHash: string;
  hash: string;
  event: GovernanceAuditEvent;
}

export function hashEvent(prevHash: string, event: GovernanceAuditEvent): string {
  return createHash("sha256")
    .update(prevHash + canonicalJson(event))
    .digest("hex");
}

export function chainEvent(
  prev: ChainedAuditEvent | null,
  event: GovernanceAuditEvent
): ChainedAuditEvent {
  const prevHash = prev ? prev.hash : GENESIS_HASH;
  return {
    seq: prev ? prev.seq + 1 : 0,
    prevHash,
    hash: hashEvent(prevHash, event),
    event,
  };
}

export interface ChainVerification {
  valid: boolean;
  length: number;
  brokenAtSeq?: number;
  reason?: string;
}

export function verifyChain(events: ChainedAuditEvent[]): ChainVerification {
  let prevHash = GENESIS_HASH;
  for (let i = 0; i < events.length; i++) {
    const entry = events[i];
    if (entry.seq !== i) {
      return {
        valid: false,
        length: events.length,
        brokenAtSeq: entry.seq,
        reason: `Sequence gap at index ${i} (seq ${entry.seq}).`,
      };
    }
    if (entry.prevHash !== prevHash) {
      return {
        valid: false,
        length: events.length,
        brokenAtSeq: entry.seq,
        reason: `prevHash mismatch at seq ${entry.seq}.`,
      };
    }
    const recomputed = hashEvent(entry.prevHash, entry.event);
    if (recomputed !== entry.hash) {
      return {
        valid: false,
        length: events.length,
        brokenAtSeq: entry.seq,
        reason: `Event payload tampered at seq ${entry.seq}.`,
      };
    }
    prevHash = entry.hash;
  }
  return { valid: true, length: events.length };
}
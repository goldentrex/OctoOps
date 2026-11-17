import { describe, expect, it } from "vitest";
import { chainEvent, verifyChain, GENESIS_HASH } from "../audit";
import type { GovernanceAuditEvent } from "../../../types/octo";

function event(i: number): GovernanceAuditEvent {
  return {
    id: `evt-${i}`,
    timestamp: new Date(1_700_000_000_000 + i * 1000).toISOString(),
    agentId: "squidney",
    agentName: "Squidney",
    department: "Hashmeta CRM",
    system: "Hashmeta CRM",
    outcome: "BLOCKED",
    title: `Event ${i}`,
    detail: "test",
  };
}

function buildChain(n: number) {
  const chain = [];
  let prev = null as ReturnType<typeof chainEvent> | null;
  for (let i = 0; i < n; i++) {
    prev = chainEvent(prev, event(i));
    chain.push(prev);
  }
  return chain;
}

describe("hash-chained audit", () => {
  it("chains from the genesis hash", () => {
    const chain = buildChain(3);
    expect(chain[0].prevHash).toBe(GENESIS_HASH);
    expect(chain[1].prevHash).toBe(chain[0].hash);
    expect(chain[2].seq).toBe(2);
  });

  it("verifies an intact chain", () => {
    expect(verifyChain(buildChain(10)).valid).toBe(true);
  });

  it("verifies an empty chain", () => {
    expect(verifyChain([]).valid).toBe(true);
  });

  it("detects payload tampering", () => {
    const chain = buildChain(5);
    chain[2].event.title = " rewritten history";
    const res = verifyChain(chain);
    expect(res.valid).toBe(false);
    expect(res.brokenAtSeq).toBe(2);
  });

  it("detects a broken prevHash link (deleted event)", () => {
    const chain = buildChain(5);
    chain.splice(2, 1);
    const res = verifyChain(chain);
    expect(res.valid).toBe(false);
  });

  it("detects reordered events", () => {
    const chain = buildChain(5);
    [chain[1], chain[2]] = [chain[2], chain[1]];
    expect(verifyChain(chain).valid).toBe(false);
  });
});
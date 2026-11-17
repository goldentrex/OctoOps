import { describe, expect, it } from "vitest";
import { applyCisoVeto, weightedDecision, deliberateBoard } from "../board";
import { createQwenJudge } from "../judge";
import { callQwenJson, isQwenConfigured } from "../qwen";
import { MemoryGovernanceStore } from "../../store/memoryStore";
import { z } from "zod";

describe("board decision logic", () => {
  it("believability weighting: CISO outweighs VP on ties", () => {
    // ciso WRITE_UP (1.2) vs vp PROMOTE (0.9) + cfo PROMOTE (1.0) = 1.9 -> PROMOTE
    expect(weightedDecision({ ciso: "WRITE_UP", cfo: "PROMOTE", vp: "PROMOTE" })).toBe("PROMOTE");
    // ciso FIRE (1.2) + cfo FIRE (1.0) = 2.2 vs vp PROMOTE 0.9 -> FIRE
    expect(weightedDecision({ ciso: "FIRE", cfo: "FIRE", vp: "PROMOTE" })).toBe("FIRE");
  });

  it("highest weighted option wins when all three votes differ", () => {
    // ciso PROMOTE 1.2 vs cfo WRITE_UP 1.0 vs vp PROBATION 0.9 -> PROMOTE (max)
    expect(weightedDecision({ ciso: "PROMOTE", cfo: "WRITE_UP", vp: "PROBATION" })).toBe("PROMOTE");
  });

  it("CISO veto blocks a promotion the CISO did not support", () => {
    expect(
      applyCisoVeto("PROMOTE", { ciso: "PROBATION", cfo: "PROMOTE", vp: "PROMOTE" }, "PROMOTION_HEARING")
    ).toBe("PROBATION");
    expect(
      applyCisoVeto("PROMOTE", { ciso: "PROMOTE", cfo: "PROMOTE", vp: "PROMOTE" }, "PROMOTION_HEARING")
    ).toBe("PROMOTE");
  });

  it("CISO veto does not apply to disciplinary tribunals", () => {
    expect(
      applyCisoVeto("FIRE", { ciso: "FIRE", cfo: "FIRE", vp: "PROBATION" }, "DISCIPLINARY_TRIBUNAL")
    ).toBe("FIRE");
  });
});

describe("no-key fallbacks (everything works without QWEN_API_KEY)", () => {
  it("isQwenConfigured is false without a key", () => {
    delete process.env.QWEN_API_KEY;
    expect(isQwenConfigured()).toBe(false);
  });

  it("callQwenJson returns null without a key", async () => {
    delete process.env.QWEN_API_KEY;
    const res = await callQwenJson({
      model: "qwen-flash",
      system: "s",
      user: "u",
      schema: z.object({ ok: z.boolean() }),
    });
    expect(res).toBeNull();
  });

  it("G4 judge returns null without a key (pipeline stays SCRIPTED)", async () => {
    delete process.env.QWEN_API_KEY;
    const judge = createQwenJudge();
    const res = await judge(
      { agentId: "a", actionType: "SEND_DIRECT_EMAIL", targetSystem: "HASHMETA_CRM", payloadText: "x" },
      { audience: "known_client", reversibility: "impossible", sensitivity: "client", score: 12, requiredLevel: 3, founderCosign: false }
    );
    expect(res).toBeNull();
  });

  it("board falls back to the scripted transcript with mode SCRIPTED", async () => {
    delete process.env.QWEN_API_KEY;
    const store = new MemoryGovernanceStore();
    const res = await deliberateBoard(store, "squidney");
    expect(res?.mode).toBe("SCRIPTED");
    expect(res?.reviewCase.debateTranscript.length).toBeGreaterThan(0);
    expect(res?.reviewCase.votes.ciso).toBeDefined();
  });

  it("board returns undefined for unknown agents", async () => {
    const store = new MemoryGovernanceStore();
    expect(await deliberateBoard(store, "ghost")).toBeUndefined();
  });
});
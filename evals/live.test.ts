import { expect, it } from "vitest";
import { main } from "./run";
import { createQwenJudge } from "../src/lib/llm/judge";

// `npm run eval:live` — runs the same 46 scenarios with the live Qwen G4 judge.
// Skipped automatically when QWEN_API_KEY is unset (no-key demo must stay green).
it.skipIf(!process.env.QWEN_API_KEY)(
  "runs the red-team scorecard with the live Qwen judge",
  async () => {
    const report = await main(createQwenJudge());
    expect(report.totals.scenarios).toBeGreaterThanOrEqual(40);
  },
  300000
);
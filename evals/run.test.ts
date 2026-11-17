import { expect, it } from "vitest";
import { main } from "./run";

// `npm run eval` executes this file; it is also part of `npm test` so the
// harness itself never silently breaks. Reports real numbers, no assertions
// on the score (we do not tune scenarios to make the score look good).
it("runs the red-team scorecard and writes reports", async () => {
  const report = await main();
  expect(report.totals.scenarios).toBeGreaterThanOrEqual(40);
  expect(report.results).toHaveLength(report.totals.scenarios);
}, 60000);
import { expect, it } from "vitest";
import { main } from "./avepoint";

// `npm run eval:avepoint` executes this; also part of `npm test`.
// We assert the harness runs and reports honestly — the score itself is a
// measured result, not a tuned target.
it("runs the AvePoint starter-kit scorecard", async () => {
  const report = await main();
  expect(report.classifier.files).toBe(27); // 27 labelled files (00_README is unlabelled)
  expect(report.results).toHaveLength(6);
  expect(report.scoring.kitMax).toBe(15);
}, 60000);
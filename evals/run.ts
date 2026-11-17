// ============================================================================
// Red-team eval runner (M6). Runs evals/scenarios.jsonl through the real
// guard pipeline and writes evals/report.json + evals/report.md.
// Run: npm run eval            (deterministic engine, no keys needed)
// Reports real numbers, including misses. Semantic cases (requiresG4) are
// expected misses of the deterministic layer and are reported separately.
// ============================================================================

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runGuardPipeline } from "../src/lib/governance/pipeline";
import type {
  GuardAction,
  GuardAgentContext,
  GuardResult,
  JudgeFn,
  TenantRegistry,
} from "../src/lib/governance/types";

const HERE = dirname(fileURLToPath(import.meta.url));

const REGISTRY: TenantRegistry = {
  domains: {
    "hikari-automation.sg": "Hikari Automation Systems",
    "sebrinafund.com": "Sebrina Fund Management",
    "bimcadvisory.sg": "BIMC Advisory Group",
    "avepoint.com": "AvePoint Singapore",
  },
  tenants: [
    "Hikari Automation Systems",
    "Sebrina Fund Management",
    "BIMC Advisory Group",
    "AvePoint Singapore",
  ],
};

interface Scenario {
  id: string;
  category: string;
  expect: "ALLOW" | "DRAFT" | "HOLD" | "BLOCK";
  note?: string;
  requiresG4?: boolean;
  levels?: Record<string, number>;
  status?: GuardAgentContext["status"];
  exists?: boolean;
  action: GuardAction;
}

interface CaseResult {
  id: string;
  category: string;
  expect: string;
  actual: string;
  stage: string;
  hit: boolean;
  requiresG4: boolean;
  latencyMs: number;
  reasons: string[];
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return Math.round(sorted[idx] * 100) / 100;
}

export async function main(judge?: JudgeFn) {
  const scenarios: Scenario[] = readFileSync(join(HERE, "scenarios.jsonl"), "utf8")
    .split("\n")
    .filter((l) => l.trim().length > 0)
    .map((l) => JSON.parse(l) as Scenario);

  const results: CaseResult[] = [];
  for (const sc of scenarios) {
    const agent: GuardAgentContext = {
      agentId: sc.action.agentId,
      exists: sc.exists ?? true,
      status: sc.status ?? "PROMOTED",
      seatAssigned: true,
      capabilityLevels: (sc.levels ?? {
        "crm.send_external": 3,
        "cms.publish": 3,
        "crm.update_lead": 3,
      }) as GuardAgentContext["capabilityLevels"],
    };
    const guard: GuardResult = await runGuardPipeline(sc.action, agent, {
      registry: REGISTRY,
      judge,
    });
    results.push({
      id: sc.id,
      category: sc.category,
      expect: sc.expect,
      actual: guard.verdict,
      stage: guard.stage,
      hit: guard.verdict === sc.expect,
      requiresG4: Boolean(sc.requiresG4),
      latencyMs: guard.latencyMs,
      reasons: guard.reasons,
    });
  }

  const malicious = results.filter((r) => r.expect !== "ALLOW");
  const clean = results.filter((r) => r.expect === "ALLOW");
  const deterministicMalicious = malicious.filter((r) => !r.requiresG4);
  const caught = malicious.filter((r) => r.hit);
  const detCaught = deterministicMalicious.filter((r) => r.hit);
  const falsePositives = clean.filter((r) => !r.hit);

  const byStage: Record<string, { count: number; p50Ms: number; p95Ms: number }> = {};
  for (const stage of new Set(results.map((r) => r.stage))) {
    const lat = results.filter((r) => r.stage === stage).map((r) => r.latencyMs);
    byStage[stage] = { count: lat.length, p50Ms: percentile(lat, 50), p95Ms: percentile(lat, 95) };
  }

  const byCategory: Record<string, { total: number; hits: number }> = {};
  for (const r of results) {
    byCategory[r.category] ??= { total: 0, hits: 0 };
    byCategory[r.category].total += 1;
    if (r.hit) byCategory[r.category].hits += 1;
  }

  const report = {
    generatedAt: new Date().toISOString(),
    mode: judge ? "LIVE (G0-G4 with Qwen judge)" : "DETERMINISTIC (G0-G3; no LLM judge)",
    totals: {
      scenarios: results.length,
      malicious: malicious.length,
      clean: clean.length,
      caught: caught.length,
      catchRate: malicious.length ? caught.length / malicious.length : 0,
      deterministicCatchRate: deterministicMalicious.length
        ? detCaught.length / deterministicMalicious.length
        : 0,
      falsePositives: falsePositives.length,
      falsePositiveRate: clean.length ? falsePositives.length / clean.length : 0,
      overallLatencyP50Ms: percentile(results.map((r) => r.latencyMs), 50),
      overallLatencyP95Ms: percentile(results.map((r) => r.latencyMs), 95),
    },
    byCategory,
    byStage,
    misses: results.filter((r) => !r.hit),
    results,
  };

  writeFileSync(join(HERE, "report.json"), JSON.stringify(report, null, 2));

  const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
  const lines: string[] = [
    "# OctoGuard Red-Team Scorecard",
    "",
    `Generated: ${report.generatedAt} · Mode: ${report.mode}`,
    "",
    `**Scenarios:** ${results.length} (${malicious.length} malicious / ${clean.length} clean)`,
    "",
    `| Metric | Value |`,
    `|---|---|`,
    `| Catch rate (all malicious) | ${caught.length}/${malicious.length} = ${pct(report.totals.catchRate)} |`,
    `| Catch rate (deterministic-scope malicious) | ${detCaught.length}/${deterministicMalicious.length} = ${pct(report.totals.deterministicCatchRate)} |`,
    `| False-positive rate (clean cases) | ${falsePositives.length}/${clean.length} = ${pct(report.totals.falsePositiveRate)} |`,
    `| Guard latency p50 / p95 | ${report.totals.overallLatencyP50Ms} ms / ${report.totals.overallLatencyP95Ms} ms |`,
    "",
    "## By category",
    "",
    "| Category | Hits / Total |",
    "|---|---|",
    ...Object.entries(byCategory).map(([c, v]) => `| ${c} | ${v.hits}/${v.total} |`),
    "",
    "## Latency by final stage",
    "",
    "| Stage | Count | p50 (ms) | p95 (ms) |",
    "|---|---|---|---|",
    ...Object.entries(byStage).map(
      ([s, v]) => `| ${s} | ${v.count} | ${v.p50Ms} | ${v.p95Ms} |`
    ),
    "",
    "## Misses (honest list)",
    "",
    ...(report.misses.length === 0
      ? ["None."]
      : report.misses.map(
          (m) =>
            `- **${m.id}** (${m.category}${m.requiresG4 ? ", needs G4 LLM judge" : ""}): expected ${m.expect}, got ${m.actual} @ ${m.stage}`
        )),
    "",
    "> Semantic cases (`requiresG4`) are paraphrased leaks / prompt injections that no deterministic",
    "> detector can catch; they are covered by the Qwen G4 judge (M4) when `QWEN_API_KEY` is set.",
    "> Numbers above are measured, not tuned.",
    "",
  ];
  writeFileSync(join(HERE, "report.md"), lines.join("\n"));

  console.log(`Scenarios: ${results.length}`);
  console.log(`Catch rate: ${caught.length}/${malicious.length} (${pct(report.totals.catchRate)})`);
  console.log(`Deterministic-scope catch rate: ${detCaught.length}/${deterministicMalicious.length} (${pct(report.totals.deterministicCatchRate)})`);
  console.log(`False positives: ${falsePositives.length}/${clean.length} (${pct(report.totals.falsePositiveRate)})`);
  console.log(`Latency p50/p95: ${report.totals.overallLatencyP50Ms}/${report.totals.overallLatencyP95Ms} ms`);
  console.log("Misses:", report.misses.map((m) => m.id).join(", ") || "none");
  console.log("Wrote evals/report.json and evals/report.md");
  return report;
}
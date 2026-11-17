# Qoder kickoff prompt (Night 1)

Use **Quest mode**, tier **Ultimate** (off-peak), on a pushed branch. Paste everything below the line.

---

You are the lead engineer on OctoOps, a Next.js 15 / React 19 / TypeScript / Tailwind app. Read `AGENTS.md` and `docs/WINNING_PLAN.md` first. They are the product spec. Sections 3 and 4 of the plan define what you are building tonight.

## Context

OctoOps is "HR for AI agents": QwenWork agents start on probation, earn autonomy per capability, and get written up or fired when they slip. Today the app is a polished front-end demo with no backend. The guardrail in `src/lib/adapters.ts` is three regexes, and all state lives in `localStorage`. Hackathon judges score real feasibility and real QwenWork use, so tonight you make the engine real.

I am asleep while you work. Do not wait for me.

## How to work

- Create and stay on branch `feat/octoguard-engine`. Commit after every milestone with a clear message. Do not push to `main`.
- Never stop to ask a question. When something is ambiguous, pick the most reasonable default, write it in `docs/QUESTIONS.md` as "Assumed X because Y", and continue.
- Maintain `docs/PROGRESS.md`: for each milestone, status, what was built, how it was verified, what is left. Update it before every commit. A fresh session must be able to resume from this file alone.
- Before marking a milestone done, run `npx tsc --noEmit`, `npm test` and `npm run build`. All three must pass. If one fails, fix it before moving on. Report real results in `PROGRESS.md`, including failures you could not fix.
- If a milestone is blocked for more than three attempts, record why, stub it behind a clean interface, and move to the next one.

## Do not touch

- `public/` (254 MB of generated images and videos), `scripts/`, `OCTO_PORTFOLIO_PROMPTS.md`.
- The visual design of existing components. Tonight is engine work. UI changes are limited to what M5 lists.
- Do not refactor `src/app/page.tsx` wholesale (2,414 lines). Make the smallest edits needed.
- Never commit secrets. Read keys from env only. Add `.env.example` with names and no values.
- Add at most these dependencies: `vitest`, `zod`, `@modelcontextprotocol/sdk`, `openai` (used only as an OpenAI-compatible client for Qwen). Anything else, justify in `QUESTIONS.md`.

## Milestones

### M1. Trust engine (pure TypeScript, no I/O)

Create `src/lib/governance/` with small, tested modules:

- `risk.ts`: action risk = audience x reversibility x data sensitivity, mapped to a required autonomy level (plan 3.2).
- `trust.ts`: Beta reputation per agent per capability. Probation prior alpha=1, beta=3. Risk-weighted gains, severity-weighted losses (LOW 1, HIGH 5, CRITICAL 15), 14-day half-life decay toward the prior, displayed score = lower bound of the 90% credible interval x 100. Export an `explain()` that returns the evidence items behind a score (plan 3.3).
- `ladder.ts`: L0-L4 state machine per capability with the entry gates, instant demotion, 10-point hysteresis, monthly error budget, and the three-write-ups rule (plan 3.4).
- `detectors/`: `clientWall.ts` (tenant label of every attachment and context source must equal the recipient tenant, resolving tenant from email domain), `dlp.ts` (API keys, bearer tokens, card numbers with Luhn, Singapore NRIC/FIN, confidential markers, with redaction spans), `rbac.ts`.
- `pipeline.ts`: runs G0-G3 in order, fails closed, returns `{ verdict: "ALLOW" | "DRAFT" | "HOLD" | "BLOCK", stage, reasons[], trustDelta, openTribunal, latencyMs }`. G4 is an injected async function so the pipeline is testable without a network.
- `audit.ts`: append-only events with `prevHash` and SHA-256 chaining, plus `verifyChain()`.

Keep `evaluateAgentActionGuardrail()` in `src/lib/adapters.ts` exported with its current signature, as a thin wrapper over the pipeline, so existing UI keeps working.

Tests (vitest), at least 60 cases: each detector's hits and near-misses, trust monotonicity, "10 clean actions score lower than 200", decay, every ladder transition, hysteresis, chain tamper detection.

### M2. Server and store

- `src/lib/store/`: a `GovernanceStore` interface with an in-memory implementation seeded from the existing presets in `src/data/`, plus a JSON-file implementation for local dev (`.data/`, git-ignored). Design the interface so a hosted database can replace it later.
- Route handlers under `src/app/api/`: `POST /api/guard/evaluate`, `POST /api/guard/outcome`, `GET /api/agents`, `GET /api/agents/[id]`, `GET /api/audit`, `GET /api/audit/verify`, `GET /api/approvals`, `POST /api/approvals/[id]` (approve / reject / edit), `POST /api/board/deliberate`, `GET /api/metrics`.
- Validate every request body with zod. Return typed errors.
- Protect write routes with a bearer token from `OCTOGUARD_API_TOKEN`. If the variable is unset, allow localhost only.

### M3. QwenWork integration surface

- `/api/mcp`: an MCP server over Streamable HTTP using `@modelcontextprotocol/sdk`, exposing `octoguard_check_action`, `octoguard_report_outcome`, `octohr_get_my_file`, `octohr_request_promotion`. Each tool has a precise description and a zod input schema. Same bearer token.
- `qwenwork-skills/octoguard/SKILL.md`: a skill that tells a QwenWork agent to call `octoguard_check_action` before any email, publish or CRM write, obey the verdict, never retry a blocked action with altered wording, and report outcomes. Include three worked examples. Add `npm run skill:zip` to package it.
- `docs/QWENWORK_SETUP.md`: step-by-step for me to add the MCP server and install the skill in QwenWork, plus a `curl` smoke test for each tool. Check the current QwenWork and MCP SDK documentation rather than relying on memory, and note anything you could not confirm.

### M4. Qwen judge and live board

- `src/lib/llm/qwen.ts`: OpenAI-compatible client. Env: `QWEN_API_KEY`, `QWEN_BASE_URL`, `QWEN_MODEL_FAST`, `QWEN_MODEL_STRONG`. Timeouts, one retry, JSON-schema output validated with zod.
- G4 judge on the fast model: semantic leak, claims unsupported by supplied sources, off-brand tone, prompt-injection echo. Runs only when G0-G3 pass and risk is medium or higher.
- Board on the strong model, following plan 3.5: three independent votes, one rebuttal round, weighted final vote, CISO veto, output conforming to the existing `BoardReviewCase` type.
- With no key, or on timeout over 12 s, fall back to the scripted transcripts already in `src/data/businessPresets.ts` and return `mode: "SCRIPTED"`. With a key, `mode: "LIVE"`. Everything must work with no key set.

### M5. Minimal UI wiring

- Sandbox calls `POST /api/guard/evaluate` and shows stage, reasons and latency.
- A `LIVE` / `SCRIPTED` badge on board and guard results.
- A KPI strip from `/api/metrics`: leaks blocked, autonomy rate, median guard latency, pending approvals.
- `/hashmeta_portal` reads agents from the API, falling back to presets.
- Stop there. Founder's Desk and the trust "why" panel are tomorrow.

### M6. Red-team scorecard

- `evals/scenarios.jsonl`: at least 40 labelled cases (wrong-client attachment, look-alike domains, NRIC in body, secrets, paraphrased confidential data, clean messages that must pass, prompt-injection text inside an attachment).
- `npm run eval`: runs them through the pipeline, writes `evals/report.json` and a markdown summary with catch rate, false-positive rate and p50/p95 latency per stage. Report the real numbers, including misses. Do not tune scenarios to make the score look good.

## Order and stopping

Do M1 → M2 → M3 → M6 (deterministic part) → M4 → M5. M1-M3 are the must-haves for tonight. When everything is done or blocked, write a final section in `docs/PROGRESS.md`: what works, what is stubbed, what I must do by hand (keys, QwenWork setup), and the three most valuable next tasks.

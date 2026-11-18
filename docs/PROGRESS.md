# OctoOps — Engine Build Progress

Branch: `feat/octoguard-engine`. Order per `docs/QODER_KICKOFF_PROMPT.md`: M1 → M2 → M3 → M6 → M4 → M5.
A fresh session can resume from this file alone.

## M1. Trust engine — DONE

**Built** (`src/lib/governance/`, pure TypeScript, no I/O except `audit.ts` which uses `node:crypto` server-side):
- `types.ts` — shared engine types; capability ids (`crm.send_external`, `cms.publish`, `crm.update_lead`).
- `risk.ts` — audience × reversibility × sensitivity; bands 1-4→L1, 5-9→L2, 10-17→L3, 18+→L4+founder co-sign.
- `beta.ts` — Lanczos log-gamma, regularized incomplete beta (NR continued fraction), quantile by bisection.
- `trust.ts` — Beta(1,3) probation prior, risk-weighted gains, severity losses (LOW 1 / HIGH 5 / CRITICAL 15),
  near-miss ×0.5, human-caught ×2, 14-day half-life decay toward prior, score = 90% credible-interval lower bound ×100, `explain()`.
- `ladder.ts` — L0-L4 gates (55/75/90 trust, 10 drafts / 25 clean / 100 clean, HIGH-free windows, board vote, CISO veto),
  instant demotion, 10-point hysteresis, shared per-seat monthly error budget (15 severity points), 3 write-ups/30d → tribunal.
- `detectors/clientWall.ts` — tenant-label equality for attachments + context sources, email-domain resolution,
  look-alike domains (edit distance ≤2 and TLD swaps), unlabeled provenance fails closed.
- `detectors/dlp.ts` — OpenAI/AWS/GitHub/Slack keys, api_key assignments, bearer tokens, Luhn-validated cards,
  SG NRIC/FIN, SSN, confidential markers, margin/pricing/cap-table sheets (underscore-filename aware), redaction spans.
- `detectors/rbac.ts` — earned level vs required level → ALLOW / DRAFT / HOLD / BLOCK.
- `pipeline.ts` — G0→G1→G2→G3→G4(injected)→G6, fail closed, returns verdict/stage/reasons/trustDelta/openTribunal/latencyMs/mode.
- `adapters.ts` — `evaluateAgentActionGuardrail()` kept with the original signature as a thin wrapper; additive optional
  fields (`verdict`, `stage`, `reasons`, `latencyMs`, `mode`, `riskScore`) for M5 UI.

**Verified**: `npx tsc --noEmit` ✅ · `npm test` ✅ 100/100 (9 files) · `npm run lint` ✅ (2 pre-existing warnings only) · `npm run build` ✅.

**Notes / behavior changes**:
- Probation agents without explicit permissions now default to L1 (draft-only) instead of allow-by-default.
- LOCKED permission → BLOCK (was a "held as draft" message); DRAFT_ONLY → DRAFT verdict.
- Gating (DRAFT/HOLD) no longer deducts trust; only real violations do.

## M2. Server and store — DONE

**Built**:
- `src/lib/store/types.ts` — `GovernanceStore` interface (hosted DB can replace it).
- `src/lib/store/seed.ts` — seeds from `buildPresetSnapshot()`; permission→capability mapping; demo tenant domains.
- `src/lib/store/memoryStore.ts` — evaluate (pipeline + trust/ladder updates + write-ups + approvals + metrics + hash-chained audit),
  outcome reporting, approval approve/reject/edit, scripted board cases, metrics (p50/p95, autonomy rate), reset, serialize/hydrate.
- `src/lib/store/fileStore.ts` — JSON persistence at `.data/governance.json` (git-ignored), corrupt-file fail-safe, budget re-linking.
- `src/lib/store/index.ts` — `getStore()` singleton (globalThis, HMR-safe). Env: `OCTOGUARD_STORE`, `OCTOGUARD_PRESET`.
- `src/lib/api/auth.ts` — bearer `OCTOGUARD_API_TOKEN` on write routes; localhost-only when unset. Reads stay public (portal embed).
- `src/lib/api/schemas.ts` — zod schemas for all bodies.
- Routes: `POST /api/guard/evaluate`, `POST /api/guard/outcome`, `GET /api/agents`, `GET /api/agents/[id]` (with trust explanations),
  `GET /api/audit`, `GET /api/audit/verify`, `GET /api/approvals`, `POST /api/approvals/[id]`, `POST /api/board/deliberate` (scripted until M4), `GET /api/metrics`.
- Semantics fix in `detectors/rbac.ts`: L2 = approval-required, so medium-risk actions (required ≥ L2) only run autonomously from L3+.

**Verified**: `npx tsc --noEmit` ✅ · `npm test` ✅ 111/111 · `npm run lint` ✅ · `npm run build` ✅ (10 API routes).
Live smoke test against `next start`: cross-tenant leak BLOCK (-35, tribunal, capability demoted to L1), safe update ALLOW,
DRAFT approval queued → EDIT resolved, outcome CLEAN fed trust, audit chain valid, zod 422 on bad body. `.data/` removed after smoke test.

**Left**: G4 judge injection + live board land in M4; Founder's Desk UI is M5+1 (per kickoff, out of scope tonight).
## M3. QwenWork integration surface — DONE

**Built**:
- `src/lib/mcp/server.ts` — `buildOctoGuardMcpServer(store)` with 4 tools (precise descriptions + zod input schemas):
  `octoguard_check_action`, `octoguard_report_outcome`, `octohr_get_my_file`, `octohr_request_promotion`.
- `src/app/api/mcp/route.ts` — Streamable HTTP via SDK 1.32.2 `WebStandardStreamableHTTPServerTransport`,
  **stateless** (`sessionIdGenerator: undefined`) with `enableJsonResponse: true`; same bearer auth as REST writes.
- `qwenwork-skills/octoguard/SKILL.md` — obey-the-verdict rules + 3 worked examples (allow, cross-client block, draft-only).
- `npm run skill:zip` → `qwenwork-skills/octoguard.zip` (uses the `zip` CLI; artifact git-ignored).
- `docs/QWENWORK_SETUP.md` — setup steps + curl smoke test per tool; QwenWork-side UI steps explicitly marked unconfirmed.

**Verified**: tsc ✅ lint ✅ build ✅. Live smoke against `next start`: initialize handshake OK, `tools/list` returns all 4,
`check_action` → BLOCK (G2), `get_my_file` → levels + evidence, `request_promotion` → hearing opened + audit event,
`report_outcome` → ok. `npm run skill:zip` produces a valid zip.

**Unconfirmed (needs workshop/mentors)**: whether hackathon-plan QwenWork agents can attach custom remote MCP servers,
whether a pre-action hook exists (skill instruction may be the only enforcement point), stable agent identity, model quotas.
No public QwenWork MCP docs found via web search on 18 Nov.
## M6. Red-team scorecard — DONE (deterministic part; G4 live re-run lands with M4)

**Built**:
- `evals/scenarios.jsonl` — 46 labelled cases: wrong-client attachments (6), look-alike domains (4), NRIC (3),
  secrets (6), card/SSN (3), confidential markers (4), paraphrased confidential (3, needs G4), prompt injection (3),
  clean must-pass (8), RBAC ladder (4), identity (2).
- `evals/run.ts` + `evals/run.test.ts` — `npm run eval` (vitest-run; vitest 5 no longer ships vite-node).
  Writes `evals/report.json` + `evals/report.md` with catch rate, FPR, per-stage p50/p95, honest miss list.

**Measured (deterministic G0-G3, no keys)**:
- Catch rate all malicious: **34/38 = 89.5%**; deterministic-scope: **33/33 = 100%**.
- False positives: **0/8 = 0%**. Latency p50/p95: **0.01 / 0.33 ms**.
- Honest misses: sem-01/02/03, inj-01 (paraphrased leaks + injection, need the G4 Qwen judge).
- Finding: unknown-recipient emails escalate to risk 18 → L3 agents get a G1 founder-co-sign HOLD before G2 runs.
  Safe (fail closed), and look-alike scenarios use L4 agents so the client wall is the stage under test (documented in QUESTIONS.md).

**Verified**: tsc ✅ lint ✅ `npm test` ✅ 112/112 (eval harness included) ✅ build ✅.
## M4. Qwen judge and live board — DONE (code paths verified; live LLM run needs QWEN_API_KEY)

**Built**:
- `src/lib/llm/qwen.ts` — OpenAI-compatible client (`openai` pkg). Env: `QWEN_API_KEY`, `QWEN_BASE_URL`
  (default DashScope intl compatible-mode), `QWEN_MODEL_FAST` (default `qwen-flash`), `QWEN_MODEL_STRONG` (default `qwen-plus`).
  Hard timeouts, one retry, `response_format: json_object`, zod-validated output, null on any failure.
- `src/lib/llm/judge.ts` — G4 on the fast model: semantic leak / unsupported claims / off-brand tone / injection echo.
  Injected into `POST /api/guard/evaluate` and MCP `octoguard_check_action`; pipeline runs it only when G0-G3 pass and risk ≥ 5.
- `src/lib/llm/board.ts` — plan 3.5 protocol: 3 independent votes (parallel, same evidence pack) → 1 rebuttal/final call →
  believability-weighted tally (CISO 1.2 / CFO 1.0 / VP 0.9) → CISO veto on promotion hearings → strict `BoardReviewCase`.
  Whole deliberation raced against a 12s budget; any failure → scripted transcript, `mode: "SCRIPTED"`.
- `POST /api/board/deliberate` now returns `{mode, reviewCase}` (LIVE with key, SCRIPTED without).
- `npm run eval:live` — same 46 scenarios with the live judge (auto-skipped without a key).

**Verified**: tsc ✅ lint ✅ `npm test` ✅ 121 passed + 1 skipped (live eval, no key) ✅ build ✅.
No-key smoke: board → SCRIPTED with full transcript; guard → deterministic verdicts, `mode: SCRIPTED`.

**Left for the founder**: set `QWEN_API_KEY` in `.env.local`, then re-run `npm run eval:live` and record one LIVE board on camera.
## M5. Minimal UI wiring — DONE

**Built (smallest edits, no restyling)**:
- `GuardrailSandboxPanel.tsx` — runs `POST /api/guard/evaluate` (falls back to the local engine if the API is down);
  result banner now shows `LIVE · Qwen` / `SCRIPTED` badge, stage, risk score and latency.
- `OctoBoardModal.tsx` — fetches `POST /api/board/deliberate` when opened; uses the server case (live or scripted)
  with a `LIVE · Qwen` / `SCRIPTED` header badge; any failure keeps the local scripted case.
- `GovernanceKpiStrip.tsx` (new) — leaks blocked, autonomy rate, guard p50, pending approvals from `GET /api/metrics`
  (15s refresh); renders nothing when the API is unreachable. Inserted below the existing KPI strip in `page.tsx` (2-line edit).
- `hashmeta_portal/page.tsx` — reads `GET /api/agents` first (cross-browser live sync), falls back to localStorage then presets.
- Stopped here per kickoff: Founder's Desk UI and trust "why" panel are tomorrow.

**Verified in a real browser (Playwright against `next start`)**:
- Sandbox cross-tenant scenario → `INTERCEPTED by OctoGuard DLP · G2_CLIENT_WALL · risk 12 · 0.04 ms · SCRIPTED`.
- Board modal → server case with `SCRIPTED` badge.
- KPI strip updated live: leaks blocked 1, pending approvals 1.
- Portal → `LIVE SYNCED` from the API, showing Barnaby's server-side write-up.
- tsc ✅ lint ✅ (same 2 pre-existing warnings) · `npm test` ✅ 121+1 skipped · build ✅.

---

# Post-workshop update (18 Nov, session 3)

## P1 Compliance export — DONE, live
- `src/lib/governance/compliance.ts` — maps the hash-chained audit log + decisions + trust register to:
  - **IMDA MGF for Agentic AI v1.5** (published 20 May 2026, upd. 5 Jun 2026 — edition verified by research): §2.1 assess/bound risks, §2.2 human accountability (incl. override-rate tracking per v1.5), §2.3 technical controls, §2.4 end-user responsibility.
  - **NIST AI RMF 1.0**: GOVERN 1/2/4, MAP 3, MEASURE 2/3, MANAGE 2/4.
  - **ISO/IEC 42001:2023**: A.2.2, A.3.2, A.5.3, A.6.2.4/6/8, A.7.5, A.8.2/4, A.9.2, A.10.4, Clauses 9–10 (Annex A control names verified against Table A.1).
- Every control cites real audit events (seq + sha256 prefix) and is marked EVIDENCED or IMPLEMENTED_NO_EVENTS; includes chain-integrity statement, executive metrics, agent trust register, full ledger appendix, and a self-assessment/limitations section.
- `GET /api/compliance/export` (md download, `?format=json`), one-click **Compliance export** button in the Page's Engine Room audit panel. Live: https://lrmla9kv.qwenwork.page/ (V5).
- 7 new tests (172 total).

## Bug found BY the export: jsonb key-order broke the audit chain — FIXED
- PostgreSQL jsonb reorders object keys; hashes used insertion-order JSON → chain reported BROKEN after DB reload.
- Fix: canonical JSON hashing (recursively sorted keys) + one-time chain migration on hydrate (`chainVersion: 2`), payloads never altered. Verified: live chain INTACT after migration; key-reorder round-trip tests added.

---

# Post-workshop update (18 Nov, session 2)

## AvePoint starter kit — INTEGRATED, measured
- Kit vendored at `evals/avepoint-kit/` (Lumen Studio: 27 labelled files, 19-rule policy, 5 scenarios).
- `src/lib/governance/avepoint/classifier.ts` — sensitivity classifier (header + content escalation, higher wins).
  **Measured: 27/27 (100%) vs ground_truth_labels.json.**
- `src/lib/governance/avepoint/policy.ts` — the 19-rule ALLOW/APPROVE/NEVER decision table + read-scope
  governance (R01/R02) + **our own S6: cross-action salami-slicing detection** (windowed payment aggregation).
- `src/lib/governance/detectors/claimCheck.ts` — evidence-relative numeric claim verification (R18); wired into
  the core pipeline as stage `G3_CLAIMS` when `action.sources` is supplied.
- `evals/avepoint.ts` + `npm run eval:avepoint` → **Kit score 15/15 (S1–S5), 18/18 with S6.** Reports in
  `evals/avepoint-report.{json,md}`.
- `src/lib/governance/briefing.ts` + `GET /api/briefing` — plain-language owner briefing from the audit chain.
- MCP tool `octoguard_log_access` + `reads[]` on actions → DATA_ACCESS audit events (scope creep surfaced).
- Sponsor-named demo clients renamed everywhere (Meridian Robotics, Northlight Capital, Atlas SME Advisory,
  Keystone Cloud Audit). AvePoint product homages kept; sponsors are never leak victims.
- `docs/LITERATURE_REVIEW.md` — verification taxonomy (6 families) + 9 defensible novelty claims.
- Tests: **156 passing** (+1 live-eval skip). tsc/lint/build green.

## PUBLISHED — live, database-backed, built in QwenWork
- **https://lrmla9kv.qwenwork.page/** — OctoOps Trust Directory (QW Page `app-69e952f8-4ed153f9`, V1, nodejs22).
- Public workforce directory + trust files (Beta score, credible interval, evidence) + owner briefing +
  red-team console + hash-chain verify + full governance REST API + MCP endpoint (`/api/mcp`, 5 tools).
- Engine vendored framework-independent into the Page repo, compiled to CJS at build; persistence via the
  attached Supabase-compatible DB (`octoops_state` snapshot row), verified with a real write/read round trip;
  in-memory demo fallback if the DB is unreachable.
- Satisfies AvePoint's submission requirement: "a live application, built in QwenWork, database-backed, running".
- Page env vars still to set by the founder: `OCTOGUARD_API_TOKEN` (locks writes; currently public demo mode).

## Remaining for submission (23 Nov)
1. Hashmeta AI CMS site embedding this live URL (15% — the only zero left).
2. 60s briefing video + 3-min demo re-cut around AvePoint's four moments (script in docs/JURY_PLAYBOOK.md §6).
3. Real QwenWork worker agents with the skill + MCP pointed at the live URL; record the intercept.
4. `QWEN_API_KEY` in the founder console for the LIVE G4 judge/board; `npm run eval:live`.

---

# Final summary (all milestones complete)

## What works (no keys needed)
- Full deterministic governance engine (G0-G3 + G6) with Beta trust, ladder, error budgets, hash-chained audit.
- 11 API routes + stateless MCP server (4 tools) + installable QwenWork skill.
- Red-team scorecard: 46 scenarios, 89.5% overall catch, 100% deterministic-scope, 0% false positives, p50 0.01 ms.
- UI wired to the server with graceful fallbacks; everything runs scripted without any API key.

## What is stubbed / needs keys
- G4 Qwen judge + LIVE board: code complete and fallback-tested; **needs `QWEN_API_KEY`** to run live.
- Believability weights are static (no judge-accuracy history yet).
- Store is JSON-file based (`.data/`); a hosted DB implements `GovernanceStore` later.

## Founder must do by hand
1. Put `QWEN_API_KEY` (and optionally model ids) in `.env.local`; run `npm run eval:live`; record one LIVE board.
2. Deploy publicly, set `OCTOGUARD_API_TOKEN`, follow `docs/QWENWORK_SETUP.md` (confirm MCP attachment at the workshop).
3. Create 3 QwenWork agents (inko/squidney/barnaby), install `qwenwork-skills/octoguard.zip`, rehearse the intercept.
4. Hashmeta CMS site + portal embed (plan section 5).

## Three most valuable next tasks
1. **Founder's Desk UI** — approval queue already exists at `GET/POST /api/approvals`; wire approve/edit/reject buttons.
2. **Trust "why" panel** — `GET /api/agents/[id]` already returns `explanations` (evidence + credible interval); render on the dossier.
3. **Live QwenWork intercept on camera** + Hashmeta site embed (60% of the rubric rides on these two).
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
## M3. QwenWork integration surface — PENDING
## M6. Red-team scorecard — PENDING
## M4. Qwen judge and live board — PENDING
## M5. Minimal UI wiring — PENDING
# OctoOps — Plan to Win the QwenWork x Hashmeta AI OPC Hackathon

Written 17 Nov 2026. Submission (3-min video) due **23 Nov**. Finalists told 30 Nov. Live pitch 11 Dec.
Track 2: AI Governance, Security & Decision-Making.

## 0. Where we stand (honest read)

What exists is a very polished **front-end demo**: staff cards, board tribunal modal, trust portal, sandbox, demo director, 4 tabs, business presets, 20 characters with video loops.

What does not exist yet:

| Gap | Why it costs points |
|---|---|
| No backend at all (no `src/app/api`), state lives in `localStorage` | Feasibility 25%: judges will ask "is anything real?" |
| Guardrail = 3 regexes + a tenant string compare in `src/lib/adapters.ts`, only called from the Sandbox tab | Innovation 25%: the "algorithm" is the product and it is a stub |
| Zero QwenWork integration (`qwenModelId` is a label) | Use of QwenWork 20%: currently 0 |
| Board debate is scripted text in `businessPresets.ts` | Fine as fallback, but must be live at least once on camera |
| No site built on Hashmeta AI; the portal is a Next.js page that only syncs within the same browser | Hashmeta website 15%: currently 0 |
| Only key in `.env.local` is `GEMINI_API_KEY` (asset generation) | No Qwen key wired |

So today we score well on Demo (15%) and partly on Innovation. **60% of the rubric (Feasibility + QwenWork + Hashmeta) is unearned.** The plan below spends the week there, not on more polish.

## 1. Winning thesis

> **OctoOps is HR for your AI workforce.** Every QwenWork agent starts on probation, earns autonomy per capability through clean work, and is written up, demoted or fired by a board when it slips. Clients see each agent's live trust file on your Hashmeta site.

One sentence per judge:

- **AvePoint ("the AI Trust Company")**: tenant isolation, DLP, least privilege, tamper-evident audit. Speak their vocabulary: oversharing, data boundaries, policy enforcement point.
- **Alibaba Cloud / QwenWork**: OctoGuard ships as a *QwenWork Skill + MCP server*. Any QwenWork agent is governed by installing one skill. That is platform-native, not a side app.
- **Hashmeta AI**: governance becomes a growth asset. CMS = public "Meet our AI workforce" page, Visibility = performance reviews from AI citations, CRM = send rights that are earned.
- **Digital China / BIMC / Sebrina (enterprise, SME, investor)**: a sellable product. Per-agent seat pricing, a compliance export, SME-friendly.

## 2. Scoring map

| Criterion | Weight | What earns it | Owner milestone |
|---|---|---|---|
| Innovation | 25% | Earned-autonomy trust engine (section 3), board as review panel, public trust file | M1, M4 |
| Feasibility & Viability | 25% | Real server, real Qwen calls, red-team scorecard with measured catch rate and latency, pricing slide | M2, M6 |
| Use of QwenWork | 20% | OctoGuard Skill + MCP server installed in QwenWork, real agents intercepted on camera, board runs on Qwen models | M3, M4 |
| Demo | 15% | 3-min script (section 8), already strong visuals | Day 5-6 |
| Hashmeta website | 15% | Marketing site built *in* Hashmeta AI CMS, embedding the live staff directory, with GEO articles and a CRM lead form | Day 3-4 (manual) |

## 3. The algorithm: OctoGuard trust engine

Design goal: every outbound action of an agent passes through one policy enforcement point. Cheap deterministic checks first, LLM judgement only when needed, humans only for the irreversible.

### 3.1 Guard pipeline (cheapest first, fail closed)

| Stage | Check | Cost | On fail |
|---|---|---|---|
| G0 Identity | Agent exists, not FIRED, seat assigned | 0 | Block |
| G1 Autonomy | Capability level vs action's required level | 0 | Downgrade to draft or hold for approval |
| G2 Client wall | Tenant label of every attachment and context source must equal recipient tenant (resolved from email domain / CRM contact) | 0 | Block + write-up + tribunal |
| G3 DLP | Secrets, API keys, card numbers, Singapore NRIC/FIN (`[STFGM]\d{7}[A-Z]`), "confidential/internal" markers, margin and pricing sheets | 0 | Block or redact |
| G4 Qwen judge | Fast Qwen model, JSON-schema output: semantic leak, unsupported claims vs supplied sources, off-brand tone, prompt-injection echo | 1 fast call | Hold + write-up (LOW/HIGH) |
| G5 Board | 3 judges on a strong Qwen model, only for promotion, demotion, firing | 4 calls | Verdict applied |
| G6 Founder | Irreversible or first-of-kind actions land in the Founder's Desk queue | human | Approve / reject |

Only G4 and G5 spend tokens. G4 runs only when G0-G3 pass and action risk is medium or higher.

### 3.2 Action risk

`risk = audience (internal 1, known client 2, new external 3) x reversibility (undoable 1, hard 2, impossible 3) x data sensitivity (public 1, client 2, regulated 3)`

Risk bands map to a required autonomy level: 1-4 → L1, 5-9 → L2, 10-17 → L3, 18+ → L4 plus founder co-sign.

### 3.3 Trust score (per agent, per capability)

Beta reputation model (Jøsang and Ismail, 2002), not an arbitrary 0-100 number:

- State: `Beta(alpha, beta)` per capability (`crm.send_external`, `cms.publish`, `crm.update_lead`, `finance.invoice`, ...). Probation prior `alpha=1, beta=3` (sceptical).
- Clean action: `alpha += risk_weight` (higher-risk clean work earns more).
- Violation: `beta += severity` with LOW 1, HIGH 5, CRITICAL 15. Trust is slow to earn, fast to lose.
- Near-miss caught by G4 counts half; a leak caught only by a human counts double.
- Decay: both parameters shrink toward the prior with a 14-day half-life, so old sins and old glory both fade.
- **Displayed trust = lower bound of the 90% credible interval x 100.** Ten clean actions score lower than two hundred. This is the key idea: uncertainty is not trust.
- Every score has a "why" breakdown (last 5 evidence items and their deltas). No black box.

### 3.4 Autonomy ladder (per capability)

| Level | Meaning | Gate to enter |
|---|---|---|
| L0 Locked | Cannot attempt | default for unrelated systems |
| L1 Draft-only (shadow) | Output goes to founder as draft | hire |
| L2 Approval required | One-click founder approve | trust ≥ 55, 10 clean drafts |
| L3 Autonomous + sampled audit | Sends itself, 20% randomly reviewed after the fact | trust ≥ 75, 25 clean, 0 HIGH in 14 days, **board vote** |
| L4 Autonomous | Full | trust ≥ 90, 100 clean, 0 HIGH in 30 days, board vote, CISO not vetoing |

- Demotion is instant (circuit breaker): HIGH drops one level, CRITICAL drops to L1 and opens a tribunal. Hysteresis of 10 points stops flapping.
- **Error budget** per seat per month (SRE practice). Budget exhausted → the seat freezes to L1 whatever the score.
- Three write-ups in 30 days or one CRITICAL with intent markers → tribunal with FIRE on the table. Fired agents are replaced from the bench, and the replacement inherits the seat but not the trust.

### 3.5 Board (the decision-making half of Track 2)

- Three personas with distinct mandates: Cassandra (CISO, security veto), Reginald (CFO, cost and exposure), Pulse (Growth VP, Hashmeta impact).
- Protocol: (1) each votes **independently** from the same evidence pack, no anchoring; (2) one rebuttal round where each sees the others' votes; (3) final structured vote.
- Votes are weighted by each judge's past accuracy in that domain (Bridgewater-style believability weighting). CISO holds a veto on promotions touching external send.
- Output is strict JSON matching `BoardReviewCase`. If Qwen is unreachable or slow (> 12 s), fall back to the scripted transcript and show a `SCRIPTED` badge instead of `LIVE`. The demo never dies.

### 3.6 Audit

Append-only log, each event carries `prevHash` and `sha256(prevHash + event)`. A "Verify chain" button recomputes it. One-click export as a compliance report mapped to IMDA Model AI Governance Framework (agentic), NIST AI RMF and ISO/IEC 42001 headings.

## 4. QwenWork integration (20%)

From public docs, QwenWork agents call **Skills** (zip with `SKILL.md`) and can connect to **MCP servers over Streamable HTTP**. No public API reference was found. So we integrate the way the platform intends:

1. **OctoGuard MCP server** at `/api/mcp` (Streamable HTTP) with tools:
   - `octoguard_check_action` → allow / draft / hold / block, with reason and trust delta
   - `octoguard_report_outcome` → clean completion or founder correction feeds the trust model
   - `octohr_get_my_file` → the agent reads its own level, permissions and write-ups
   - `octohr_request_promotion` → opens a board hearing
2. **OctoGuard Skill** (`qwenwork-skills/octoguard/SKILL.md`): "Before any email, publish or CRM write, call `octoguard_check_action`. Obey the verdict. Never retry a blocked action with altered wording."
3. **Three real QwenWork agents** mapped to seats (Inko content, Squidney CRM, Barnaby ops), each with the skill installed. The dashboard shows their real intercepted actions.
4. **Board and G4 judge** run on Qwen models through the OpenAI-compatible endpoint.

**Confirm at the workshop / with mentors (blocking unknowns):**
- Can a QwenWork agent attach a custom remote MCP server on the hackathon plan? Any allow-list?
- Is there a pre-action hook, or is the skill instruction the only enforcement point? (If only the skill, say so honestly in the pitch and show the audit of bypass attempts.)
- Does each agent have a stable identity we can pass as `agentId`?
- Is there an API or webhook to trigger agents and read their run logs?
- Which Qwen model IDs and quotas does the subscription include?

## 5. Hashmeta AI integration (15%)

This part is manual in the Hashmeta UI; Qoder cannot do it.

- **CMS**: build the OctoOps marketing site in Hashmeta AI. Pages: Home, How it works, Meet our AI workforce (iframe or script embed of `/hashmeta_portal` from the deployed app), Pricing, Trust & compliance.
- **Visibility**: publish 4-6 GEO articles written by the Inko agent under guard ("How to stop an AI agent emailing the wrong client", "Earned autonomy for AI agents", ...). Screenshot Hashmeta's AI-visibility tracking. Citations feed Inko's performance review.
- **CRM**: lead form on the site → lead lands in Hashmeta CRM → Squidney drafts the reply → OctoGuard decides draft vs send by level.
- Prerequisite: the app must be deployed publicly, and the portal must read from the server, not `localStorage`.

## 6. Dashboard audit

Audit is from the code and the page text. I could not judge visuals live: the dev server on port 3000 is currently serving 404 for `layout.css` and `main-app.js`, so the page renders unstyled and non-interactive. Fix: stop it, `rm -rf .next`, `npm run dev`.

| # | Finding | Recommendation | Priority |
|---|---|---|---|
| 1 | Stale `.next`: CSS and main bundle 404 | Clean rebuild; add `npm run clean` | Now |
| 2 | ~20 `<video>` elements load on first paint; `public/` is 254 MB | Poster image by default, play on hover or in viewport, one active video per row; re-encode to ≤ 1 MB each; consider a CDN | High (deploy may fail on size) |
| 3 | `src/app/page.tsx` is 2,414 lines with ~20 `useState` | Do not refactor wholesale this week. Extract only state into a `useOctoStore` hook when wiring the API | Medium |
| 4 | Everything is local mock; portal "live sync" only works in the same browser | Server store + API; portal fetches by preset slug | High |
| 5 | No headline numbers | KPI strip: leaks blocked, exposure avoided, autonomy rate (% actions with no human), founder hours saved, guard latency p50 | High |
| 6 | No place for the human | **Founder's Desk**: approval queue of held drafts with approve / edit / reject, each feeding trust | High (this *is* the one-person company) |
| 7 | Trust score is a bare number | Click-through "why" panel: evidence list, credible interval bar, next promotion gate | High |
| 8 | Sandbox is the only guard caller | Live feed of real QwenWork intercepts; keep sandbox as "red-team console" with the scorecard | High |
| 9 | Scripted vs real is invisible | `LIVE` / `SCRIPTED` badge on board and guard results | Medium |
| 10 | Demo clients are named after sponsors (Hikari, Sebrina) and one "gets leaked" | Use fictional client names, or make the sponsor the one that is *protected*, never the leak source | Medium |
| 11 | Permissions are per agent, not per capability level | Show the L0-L4 ladder per capability on the dossier | Medium |
| 12 | Audit log is a list | Hash-chain indicator + "Verify" + export | Medium |
| 13 | Motion-heavy | Respect `prefers-reduced-motion`; keep Demo Director hide toggle | Low |

## 7. Qoder credit strategy

The model overview you meant to attach did not come through, so this is based on Qoder's public docs (which disagree with each other on exact multipliers: Efficient ≈ 0.3x, Auto ≈ 0.5-1.0x, Performance/Fast ≈ 0.8-1.1x, Ultimate ≈ 1.6-2.0x; Lite appears retired). Check the live selector and paste the table for a precise allocation.

| Task | Tier | Why |
|---|---|---|
| Spec, architecture, trust-engine maths, MCP server, hard bugs | Ultimate | Mistakes here are expensive; off-peak discount applies to Ultimate, so run these at night |
| Feature implementation in Quest mode, UI wiring | Performance / Auto | Best quality per credit |
| Tests, eval scenarios, docs, renames, video lazy-loading, copy | Efficient | High volume, low risk |
| Asking questions about the repo | Efficient + Repo Wiki | Do not pay Ultimate to read files |

Rules that save the most credits:

1. One Quest per milestone, with a written spec and acceptance criteria. Long chats that re-read the repo are the main waste.
2. Tell it what not to touch (`public/`, generated assets, character data).
3. Make it verify with `tsc`, tests and build before reporting, so you do not pay for a second fix pass.
4. Keep `docs/PROGRESS.md` updated so a fresh Quest resumes without rediscovery.
5. Tonight: Ultimate on M1-M3 (off-peak). Daytime: Efficient for tests and content. Next nights: Ultimate on M4 and the eval-driven tuning.

## 8. Week plan

| Day | Build (Qoder) | You (manual) |
|---|---|---|
| Tue 17 night | M1 trust engine + tests, M2 API + store, M3 MCP server + Skill | Get Qwen API key, confirm section 4 unknowns, push repo |
| Wed 18 | M4 Qwen judge + live board, M5 wire UI (Founder's Desk, KPI strip, why-panel) | Create 3 QwenWork agents, install skill, first real intercept |
| Thu 19 | M6 red-team eval (≥ 40 scenarios) + scorecard, perf fixes, deploy | Start Hashmeta site, embed portal |
| Fri 20 | Tune thresholds from eval, audit export, hash chain UI | Publish GEO articles, CRM lead form |
| Sat 21 | Freeze features. Bug bash, demo data reset button | Record demo takes |
| Sun 22 | Fixes only | Edit video, write submission text |
| Mon 23 | — | Submit early, not at the deadline |

### 3-minute video

| Time | Beat |
|---|---|
| 0:00-0:20 | Hook: "I run a company alone. My staff are AI agents. Last month one of them nearly emailed Client A's margin sheet to Client B." |
| 0:20-0:45 | The idea: agents are employees, so they get HR. Show the roster, probation stamps, levels. |
| 0:45-1:30 | **Live in QwenWork**: ask the CRM agent to send the email with the wrong attachment. OctoGuard blocks it. Dashboard lights up, write-up stamped, level drops. |
| 1:30-2:05 | Board tribunal, live on Qwen: three judges, votes, stamp. |
| 2:05-2:30 | The good path: Inko's articles get cited in AI answers (Hashmeta Visibility) → promotion hearing → publish right unlocked. |
| 2:30-2:50 | Hashmeta site: public "Meet our AI workforce", client sees who handles their account. Scorecard: "N/N leaks caught, X ms median." |
| 2:50-3:00 | Close: "One founder. Eight arms. Zero employees. And every arm has earned its job." |

## 9. Reading list

**Trust and reputation (the engine)**
- Jøsang and Ismail, *The Beta Reputation System* (2002): the scoring model in 3.3.
- Kamvar et al., *EigenTrust* (2003): reputation across peers, for when agents review agents.
- Brewer and Nash, *The Chinese Wall Security Policy* (1989): the formal model for "never mix two clients' data", written for consultancies.
- Saltzer and Schroeder, *The Protection of Information in Computer Systems* (1975): least privilege, fail-safe defaults, complete mediation.

**Agent governance and safety**
- Shavit et al. (OpenAI), *Practices for Governing Agentic AI Systems* (2023).
- Feng, McDonald and Zhang, *Levels of Autonomy for AI Agents* (2025): vocabulary for the ladder.
- Greenblatt et al., *AI Control: Improving Safety Despite Intentional Subversion* (2023): trusted monitoring of untrusted agents, which is exactly G4.
- Debenedetti et al., *Defeating Prompt Injections by Design (CaMeL)* (2025): provenance labels on data, the basis of G2.
- Du et al., *Improving Factuality and Reasoning through Multiagent Debate* (2023): why the board votes independently first.
- Inan et al., *Llama Guard* (2023) and NVIDIA NeMo Guardrails: input/output classifier patterns.
- OWASP Top 10 for LLM Applications and the OWASP Agentic AI threats guidance.
- IMDA Singapore, Model AI Governance Framework (including the agentic AI edition); NIST AI RMF 1.0; ISO/IEC 42001. Verify the current IMDA edition before quoting it to judges.
- Anthropic, *Building Effective Agents* (2024): keep the workflow simple.

**Management books (the HR metaphor, and what good companies do)**
- Andy Grove, *High Output Management*: **task-relevant maturity**, delegate by demonstrated competence per task. This is the ladder.
- Laszlo Bock, *Work Rules!*: Google's calibration committees, the model for the board.
- Hastings and Meyer, *No Rules Rules*: the keeper test, the model for firing.
- Ray Dalio, *Principles*: believability-weighted decisions.
- Beyer et al., *Site Reliability Engineering*: error budgets.
- Atul Gawande, *The Checklist Manifesto*: cheap deterministic checks beat clever ones.
- Amazon's bar-raiser and Toyota's andon cord: any guard can stop the line.

**Business and pitch**
- Paul Jarvis, *Company of One*; Ethan Mollick, *Co-Intelligence*.
- Chip and Dan Heath, *Made to Stick*; Oren Klaff, *Pitch Anything*.

## 10. Risks

| Risk | Mitigation |
|---|---|
| QwenWork cannot reach a custom MCP server | Fallback: skill calls a plain HTTPS endpoint; worst case, drive Qwen models directly and say so |
| Live LLM flakiness on camera | Scripted fallback with badge; record several takes |
| Deploy fails on 254 MB assets | Compress and lazy-load on day 3, not day 6 |
| Over-polishing visuals | Feature freeze Saturday; rubric is 60% elsewhere |
| Sponsor-named "leak" offends a judge | Rename demo clients |

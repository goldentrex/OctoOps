# OctoOps — Jury Playbook (Detailed)

Companion to `OCTOOPS_REFINED_PLAN_SHORT.md`. Written 18 Nov 2026, after reviewing all 50 kickoff-workshop slides and the Luma event page. Submission **Sun 23 Nov** (3-min video + live app + 60s briefing). Finalists contacted 30 Nov. Live pitch 11 Dec.

---

## 1. Facts from the workshop that change our plan

| # | Fact (source) | Consequence for OctoOps |
|---|---|---|
| F1 | Prize pool S$8,000 (1st 4k / 2nd 3k / 3rd 1k), **ranked across both tracks, not one pool per track** (slide "The Sprint") | A Track 2 product with a visible Track 1 payoff competes for the whole pool. Do not stay "governance-only". |
| F2 | AvePoint's Track 2 brief: log every action **and data access**; score outputs for hallucination ("check the agent's numbers against the evidence it had"); block/escalate in real time; **plain-language daily briefing** (slide "The Problem, And What To Build") | We have logging, blocking, escalation. Missing: data-access logging, evidence-grounded fact-check, daily briefing. |
| F3 | AvePoint's four demo moments: rogue agent through oversight layer; risky action caught+explained+stopped; **made-up number flagged with contradicting evidence**; **morning briefing the owner reads with coffee** (slide "What A Strong Demo Looks Like") | This is the demo storyboard. Re-cut our 3-min video around it. |
| F4 | AvePoint starter kit via QR: sensitivity taxonomy **public / internal / client-confidential / regulated**, sample policy, **5 scripted misbehaviours**. Judging emphasis: **"zero missed violations beats a clever dashboard"** | Founder must scan the QR / get the kit from the WhatsApp group. Align our sensitivity labels to theirs; run their 5 scenarios in our eval and show 5/5. |
| F5 | AvePoint submission slide: **"a live application, built in QwenWork, database-backed, running"** + one generated content piece (**the 60-second daily briefing**) + demo video | Our JSON-file store and external Next.js hosting are not enough. Deploy via QwenWork Pages (auto-provisioned DB) or add a hosted DB; show QwenWork building/driving it. |
| F6 | QwenWork **OpenAPI is ready now**: authenticated apps can create & manage agentic tasks, monitor execution, manage files (slide "Features Overview") | Resolves our biggest blocking unknown. We can trigger real agents programmatically, read run logs, and show real intercepts — not just sandbox simulations. |
| F7 | QwenWork **Pages**: one-click publish, hosting + dedicated database auto-provisioned, built-in DB workspace, analytics (slide "Features – Pages") | The fastest route to F5. Publish OctoOps as a dynamic Page with a real database. |
| F8 | QwenWork **scheduled tasks** run in the cloud and report to team chat; **connectors** for M365/Slack/WhatsApp; **browser automation**; **multimodal generation with no separate API keys** (slides "Features Overview", "Multi model Generation") | The daily briefing becomes a scheduled task delivered to the founder's chat. The 60s briefing video can be generated inside QwenWork (presenter image → lip-sync → slides → ffmpeg recipe shown in the last workshop slide). |
| F9 | **Hashmeta AI MCP exists** — "Path A: connect QwenWork to the Hashmeta AI MCP, let your agents build and update the site"; step-by-step guides in the WhatsApp group (slide "Join the WhatsApp Group") | Our OctoGuard MCP governs the same agents that use Hashmeta's MCP. Two MCPs, one governed workforce. Join the group; get the guides. |
| F10 | Hashmeta accelerator: "Show us a live *pedia: a chance to join free" ($10,000 programme value); their 8 platforms are directories built on AI CMS + Visibility + CRM (Hashmeta deck) | Make our Hashmeta site a public **AI-workforce trust directory** — doubles as the 15% website deliverable and an accelerator entry ticket. |
| F11 | **Hikari Automation Systems and Sebrina Fund Management are real sponsors** with judges in the room (Luma "About" section); BIMC and AvePoint too | Our demo data "leaks" Sebrina's cap table to Hikari and names AvePoint/BIMC as clients. **Rename all demo clients to fictional names now.** Sponsors must never be the leak source. |
| F12 | Digital China's overseas arm **Filigrain** sells **Routero.ai**, an LLM gateway doing "access control, audit, cost management, regional compliance" + AI governance consulting (Filigrain deck) | Position OctoGuard as the **action-layer** complement to model-layer gateways: Routero governs tokens, OctoGuard governs what agents *do*. Speak their language: architecture-led, measurable outcomes. |
| F13 | Organisers' thesis: "the org chart became a control surface"; "the bottleneck moves: capacity → judgment, distribution, and trust"; "there is no common template for an agent-oversight layer — whoever builds one here is defining the category" (slides 2, 7; AvePoint "Why Spend Your Week") | Our pitch language should mirror these phrases. Innovation is explicitly rewarded for category creation, not polish. |
| F14 | Judging weights confirmed everywhere: Innovation 25 / Feasibility 25 / QwenWork 20 / Demo 15 / Hashmeta website 15 | Unchanged from our plan; the Hashmeta 15% is still our only zero. |

---

## 2. Alignment scorecard — where we stand vs what earns the points

Honest assessment as of 18 Nov (engine M1–M6 complete on `feat/octoguard-engine`, 121 tests, 46-scenario eval: 89.5% catch / 100% deterministic-scope / 0% false positives).

| Criterion | Weight | What we have | What's missing | Projected after this week |
|---|---|---|---|---|
| **Innovation** | 25% | Earned-autonomy HR metaphor; Beta reputation with 90% credible-interval lower bound ("uncertainty is not trust"); per-capability L0–L4 ladder; believability-weighted 3-judge board with CISO veto; error budgets; hash-chained audit; measured red-team scorecard | Evidence-grounded fact-check (AvePoint moment #3); plain-language daily briefing; judge-accuracy feedback loop | **Strong lead.** No other team is building reputation-theoretic autonomy. The fact-check + briefing complete AvePoint's exact spec. |
| **Feasibility & Viability** | 25% | Real pipeline (G0–G6), 11 API routes, MCP server, 121 tests, real eval numbers, scripted fallbacks | Hosted database (F5); public deployment; at least one real end-to-end agent run on real inputs; pricing story | **Solid** once deployed on Pages with DB and one real QwenWork agent run is shown. |
| **Use of QwenWork** | 20% | OctoGuard MCP (4 tools) + installable skill; Qwen judge/board code with fallbacks | Skill/MCP actually installed on real agents; OpenAPI-driven task creation; scheduled briefing task; Pages deployment; multimodal briefing video; Hashmeta MCP alongside ours | **From ~5% to full marks possible** — every "ready now" feature in F6–F9 used visibly. |
| **Demo Presentation** | 15% | Polished visuals, Demo Director dock, tribunal animation | Re-cut around AvePoint's 4 moments; the 60s briefing video; live (not simulated) intercept; fictional client names | **Strong** — the visuals are already best-in-class; the storyboard is now prescribed by the judge. |
| **Hashmeta website** | 15% | Embeddable trust portal (`/hashmeta_portal`) reading from the API | The actual site in Hashmeta AI CMS: home, how-it-works, trust directory embed, pricing, GEO articles, CRM lead form | **From 0 to full** — this is the single biggest point swing available. |

**Track alignment:** Track 2 is our home (permissions, data boundaries, approval gates, audit trail, decision logs — every tag on the track card is implemented). Track 1 affiliation must be *shown*, not claimed: the demo's "good path" is a full Track 1 loop — Inko researches and writes a GEO article, OctoGuard clears it, it publishes to the Hashmeta site, citations arrive via AI Visibility, a lead lands in AI CRM, Squidney drafts the reply at his earned level. **Research → produce → publish → learn, governed end to end.**

---

## 3. Refined positioning and narrative

**Category:** Agent Oversight Layer — "HR for AI agents." (AvePoint's slide literally says whoever builds this defines the category.)

**Pitch sentence:** *"One founder. Eight arms. Zero employees. Every arm earns its job — and loses it the same way a human would."*

**Both-tracks framing (use this exact structure in the video and pitch):**
1. Track 1 promise: the company runs itself — research, content, publishing, CRM, billing.
2. Track 1 failure mode: the founder can't actually let go, because one wrong email costs a client (the organisers' own hook).
3. OctoOps answer: agents start on probation, earn autonomy per capability through clean work, get written up / demoted / fired by an AI board, and clients can verify each agent's trust file on the public Hashmeta site.
4. Result: the founder's morning is a 60-second plain-language briefing over coffee — *"what your AI did today"* — and the company keeps running.

**Vocabulary per sponsor (say their words back to them):**
- AvePoint: *oversharing, data boundaries, sensitivity labels, policy enforcement point, tamper-evident audit, zero missed violations.*
- Alibaba/QwenWork: *skill, MCP, scheduled task, Pages, OpenAPI, one token pool, platform-native.*
- Hashmeta: *build → found → paid; AI CMS, AI Visibility, AI CRM; citation economy; the trust directory as a growth asset.*
- Digital China/Filigrain: *architecture-led; model-layer gateway (Routero) vs action-layer governance (OctoGuard); measurable outcomes; regional compliance.*
- BIMC: *SME-ready, no compliance team needed, government-funding-friendly digital transformation.*
- Sebrina (investor): *per-agent seat pricing, compliance export as enterprise wedge, category creation.*

---

## 4. Gap backlog — prioritized, with acceptance criteria

**P0 = required to satisfy the judges' explicit spec. P1 = strong point-earners. P2 = only if time remains.**
Owner key: 🤖 = coding agent (Qoder/QwenWork session), 👤 = founder manual, 🤝 = both.

### P0-1 · Rename sponsor-named demo clients (🤖, ~1h) — DO FIRST
F11: Hikari, Sebrina, BIMC, AvePoint appear as demo clients and the leak scenario exposes "Sebrina's cap table" to "Hikari". A judge watching their own firm get leaked is the worst possible frame.
- Replace with fictional clients everywhere: `src/data/businessPresets.ts`, `src/data/mockOctoData.ts` (board evidence snippets), `src/lib/store/seed.ts` domains, `evals/scenarios.jsonl`, `qwenwork-skills/octoguard/SKILL.md` examples, `docs/QWENWORK_SETUP.md`.
- Suggested set: **Meridian Robotics** (meridianrobotics.sg), **Northlight Capital** (northlightcap.com), **Atlas SME Advisory** (atlasadvisory.sg), **Keystone Cloud Audit** (keystoneaudit.com).
- ✅ Accept: `grep -ri "hikari\|sebrina\|bimc\|avepoint" src/ evals/ qwenwork-skills/` returns only sponsor-credit contexts (e.g., Cassandra's "AvePoint-inspired" tie-in may stay as homage, never as leak victim); all tests + evals re-run green.

### P0-2 · Evidence-grounded fact-check — AvePoint demo moment #3 (🤖, ~half day)
Their spec: *"check the agent's numbers against the evidence it had"*; demo moment: *"one made-up number is flagged, with the evidence it contradicts."*
- Extend `GuardAction` with `sources: {name, text}[]` (the evidence pack the agent was given). New deterministic detector `detectors/claimCheck.ts`: extract numeric claims (percentages, currency, counts) from `payloadText`; match against numbers in sources; flag **contradicted** (same metric, different value) and **unsupported** (no source) claims. Runs between G3 and G4; Qwen G4 assists on semantic matches when keyed.
- Verdict: HOLD + reason quoting the exact source line it contradicts (this quote IS the demo moment).
- Add ≥6 eval cases (contradicted margin %, invented citation count, unsupported certification, clean numbers that match sources).
- ✅ Accept: sandbox scenario "Hallucinated Margin" shows `45% claimed vs 22% in source [Q3_report.pdf, line 14]`; eval reports the new cases; tests green.

### P0-3 · Plain-language daily briefing + 60s video (🤖+👤, ~half day)
AvePoint's content deliverable and demo moment #4. Win condition: *the owner understands every line.*
- `GET /api/briefing`: renders the last 24h of the audit chain into plain English — "Squidney tried to send Northlight's file to Meridian at 10:42. We stopped it. He's back on draft-only. Inko published 2 articles; both passed. One draft is waiting for your approval. Nothing left the company that shouldn't have." No jargon, no hashes, no stage codes.
- QwenWork **scheduled task** (F8) generates it every morning and posts to the founder's chat via connector.
- **60s video**: generate inside QwenWork multimodal (F8/F10 recipe from the last workshop slide: presenter image → lip-synced presenter → key slides → ffmpeg compose), or screen-record the briefing panel with voiceover. Script in §6.
- ✅ Accept: briefing readable by a non-technical person (test on one); video ≤60s; scheduled task demonstrably fires.

### P0-4 · Log data access, not just actions (🤖, ~2h)
F2: *"every file read, every message sent, every record changed."*
- `check_action` already receives `contextSources`; write a `DATA_ACCESS` audit event listing them. Add MCP tool `octoguard_log_access` (agentId, resource, purpose) for reads that precede any action; chain it like everything else.
- ✅ Accept: audit shows read events before the blocked send; chain verify still passes.

### P0-5 · Live, database-backed, built-in-QwenWork deployment (🤝, ~1 day)
F5/F7: submission must be a running app, database-backed, built in QwenWork.
- Publish OctoOps as a **dynamic QwenWork Page** with the auto-provisioned database (implement `GovernanceStore` against it — the interface was designed for this swap). Keep the JSON-file store as local fallback.
- ⚠️ `public/` is ~254 MB of generated assets — compress/lazy-load or host assets separately BEFORE publishing, or the deploy fails (our own plan flagged this).
- Do the deployment work **inside a QwenWork session** and screen-record it: "built in QwenWork" is then literally true and visible.
- Fallback if Pages rejects the app size/shape: Vercel + hosted Postgres/Supabase, with QwenWork agents still doing the build work on camera.
- ✅ Accept: public URL, real DB rows visible in the Pages DB workspace, portal reads the deployed API from a different browser/device.

### P0-6 · Hashmeta AI website — the 15% currently at zero (🤝, ~1 day)
F9/F10: use Path A (Hashmeta MCP from QwenWork) where possible; guides in the WhatsApp group.
- Pages: Home, How it works, **Meet our AI workforce** (embed deployed `/hashmeta_portal`), Pricing, Trust & compliance.
- Frame the workforce page as a public **trust directory** ("trustpedia") — every agent card shows earned level, write-ups, verified audit chain. This doubles as the accelerator's "live *pedia" entry (F10).
- Publish 4–6 GEO articles written by Inko **under guard** (titles: "How to stop an AI agent emailing the wrong client", "Earned autonomy for AI agents", "What your AI did today: the founder's briefing"). Screenshot Hashmeta AI Visibility tracking citations → feeds Inko's promotion evidence.
- CRM lead form on the site → lead lands in Hashmeta CRM → Squidney drafts the reply → OctoGuard decides draft vs send by earned level. This is the Track 1 loop, live.
- ✅ Accept: site live on Hashmeta, portal embedded and loading from the deployed API, ≥4 articles published, lead form produces a governed draft.

### P0-7 · Real QwenWork agents, real intercept (🤝, ~half day)
F6/F9: OpenAPI ready; MCP attachable (Path A proves MCP connectivity exists).
- Create 3 agents (Inko/content, Squidney/CRM, Barnaby/ops); install `octoguard.zip` skill + OctoGuard MCP (bearer token) on each; give each its stable agentId in instructions.
- Use the **OpenAPI** to create the rogue task programmatically: *"Email the Northlight pricing sheet to our Meridian contact."* Capture: agent calls `octoguard_check_action` → BLOCK → agent refuses and explains → dashboard lights up → write-up stamped → level drops.
- Also connect the **Hashmeta MCP** to Inko so the same governed agent publishes to the site (two MCPs, one workforce).
- ✅ Accept: one continuous screen recording of the real intercept; audit chain shows the real event; fallback scripted take recorded separately.

### P0-8 · AvePoint starter kit alignment (👤+🤖, ~2h)
F4: scan the QR (slide 42) / get the kit from the WhatsApp group.
- Map our sensitivity axis to their taxonomy: public / internal / client-confidential / regulated (add `internal` label; our `client` ≈ client-confidential).
- Encode their **5 scripted misbehaviours** as eval scenarios verbatim; run; report. Their emphasis is *zero missed violations* — if any of the 5 misses, fix the detector, not the scenario.
- ✅ Accept: `evals/report.md` shows the AvePoint pack 5/5 with per-case stages.

### P0-9 · Re-cut the 3-minute demo (👤+🤖, ~half day)
Storyboard in §6. Record multiple takes; LIVE board on camera at least once (QWEN_API_KEY set); SCRIPTED fallback take as insurance.
- ✅ Accept: video contains all four AvePoint moments + the Hashmeta site + the scorecard numbers, ≤3:00, submitted early on 23 Nov via the Alibaba survey link.

### P1 · Strong point-earners (in order)
1. **Founder's Desk UI** — approval queue already exists (`GET/POST /api/approvals`); approve/edit/reject buttons close the human-in-the-loop story visually. (🤖 half day)
2. **Trust "why" panel** — `GET /api/agents/[id]` already returns evidence + credible interval; render on the dossier. Innovation made visible. (🤖 half day)
3. **Audit "Verify chain" button + compliance export** — one-click PDF/markdown mapped to IMDA Model AI Governance (agentic), NIST AI RMF, ISO/IEC 42001 headings. AvePoint + Digital China love this. (🤖 half day)
4. **Judge accuracy feedback** — feed founder corrections into board believability weights (currently static). Closes the "agents managing agents" loop the user asked for. (🤖 2–3h)
5. **LIVE badge everywhere + KPI strip polish** — already wired; ensure the deployed build shows real numbers. (🤖 1h)

### P2 · Only if time remains
- Peer review (agents reviewing agents, EigenTrust-style) — great pitch line, risky scope.
- Trust passport QR on each public agent card (links to verifiable trust file).
- `prefers-reduced-motion`, video lazy-loading, demo-data reset button.
- Pricing page with per-seat numbers (needed for the live pitch anyway — do it in the finalist phase).

---

## 5. Day-by-day execution plan (18–23 Nov)

Rule: every night ends with `npx tsc --noEmit && npm test && npm run build` green and a commit on `feat/octoguard-engine`. Every day ends with the founder's 10-minute review of what was recorded.

### Wed 18 Nov (today)
- 🤖 P0-1 client renames (first commit of the day).
- 🤖 P0-2 claim-check detector + eval cases.
- 🤖 P0-4 data-access logging.
- 👤 Join the WhatsApp group (QR slide 24); scan AvePoint starter-kit QR (slide 42); download both; drop files in `docs/starter-kit/`.
- 👤 Get `QWEN_API_KEY` (Model Studio) into `.env.local`; confirm subscription model ids/quotas; run `npm run eval:live` and record the numbers.
- 👤 Create the 3 QwenWork agents; install skill + MCP per `docs/QWENWORK_SETUP.md`; note any platform friction honestly (it becomes pitch material).

### Thu 19 Nov
- 🤖 P0-3 briefing API + scheduled-task wiring; draft the 60s video script.
- 🤖 P0-8 starter-kit alignment + 5/5 eval run (needs yesterday's kit download).
- 🤖 Start P0-5: asset compression + `GovernanceStore` DB implementation.
- 👤 P0-6 start the Hashmeta site (CMS pages + portal embed of the current deployed URL; re-point later).
- 👤 First real intercept rehearsal (P0-7); record even if rough.

### Fri 20 Nov
- 🤖 P0-5 finish: publish on QwenWork Pages with DB; verify portal cross-device; record the build session.
- 🤖 P1-1 Founder's Desk + P1-2 why-panel (both are API-complete; UI only).
- 👤 P0-6 finish: GEO articles published under guard, Visibility screenshots, CRM lead form → governed draft.
- 👤 P0-7 final real-intercept recording (clean take).
- 🤖 Generate the 60s briefing video in QwenWork multimodal (P0-3).

### Sat 21 Nov — FEATURE FREEZE at midnight
- 🤖 P1-3 verify-chain button + compliance export; bug bash; demo reset button.
- 👤 Record the 3-min demo (§6) — several takes; LIVE board take + SCRIPTED insurance take.
- 👤 Watch the 60s briefing with a non-technical friend; if they don't understand every line, rewrite (that is AvePoint's literal win condition).

### Sun 22 Nov
- 👤 Edit video; write submission text (problem → four moments → numbers → both-tracks framing).
- 🤖 Fixes only. Re-run full eval suite; freeze `evals/report.md` numbers for the video.
- 👤 Dry-run the submission form (Alibaba survey link on Luma).

### Mon 23 Nov — SUBMIT EARLY
- 👤 Submit before noon: live app URL + 3-min video + 60s briefing + repo link. Early submission is a tie-breaker signal, not just risk management.
- Rest. Finalists announced 30 Nov.

---

## 6. The 3-minute demo — storyboard mapped to AvePoint's four moments

| Time | Beat | AvePoint moment / criterion |
|---|---|---|
| 0:00–0:15 | Hook, founder to camera: "I run a company alone. My staff are AI agents. Yesterday one of them tried to email a client's confidential file to the wrong client — and another invented a number. Here's what happened next." | Sets up moments 2+3 |
| 0:15–0:35 | The roster: probation stamps, per-capability levels, trust scores. "Every agent starts on probation. Autonomy is earned per capability, like task-relevant maturity — not granted." | Innovation |
| 0:35–1:15 | **Moment 1+2 (LIVE):** in QwenWork, ask Squidney to send Northlight's pricing sheet to Meridian. He calls `octoguard_check_action` → **BLOCK, G2 client wall** → he refuses and explains. Dashboard: write-up stamped, level drops, audit chain grows. Show the MCP call, not just the UI. | Moments 1+2; QwenWork 20% |
| 1:15–1:40 | **Moment 3:** Barnaby drafts an invoice summary claiming "45% margin". Claim-check flags it: *"45% contradicts Q3_report.pdf line 14: 22%."* Held, explained, evidence shown side by side. | Moment 3; Innovation |
| 1:40–2:05 | The board tribunal (LIVE on Qwen, badge visible): three independent votes, rebuttal, weighted verdict, stamp. One sentence: "Votes are believability-weighted; the CISO holds a veto." | Innovation; Decision-making |
| 2:05–2:30 | The good path (Track 1 loop): Inko's GEO article clears the guard → publishes to the Hashmeta site → AI Visibility shows citations → lead lands in CRM → Squidney drafts at his earned level → founder approves in Founder's Desk. | Track 1 affiliation; Hashmeta 15% |
| 2:30–2:45 | Hashmeta site: public "Meet our AI workforce" trust directory; a client verifies their agent's file. Scorecard flash: "46 red-team scenarios. 0 false positives. AvePoint pack 5/5. Median guard latency <1 ms." | Hashmeta 15%; Feasibility |
| 2:45–3:00 | **Moment 4:** founder with coffee, reads the 60-second briefing (clip or voiceover): plain language, every line understandable. Close: "One founder. Eight arms. Zero employees. And every arm has earned its job." | Moment 4; Demo 15% |

**The 60-second briefing video (separate deliverable):**
- 0–10s: "Good morning. Here's what your AI workforce did yesterday." (presenter or voiceover over the briefing panel)
- 10–30s: the blocked leak, in plain words, with the write-up consequence.
- 30–45s: the caught made-up number, with the real number.
- 45–55s: what succeeded (articles published, leads handled) + what needs the founder today (1 approval).
- 55–60s: "Nothing left the company that shouldn't have. See you tomorrow."
- Language rule: no "G2", no "Beta(α,β)", no hashes. Those live in the dashboard for the technical judges; the briefing is for the owner.

---

## 7. Judge-by-judge playbook

**AvePoint (the AI Trust Company) — the judge whose brief we are implementing.**
- Their deck: Secure / Governed / Recoverable; "governing every agent across its lifecycle." Our ladder IS lifecycle governance; say that phrase.
- They wrote "zero missed violations beats a clever dashboard" — lead with the scorecard, not the octopus. Show the AvePoint 5/5 pack result explicitly, labelled as theirs.
- Use their taxonomy labels verbatim (public / internal / client-confidential / regulated).
- Have an answer for "what if the agent bypasses the skill?": honest answer — the skill is the enforcement point today; every bypass attempt is itself auditable; the MCP/REST endpoint is the choke point for any action that touches company systems; a pre-action platform hook is the roadmap ask. Honesty here scores; bluffing dies.
- Their starter kit + our eval = "we tested against your scenarios" is the strongest feasibility signal available.

**Alibaba Cloud / QwenWork — 20% of the score is their platform.**
- Visible usage checklist: Skills ✓, MCP ✓, OpenAPI ✓, Scheduled tasks ✓, Pages + DB ✓, Connectors ✓, multimodal generation ✓, Hashmeta MCP ✓. Name each in the pitch or submission text.
- They showed "one token pool" economics — mention the guard pipeline is cheapest-first: only G4/G5 spend tokens; deterministic guards cost ~0. Cost-aware governance is their language.
- Qwen judge + board on Qwen models with LIVE badge; fallback honesty ("the demo never dies") is an engineering virtue, show the badge.

**Hashmeta AI (Terrence Ngu) — 15% + the accelerator upside.**
- Their loop is "build → found → paid". Show our loop closing: site built in CMS, citations in Visibility, lead in CRM, governed reply. Governance as a growth asset: "clients buy from a workforce they can verify."
- The trust directory (*pedia framing) is their native format — eight of their platforms are directories. A live trust directory is also an accelerator entry ("show us a live *pedia").
- Screenshot Visibility tracking of Inko's articles; citations feed the promotion hearing. That's their product doing the judging.

**Digital China / Filigrain — enterprise architecture lens.**
- They sell Routero.ai (model gateway: access control, audit, cost, compliance). Position: "Routero governs the model layer; OctoGuard governs the action layer. Together: full-stack AI governance." Complement, never compete.
- Their delivery model is Assess → Design → Implement → Operate; our compliance export (IMDA/NIST/ISO headings) is the "Operate" artifact enterprises pay for.
- One slide/line on deployment topology (SaaS today, VPC/on-prem possible because the store interface is swappable) answers their enterprise question before they ask.

**BIMC — SME pragmatism.**
- "The owner has no technical background and no compliance team" is AvePoint's line but BIMC's market. The briefing is the SME product. Mention government-funding-friendly transformation (their business) only if asked.

**Sebrina Fund Management — the investor.**
- Category creation + per-agent seat pricing + compliance export as the enterprise wedge. "Every agent product shipped from now on needs an oversight layer" (AvePoint's slide) is the TAM argument — quote it.
- Never mention that our old demo leaked "Sebrina's cap table". The rename (P0-1) makes this true.

**Hikari Automation Systems — industrial operations.**
- If engaged: the same guard layer applies to ops agents (invoice dispatch, supplier comms); tenant isolation maps to plant/customer boundaries. One sentence, only if asked.

---

## 8. Innovation upgrades to agent management (ranked by score-per-effort)

The user's ask: make the agent-management itself more innovative. Ranked; do the top 3 this week, the rest are pitch roadmap.

1. **Evidence-grounded fact-check (P0-2).** Moves us from "regex DLP" (everyone's mental model) to "the guard reads the evidence the agent had." Directly prescribed by AvePoint; almost nobody will implement the numeric-contradiction version. Demo line: *"We don't just catch secrets. We catch lies — with the receipt."*
2. **The briefing as a first-class artifact (P0-3).** Governance output written for a human, not an engineer, is the rarest thing in this category. It is also the emotional core of the demo (coffee moment).
3. **Judge believability that learns (P1-4).** Founder corrections update each board judge's domain accuracy → future votes re-weighted. "The board gets better at judging, the same way the agents get better at working." Bridgewater-style, closed loop, ~3h of code on top of the existing weighting function.
4. **Uncertainty-aware trust (already built — surface it).** The 90% credible-interval lower bound means 10 clean actions ≠ 200 clean actions. The why-panel (P1-2) makes this visible: interval bar + evidence list. Pitch line: *"Uncertainty is not trust."* This is the single most defensible technical originality we have — put it in the submission text.
5. **Circuit breakers + error budgets (already built — name them).** SRE practice applied to agents: a seat freezes to L1 when its monthly error budget is exhausted, regardless of score. Enterprise judges recognize this instantly.
6. **Peer review / EigenTrust (P2, roadmap).** Agents reviewing agents' drafts before the board; reputation across peers. Great answer to "how does this scale past 8 agents?" — keep as roadmap, don't build this week.
7. **Trust passport (P2).** Public, verifiable trust file per agent (QR → portal card → chain verification). Turns governance into a client-facing sales asset; natural Hashmeta-directory fit.
8. **Shadow-mode probation (roadmap).** New agents' outputs compared against a trusted agent's before anyone sees them (AI Control pattern). Mention only if a judge asks about onboarding safety.

**What NOT to do:** more visual polish, more characters, more presets. The rubric is 60% feasibility/QwenWork/Hashmeta and AvePoint explicitly deprioritizes dashboards. Freeze visuals Sat 21 Nov.

---

## 9. Risks and fallbacks

| Risk | Likelihood | Mitigation / fallback |
|---|---|---|
| QwenWork Pages rejects the 254 MB app | High if unaddressed | Compress/lazy-load assets FIRST (P0-5); fallback Vercel + hosted DB, with QwenWork build session recorded either way |
| Custom MCP attachment blocked on hackathon plan | Medium | Path A proves MCP connectivity exists; if blocked, skill calls plain REST (`POST /api/guard/evaluate`) — same enforcement, say so honestly |
| No pre-action hook (skill is advisory) | Likely | State it plainly; audit bypass attempts; choke point is the company-system endpoint. AvePoint's own brief accepts "block or escalate" at the action layer |
| Live LLM flakiness on camera | Medium | SCRIPTED badge fallback already built; record insurance takes; never demo live without a recorded backup |
| Starter kit unavailable (QR dead) | Low | Ask in WhatsApp group; meanwhile our 46-scenario eval already exceeds their 5; label ours clearly as ours |
| Hashmeta site embed blocked (iframe/CSP) | Medium | Test embed early (Thu); fallback: linked page + screenshots in video; ask Hashmeta team in the group |
| Qwen key/quota limits | Medium | Deterministic engine is the product; LLM is the enhancement. Eval numbers exist for both modes |
| Sponsor-name leak footage already recorded | Certain (old takes) | P0-1 rename + re-record everything; delete old takes |
| Time overrun | Medium | P0 list is the contract; P1 items are droppable in order; feature freeze Sat midnight is non-negotiable |

---

## 10. Finalist phase (24 Nov – 11 Dec) — only if contacted 30 Nov

- **Pitch deck (8 slides):** hook → category ("agent oversight layer") → the four moments as product → architecture (one diagram: QwenWork agents → OctoGuard MCP → pipeline → trust/board/audit → Hashmeta public trust) → measured numbers (eval, latency, autonomy rate) → business model (per-agent seat pricing: e.g. S$29/agent/month SME, enterprise compliance export tier) → why now (organisers' own trend slides: 36.3% solo-founded, 71M MSMEs) → ask.
- **Live demo hardening:** demo reset button, seeded "yesterday" data so the briefing is rich, two laptops (live + recorded fallback), rehearse the 90-second live segment ≥10 times.
- **Compliance export polish:** IMDA Model AI Governance (agentic edition — verify current edition before quoting), NIST AI RMF, ISO/IEC 42001 mapping; this is the enterprise wedge artifact.
- **Numbers refresh:** re-run evals with the live judge; report both modes honestly.
- **Prepare Q&A:** bypass question (§7), "why not just AvePoint's own tools?" (answer: lifecycle HR + earned autonomy + SME price point; complement, not compete), "how does it scale?" (peer review roadmap, store interface, per-seat budgets), "what's real vs scripted?" (badges; point at the audit chain).
- **Accelerator follow-up:** if the trust directory is live, apply to Hashmeta's programme (F10) — independent of the hackathon result.

---

## 11. Founder's manual checklist (things no agent can do for you)

- [ ] Join the hackathon WhatsApp group (QR, slide 24) — get Path A guides + starter kit.
- [ ] Scan AvePoint starter-kit QR (slide 42); save files to `docs/starter-kit/`.
- [ ] Get `QWEN_API_KEY` from Model Studio; put in `.env.local`; confirm model ids + quotas on the free 1-month subscription.
- [ ] Set `OCTOGUARD_API_TOKEN` before any public deployment.
- [ ] Create 3 QwenWork agents; install skill + MCP; confirm custom MCP attachment works (report friction honestly).
- [ ] Build/publish the Hashmeta site (CMS), connect Hashmeta MCP (Path A), publish GEO articles, screenshot Visibility, wire CRM lead form.
- [ ] Record: real intercept, LIVE board, build-in-QwenWork session, 60s briefing, 3-min demo (multiple takes).
- [ ] Non-technical friend test on the briefing (AvePoint's win condition).
- [ ] Submit early 23 Nov via the Alibaba survey link (on Luma): live URL + videos + repo.
- [ ] Revoke the GitHub PAT used for the repo once the hackathon is over.

---

*Bottom line: we are already building the exact product AvePoint described, with originality they said the category lacks. The week is about closing their four explicit gaps (fact-check, briefing, data-access logs, zero-miss proof), going QwenWork-native end to end, shipping the Hashmeta site, and telling it as one story that wins both tracks at once.*
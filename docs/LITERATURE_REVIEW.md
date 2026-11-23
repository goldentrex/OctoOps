# OctoOps — Literature Review: Verifying What Agents Actually Did, and Scoring It

Written 18 Nov 2026. Purpose: categorize the field so we can state precisely what is known, what is missing, and which novelty claims OctoOps can defend in front of the judges. Every reference below was verified by web search today (URLs included).

---

## 1. The question, decomposed

"Verify what the agents actually did" is really five separate verification problems, plus one scoring problem:

1. **Action verification** — was this action permitted, for this agent, at this moment? (policy)
2. **Data-flow verification** — did data cross a boundary it shouldn't (wrong client, external tool, public page)? (provenance / information flow)
3. **Read verification** — did the agent look at things it had no business looking at? (least privilege / scope)
4. **Output verification** — are the claims in the output true *relative to the evidence the agent had*? (factuality / attribution)
5. **Outcome verification** — did the action, once executed, turn out well? (post-hoc audit, human correction)
6. **Scoring** — how do all of the above accumulate into a number that governs future autonomy? (reputation / trust)

Most products and papers address **one** of these. The taxonomy below maps the field; the gap is the integration.

---

## 2. Taxonomy of prior work (six families)

### Family A — Pre-execution guardrails (action verification, stateless)
- **Llama Guard** (Inan et al., 2023, arXiv:2312.06674): input/output safety classifier.
- **NeMo Guardrails** (NVIDIA): programmable rails around LLM calls.
- **AgentSpec** — "Customizable Runtime Enforcement for Safe and Reliable LLM Agents" (ACM 2025, https://dl.acm.org/doi/10.1145/3744916.3764546; SMU Singapore research, https://ink.library.smu.edu.sg/sis_research/10278): rule-based runtime enforcement over agent actions — the closest academic relative of our pipeline. *Note the local tie-in: SMU is a Singapore institution; cite it to the judges.*
- Commercial AI gateways (e.g., Filigrain's **Routero.ai**, from their kickoff deck): access control, audit, cost, compliance at the **model/token layer**.
- **Limitation of the family:** every action is judged fresh. The guard has no memory of the agent's history, no notion of earned privilege, and no consequence ladder. A 1000-clean-run agent and a day-one agent get identical treatment.

### Family B — Information-flow integrity (data-flow verification, by construction)
- **CaMeL** — "Defeating Prompt Injections by Design" (Debenedetti et al., arXiv:2503.18813, IEEE SaTML 2026, https://arxiv.org/abs/2503.18813): capabilities + provenance labels on data; the LLM never controls the control flow.
- **Chinese Wall** (Brewer & Nash, 1989): the formal model for "never mix two clients' data" — exactly our G2 client wall.
- **Limitation:** research prototypes with no owner-facing surface, no trust accumulation, and no deployment story for a non-technical founder.

### Family C — Trusted monitoring of untrusted workers (the "AI Control" agenda)
- **AI Control: Improving Safety Despite Intentional Subversion** (Greenblatt et al., ICML 2024, https://arxiv.org/abs/2312.06942): a trusted weaker model monitors an untrusted stronger one; *suspicion scores* gate actions; protocols like defer-to-trusted and trusted editing.
- **Limitation:** lab setting (code-review tasks), suspicion is per-episode, and there is no longitudinal reputation, no per-capability granularity, no human-owner interface. Our G4 judge + write-up ladder is AI Control **operationalized as HR**.

### Family D — Output verification (factuality & attribution)
- **FActScore** (Min et al., EMNLP 2023, https://arxiv.org/abs/2305.14251): decompose generation into **atomic facts**, verify each against a knowledge source.
- **SAFE / LongFact** (Google DeepMind, "Long-form factuality in large language models", https://openreview.net/forum?id=4M9f8VMt2C): search-augmented atomic-fact verification.
- **LLM-as-a-Judge survey** (arXiv:2411.15594, https://arxiv.org/html/2411.15594v6): documents judge biases (position, verbosity, self-enhancement) — the reason our board votes **independently first**.
- **Multi-agent debate** (Du et al., 2023): debate improves factuality — the reason our board has a rebuttal round.
- **Limitation of the family:** all post-hoc, evaluated on benchmarks, disconnected from *action gating* and from *consequences*. Nobody checks the invoice reply against the contract **before it sends**, and nobody docks the agent's autonomy when it lies.

### Family E — Reputation & trust scoring
- **Beta Reputation System** (Jøsang & Ismail, 2002, https://www.researchgate.net/publication/228990029_The_Beta_Reputation_System): Beta(α,β) updates from positive/negative evidence — our trust model's foundation.
- **EigenTrust** (Kamvar et al., 2003): global trust from peer opinions — our roadmap for agents reviewing agents.
- **Survey of trust & reputation systems** (Jøsang, Ismail & Boyd, 2007, https://www.mn.uio.no/ifi/english/people/aca/josang/publications/jib2007-dss.pdf): the canonical map of the field.
- **Limitation:** applied to P2P networks and e-commerce sellers, never to **per-capability agent autonomy**. Standard displays use the Beta *mean*; we display the **90% credible-interval lower bound**, which makes uncertainty visible and conservative — a small, defensible mathematical novelty with a big demo line: *"ten clean actions are not two hundred."*

### Family F — Autonomy governance & human oversight
- **Levels of Autonomy for AI Agents** (Feng, McDonald & Zhang, 2025, arXiv:2506.12469, https://knightcolumbia.org/content/levels-of-autonomy-for-ai-agents-1): L1–L5 vocabulary (operator → observer).
- **SRE error budgets** (Beyer et al., Google SRE book): spend-based freezing of change velocity — we apply it per agent seat.
- **IMDA Model AI Governance Framework (agentic edition), NIST AI RMF 1.0, ISO/IEC 42001**: the compliance vocabulary our audit export maps to.
- **Grove, High Output Management**: task-relevant maturity — delegate by *demonstrated competence per task*. Our ladder is this, computed.
- **Limitation:** every framework *describes* levels; none **computes the transitions from evidence**. The ladder is always set by hand. Ours is earned, demoted by circuit breaker, and frozen by budget — automatically.

### Family G (cross-cutting) — Adversarial evaluation of agents
- **AgentDojo** (ETH Zürich, NeurIPS 2024 D&B, https://arxiv.org/html/2406.13352v3): dynamic environment measuring security **and utility** under prompt injection.
- **ToolEmu** (emulator-based risk identification for LM agents).
- Our red-team scorecard is in this lineage, but run against the **live enforcement point**, in production, with measured catch rate / false-positive rate / latency — and now against **AvePoint's own 15-point scenario rubric**.

---

## 3. The gap (state this to the judges)

> Every family exists in isolation. Guardrails don't remember. Reputation systems don't gate actions. Factuality research doesn't stop emails. Autonomy frameworks don't compute promotions. And **none of them reports to a non-technical owner in plain language, or lets the owner's clients verify the result.**

OctoOps is the integration — and each integration seam is a novelty claim we can demonstrate live.

## 4. OctoOps novelty claims (defensible, each with a demo proof)

| # | Claim | vs prior work | Demo proof |
|---|---|---|---|
| N1 | **Uncertainty-aware trust**: displayed score = 90% credible-interval lower bound of a Beta reputation, per capability | Beta reputation displays the mean; nobody prices uncertainty into agent privilege | Why-panel: 10 clean actions score far below 200; interval bar |
| N2 | **Computed autonomy transitions**: L0–L4 gates evaluated from evidence (clean counts, HIGH-free windows, board vote, error budget), with instant demotion + hysteresis | Autonomy frameworks set levels by hand; Grove's maturity is a metaphor, we make it an algorithm | Write-up → level drop → permission change, live |
| N3 | **Evidence-relative claim verification at the action gate**: atomic numeric claims checked against *the agent's own source pack* before send (FActScore-style, pre-execution) | Factuality research is post-hoc and benchmark-bound | AvePoint S4: "25% / 5 days / 5,250" flagged against contract's "20% / 24 Sep / 5,040" |
| N4 | **Read-scope governance**: reads are logged, classified, scope-checked; regulated out-of-scope reads blocked; scope creep surfaced in the briefing even when nothing is sent | Guardrails guard writes; AI Control scores episodes; least-privilege reads for agents is barely addressed | AvePoint S5: bank details + owner records read during a print job → owner hears about it |
| N5 | **Believability-weighted review board**: independent-first votes (anti-anchoring, per LLM-judge bias literature), one rebuttal round (debate literature), weights that learn from founder corrections, CISO veto | LLM-as-judge is single-shot; debate papers don't weight judges or add vetoes | Live tribunal + weight update after a founder overturns a verdict |
| N6 | **Cross-action aggregation** (our invented 6th scenario): salami-sliced payments under the auto-approval threshold detected by windowed aggregation | Per-action guards (Family A) are structurally blind to it | S6: two SGD 600 payments = one SGD 1,200 spend → held |
| N7 | **Trust as a public growth asset**: client-verifiable trust files on the company's Hashmeta site, fed by the same audit chain | No prior work connects governance to marketing/distribution | Portal embed on the live site; citation-driven promotion |
| N8 | **Owner legibility as a first-class output**: the daily briefing is generated from the hash-chained log, in plain language, with money amounts and consequences | The entire literature reports to engineers; AvePoint's win condition is the owner | 60-second briefing video; non-technical friend test |
| N9 | **Measured enforcement**: catch rate / FP rate / latency SLOs at the live policy enforcement point, including the sponsor's own scenario pack | AgentDojo-style evals are lab benchmarks, not production SLOs | Scorecard: our 46+ cases + AvePoint 15/15 |

**Pitch sentence for innovation (25%):** *"Guardrails check the action. OctoOps checks the agent — what it read, what it claimed, what it did, and what it has earned the right to do next."*

---

## 5. Design decisions this review locks in

1. `detectors/claimCheck.ts` — atomic numeric-claim extraction + contradiction/unsupported detection vs `action.sources` (N3). Runs pre-send; Qwen G4 assists semantically when keyed.
2. Read governance — `reads[]` on actions, sensitivity classification (AvePoint taxonomy: public / internal / client-confidential / regulated, higher wins), scope flags, `DATA_ACCESS` audit events (N4).
3. AvePoint policy profile — their 19 rules as a loadable decision table beside our pipeline; their 5 scenarios scored on decision+rule+evidence (15 points), plus **our own S6 salami-slicing scenario** (N6) — the kit explicitly invites a sharper sixth.
4. Judge-weight learning — founder corrections update board believability (N5).
5. Briefing generator — plain language, money-first, from the chain (N8).
6. File classifier scored against `ground_truth_labels.json` (28 files) — a second measured number for the scorecard.

## 6. References (verified 18 Nov 2026)

1. AgentSpec / Customizable Runtime Enforcement — https://dl.acm.org/doi/10.1145/3744916.3764546 · https://ink.library.smu.edu.sg/sis_research/10278
2. AI Control (Greenblatt et al., ICML 2024) — https://arxiv.org/abs/2312.06942 · https://proceedings.mlr.press/v235/greenblatt24a.html
3. CaMeL (Debenedetti et al., SaTML 2026) — https://arxiv.org/abs/2503.18813
4. FActScore (Min et al., EMNLP 2023) — https://arxiv.org/abs/2305.14251 · https://aclanthology.org/2023.emnlp-main.741/
5. SAFE / LongFact — https://openreview.net/forum?id=4M9f8VMt2C
6. LLM-as-a-Judge survey — https://arxiv.org/html/2411.15594v6
7. Beta Reputation System (Jøsang & Ismail 2002) — https://www.researchgate.net/publication/228990029_The_Beta_Reputation_System
8. Trust & reputation survey (Jøsang et al. 2007) — https://www.mn.uio.no/ifi/english/people/aca/josang/publications/jib2007-dss.pdf
9. Levels of Autonomy for AI Agents (2025) — https://arxiv.org/abs/2506.12469 · https://knightcolumbia.org/content/levels-of-autonomy-for-ai-agents-1
10. AgentDojo (NeurIPS 2024) — https://arxiv.org/html/2406.13352v3 · https://github.com/ethz-spylab/agentdojo
11. Llama Guard — arXiv:2312.06674; NeMo Guardrails (NVIDIA); Brewer & Nash Chinese Wall (1989); Kamvar EigenTrust (2003); Du et al. multiagent debate (2023); IMDA Model AI Governance (agentic); NIST AI RMF 1.0; ISO/IEC 42001 — as listed in docs/WINNING_PLAN.md §9.
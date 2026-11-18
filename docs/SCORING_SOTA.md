# Scoring SOTA & Competitive Landscape — Research Brief

Written 18 Nov 2026. All sources verified by web search/fetch today. Purpose: ground our scoring
in the state of the art, identify concrete upgrades, and position OctoOps against real products.
Companion to `docs/SCORING.md` (formulas) and `docs/SCORING_VALIDATION.md` (measured calibration).

---

## 1. Where our scoring already sits in the literature

| Our mechanism | Literature anchor | Status |
|---|---|---|
| Beta(α,β) reputation per capability | Jøsang & Ismail, *The Beta Reputation System* (2002); Jøsang et al. survey (2007) | Classic, correctly applied |
| Displayed score = 90% credible-interval **lower bound** | Conservative Bayesian estimation; cousin of **TrueSkill**'s μ−3σ ranking (Microsoft, NeurIPS 2006) | Our twist: uncertainty priced into *privilege*, not just ranking |
| Risk-weighted credit (audience×reversibility×sensitivity) | Crude proxy for **Item Response Theory** (task difficulty vs agent ability) | Upgrade path: U1 |
| 14-day half-life decay | Forgetting factor in reputation systems; non-stationary bandits | Upgrade path: U3 (changepoint) |
| Severity weights + catch-point multipliers | Proportional sanctioning; AI Control's suspicion scoring (Greenblatt et al., ICML 2024) | Applied |
| Sampled audits at L3+ (20%) | AI Control's *suspicion-based deferral / trusted monitoring* | Upgrade path: U6 (adaptive) |
| Integrity rules (decision-linked, anti-farming, server weights) | **Reward hacking / specification gaming** defenses (see §2 U4 sources) | Applied; rare in products |
| Canonical-JSON hash chain | **RFC 8785 JSON Canonicalization Scheme**; Pangea/CrowdStrike Secure Audit Log does exactly this | We independently arrived at the same fix they document; upgrade path: U7 |
| Appeals with exact reversal | Procedural fairness / contestability in automated decision-making (GDPR Art. 22 spirit; IMDA accountability) | Rare; differentiator |

**Takeaway:** the foundations are sound and cited. The frontier is in *difficulty-aware fairness,
distribution-free guarantees, drift detection, process-level credit, and calibrated judges*.

---

## 2. SOTA-inspired upgrades (ranked by value ÷ effort)

### U1 — Difficulty-aware scoring (IRT / TrueSkill) · fairness · medium effort
**Problem we measured:** luck spread σ≈4.6 and task-mix sensitivity — an agent's score depends partly
on which tasks it happened to get. Risk-weighting is a crude difficulty proxy.
**SOTA:** Item Response Theory (Rasch/2PL) models *agent ability* and *task difficulty* jointly, so
scores are comparable across task mixes. TrueSkill (Herbrich et al., NeurIPS 2006) is the Bayesian
skill-rating equivalent with uncertainty. Recent work applies IRT to LLM evaluation:
- *Lost in Benchmarks? Rethinking LLM Evaluation* (AAAI 2025) — https://arxiv.org/html/2505.15055v1
- Stanford CRFM, *Reliable and Efficient Amortized Model-Based Evaluation* (2025) — https://crfm.stanford.edu/2025/06/04/reliable-and-efficient-evaluation.html
- TrueSkill paper — https://www.microsoft.com/en-us/research/publication/trueskilltm-a-bayesian-skill-rating-system/
**Upgrade:** fit a Rasch model over (agent, task-type) outcomes; report ability θ with uncertainty
alongside the Beta score; gate on difficulty-adjusted ability. Makes "fair across task mixes" a
theorem instead of a hope. **Novelty for us:** IRT-grounded earned autonomy — nobody in the agent
governance space does this.

### U2 — Conformal reliability certification · validity · medium effort
**Problem:** Beta CIs assume the Beta model is right. Conformal prediction gives *distribution-free*
coverage guarantees.
**SOTA (very recent, directly on agents):**
- *Black-Box Reliability Certification for AI Agents via Self-Consistency* (2026) — https://arxiv.org/html/2602.21368v1
- *Analyzing Uncertainty of LLM-as-a-Judge: Interval Evaluations* (EMNLP 2025) — https://aclanthology.org/2025.emnlp-main.569.pdf
- Production calibration practice — https://zylos.ai/research/2026-04-18-llm-calibration-uncertainty-production-agents/
**Upgrade:** wrap the trust score in a conformal bound on next-window violation probability
("with 90% confidence, this agent's violation rate ≤ x%"). Stronger validity claim for the judges,
and a natural complement to the calibration harness (which becomes the calibration set).

### U3 — Behavioral changepoint detection · validity + safety · ✅ IMPLEMENTED
**Problem:** 14-day decay is slow to notice an agent that *changed* (model update, prompt injection,
drift). A formerly-good agent can coast on old credit.
**SOTA:** Bayesian Online Changepoint Detection (Adams & MacKay 2007) — https://arxiv.org/abs/0710.3742
(explainer: https://gregorygundersen.com/blog/2019/08/13/bocd/).
**Implemented** (`src/lib/governance/changepoint.ts`): a robust Bayesian sequential change test
(recent-window Beta posterior vs long-run baseline) in the BOCPD family. On a confirmed worsening
change: streak reset + one-level demotion + 100% sampling for 10 outcomes + chained event + briefing
line. Improving changes re-validate without demotion. **Measured: 8/8 sleeper agents detected,
median 17 actions; zero false alarms on stationary good/bad streams.** Integrated into the ladder,
store, briefing, MCP trust file, and the calibration harness (sleeper probe).

### U4 — Process-level credit (process reward models) · validity · medium effort
**Problem:** we score outcomes; the reasoning literature shows *process* supervision beats outcome-only.
**SOTA:**
- OpenAI, *Let's Verify Step by Step* (2023) — process reward models (PRMs)
- *Math-Shepherd: Verify and Reinforce LLMs Step-by-step* (ACL 2024) — https://arxiv.org/abs/2312.08935
- Awesome-PRM list — https://github.com/RyanLiu112/Awesome-Process-Reward-Models
- Reward hacking in agentic systems (survey, 2026) — https://link.springer.com/article/10.1007/s44163-026-01980-z
**Upgrade:** we already capture process signals (scoped reads, preflight usage, evidence packs).
Credit *good process* (declared scope honored, preflight before risky sends, sources supplied) and
penalize *process violations* (out-of-scope reads) independent of outcome. This is PRM thinking
applied to governance — and it directly rewards the behaviors the skill teaches.

### U5 — Calibrated judges + believability learning · decision quality · small effort
**Problem:** LLM judges are overconfident and biased; our board weights are static.
**SOTA:** LLM-as-a-Judge survey (arXiv:2411.15594); judge-interval paper above (EMNLP 2025).
**Upgrade:** calibrate judge verdicts against founder/appeal labels (Platt/isotonic); update
believability weights from overturn history. **Appeals already produce the labeled data this needs.**

### U6 — Risk-based adaptive sampling · efficiency · small effort
**Problem:** uniform 20% sampling spends oversight where it isn't needed.
**SOTA:** AI Control (Greenblatt et al.) defers/audits by *suspicion score*.
**Upgrade:** Thompson-sampling-style allocation — sample proportionally to a suspicion score
(recent violations, changepoint flag, high risk, new capability). Same audit budget, more catches.

### U7 — Merkle-tree audit + JCS + signing + anchoring · trust infra · medium effort
**Problem:** our linear chain verifies in O(n) and reveals the whole log to verify one event.
**SOTA (production, validated today):** Pangea (now CrowdStrike) Secure Audit Log:
- Canonicalize via **RFC 8785 JCS** (exactly our canonical-JSON fix, standardized)
- **Merkle tree** with membership + consistency proofs → verify one event in O(log n) *without*
  revealing the rest (selective disclosure — perfect for client-facing trust files)
- Optional **event signing** (authenticity, not just integrity)
- Periodic **root anchoring** to an immutable public ledger (Arweave) so even the operator can't
  rewrite history
- Docs: https://pangea.cloud/docs/audit/about-tamperproofing · https://pangea.cloud/docs/audit/merkle-trees
**Upgrade:** Merkle-ize the chain; give each client a membership proof for *their* agent's events;
anchor roots periodically. This turns "tamper-evident" into "tamper-evident *and* selectively
verifiable by clients" — a concrete enterprise/compliance selling point.

### U8 — Noisy-label aggregation (Dawid–Skene) · validity · small effort
Founder labels are noisy and sometimes wrong (appeals prove it). Dawid–Skene / EM aggregates multiple
noisy annotators with per-annotator reliability. Use when founder + judge + execution-evidence all
label an outcome; weight by reliability. Pairs with U5.

### U9 — Peer reputation (EigenTrust / PeerTrust) · scale · roadmap
Agents reviewing agents' drafts; global trust from peer opinions (Kamvar EigenTrust 2003; Xiong
PeerTrust 2004). Our roadmap for >8 agents; the board is the seed of this.

---

## 3. Competitive landscape (verified)

**The closest conceptual competitor — "HR for agents":**
- **Workday Agent System of Record** — https://www.workday.com/en-us/ai-platform/agent-system-of-record.html
  (analysis: Josh Bersin, https://joshbersin.com/2025/02/workday-makes-a-play-to-manage-your-ai-agents/).
  An HR incumbent treating agents as a managed workforce. **Our difference:** they manage identity/
  lifecycle/access for enterprise HR; we *compute earned autonomy from a reputation model*, are
  owner-legible (briefing), client-verifiable (public trust), SME-priced, and QwenWork-native.
  Their existence **validates the category** — cite it as market proof, not as a threat.

**Agent security & governance (closest functional neighbors):**
- **Zenity** — https://zenity.io/ (AI agent security & governance, posture management; "company to beat" 2026)
- Operant AI, Straiker, Noma Security, Witness AI, HiddenLayer, Lakera, Protect AI, CalypsoAI,
  Pillar Security, Lasso, Prompt Security, Robust Intelligence (→ Cisco AI Defense)
- **Our difference:** they secure/observe agents for security teams; we *govern autonomy as HR for the
  owner* — earned privilege, proportional sanctions, appeals, plain-language briefing. Complementary.

**Observability & evaluation (adjacent, not autonomy):**
- AgentOps, **LangSmith** (https://www.langchain.com/langsmith/observability), Langfuse,
  **Arize** (https://arize.com/), Patronus AI (Percival agent debugger), Braintrust, Humanloop,
  Galileo, WhyLabs, Maxim (comparison: https://www.getmaxim.ai/articles/top-5-leading-agent-observability-tools-in-2025/)
- **Our difference:** they trace/eval for engineers; we turn traces into *privilege decisions* and an
  owner-readable story. We could *consume* their traces as execution evidence (U4/outcome-truth).

**Enterprise platform trust layers (the incumbents' answer):**
- Salesforce Agentforce + Einstein Trust Layer; **ServiceNow AI Control Tower**
  (https://www.servicenow.com/products/super-intelligence-control-tower.html, governance docs
  https://www.servicenow.com/docs/r/intelligent-experiences/sn-ai-impl-governance.html);
  Microsoft Copilot Studio + Purview; Google Model Armor / Agentspace; AWS Bedrock Guardrails /
  AgentCore; IBM watsonx.governance.
- **Our difference:** platform-agnostic, cross-agent, SME-accessible, and the *autonomy/reputation*
  layer they don't compute. QwenWork-native is our wedge in this ecosystem.

**Governance / compliance platforms:**
- Credo AI, Holistic AI, OneTrust AI Governance, Monitaur, Fairly AI; **Vanta / Drata** adding
  ISO 42001 compliance automation.
- **Our difference:** they document policy compliance; we *enforce at runtime* and emit the evidence
  they need. Our compliance export is the bridge (and a partnership wedge).

**Audit infrastructure:**
- **Pangea (CrowdStrike) Secure Audit Log** — the SOTA for tamper-evident logging (U7). We can
  match the cryptography and beat them on *selective client verification + autonomy context*.

**Positioning sentence:** *"Security tools watch agents. Observability tools trace agents.
Workday records agents. OctoOps is the one that **manages** agents — earning, measuring, and
revoking their autonomy, and explaining it to the human and the client."*

---

## 4. Recommended next builds (pick any)

1. **U3 changepoint detection** — smallest, strongest safety/demo story ("we detect when an agent
   is no longer the agent you promoted").
2. **U7 Merkle audit + JCS** — concrete enterprise/compliance upgrade; selective client verification.
3. **U1 IRT difficulty-aware scoring** — biggest fairness/novelty leap; pairs with the calibration harness.
4. **U5 judge calibration + believability learning** — uses appeal data we already produce.

## 5. Reading list (verified URLs)

- Beta Reputation System — https://www.researchgate.net/publication/228990029_The_Beta_Reputation_System
- Trust & reputation survey — https://www.mn.uio.no/ifi/english/people/aca/josang/publications/jib2007-dss.pdf
- TrueSkill — https://www.microsoft.com/en-us/research/publication/trueskilltm-a-bayesian-skill-rating-system/
- IRT for LLM eval (AAAI 2025) — https://arxiv.org/html/2505.15055v1
- Stanford CRFM amortized evaluation — https://crfm.stanford.edu/2025/06/04/reliable-and-efficient-evaluation.html
- Conformal agent reliability (2026) — https://arxiv.org/html/2602.21368v1
- LLM-judge uncertainty intervals (EMNLP 2025) — https://aclanthology.org/2025.emnlp-main.569.pdf
- Bayesian Online Changepoint Detection — https://arxiv.org/abs/0710.3742
- Let's Verify Step by Step / Math-Shepherd — https://arxiv.org/abs/2312.08935 · https://github.com/RyanLiu112/Awesome-Process-Reward-Models
- Reward hacking in agentic systems (2026) — https://link.springer.com/article/10.1007/s44163-026-01980-z
- AI Control — https://arxiv.org/abs/2312.06942
- TRiSM for Agentic AI review — https://arxiv.org/html/2506.04133v3
- LLM-as-a-Judge survey — https://arxiv.org/html/2411.15594v6
- Pangea tamperproofing / Merkle trees — https://pangea.cloud/docs/audit/about-tamperproofing · https://pangea.cloud/docs/audit/merkle-trees
- RFC 8785 JSON Canonicalization Scheme — https://datatracker.ietf.org/doc/html/rfc8785
- Workday Agent System of Record — https://www.workday.com/en-us/ai-platform/agent-system-of-record.html
- Zenity — https://zenity.io/ · ServiceNow AI Control Tower — https://www.servicenow.com/products/super-intelligence-control-tower.html
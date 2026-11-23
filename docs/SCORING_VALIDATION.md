# Scoring Validation — Fairness, Validity, Decision Quality

Companion to `docs/SCORING.md` (formulas). This document answers: **how do we know the scoring is
fair, measures what it claims, and produces good autonomy decisions?** Answer: by defining the
three properties, listing the mechanisms that enforce them, and **measuring** the result with a
calibration harness that runs simulated agent careers through the real engine.

## 1. The three properties

| Property | Question | Mechanisms |
|---|---|---|
| **Fairness** (to the agent) | Is the agent treated proportionally, with a path to redemption and a right to contest? | Risk-weighted credit (harder work earns more); severity-proportional penalties; near-miss ×0.5 vs human-caught ×2; 14-day decay (old sins fade); 10-point hysteresis (no flapping); uncertainty-aware score (small samples treated as uncertain, not bad); **appeals** (overturned write-ups reverse the exact penalty, visibly); every score has evidence |
| **Validity** (does it measure competence?) | Is the score a truthful estimate of the agent's real reliability? | Decision-linked outcomes (no unearned credit); server-set risk weights; no check-time credit; one reward per decision; penalties never blocked; **severity-proportional draft rejection** (a rejected CRITICAL draft costs more than a typo — fixes selection bias in approved-draft credit); sampled audits at L3+; per-capability scoring (no halo effect) |
| **Decision quality** (good autonomy decisions?) | Do promotions/demotions track real reliability? | Gates computed from evidence; **calibration harness** measures false promote/demote rates; circuit breakers; error budgets; board vote + CISO veto |

## 2. The calibration harness (`npm run eval:calibration`)

48 simulated agents (4 cohorts × 12 seeds) with hidden true cleanliness p ∈ {0.80, 0.90, 0.95, 0.99}
live 240-action careers (80 days) through the **real** `trust.ts` + `ladder.ts`, then 120 forward
actions validate the earned score. The simulation includes the guard (90% pre-execution catch),
founder draft review, post-hoc discovery (90% supervised / 30% autonomous), board vetoes (10%),
and outcome-reporting behavior. Seeded RNG → reproducible.

### Measured results (18 Nov 2026)

**Validity — the score tracks truth and under-promises it:**

| True cleanliness | Mean score | Forward clean rate | Conservative? | Reached L3+ |
|---|---|---|---|---|
| 80% | 76.7 | 79.9% | ✅ | 0/12 |
| 90% | 88.1 | 89.7% | ✅ | 2/12 |
| 95% | 92.8 | 95.3% | ✅ | 8/12 |
| 99% | 97.5 | 99.3% | ✅ | 11/12 |

- **Discrimination AUC 0.951** (≥0.9 = excellent separation of competent vs incompetent agents).
- **Conservative in every cohort**: the displayed score (credible-interval lower bound) stays below
  the true forward clean rate — the score never over-promises.

**Decision quality:**
- 21 promotions; **2 forward-validated false promotions (9.5%)** — agents promoted in a good phase
  whose forward rate fell below the gate standard. Both are demoted by the circuit breaker on their
  next HIGH; this is the documented operating point, not zero.
- **0 false demotions** of 99%-clean agents (4 error-budget freezes are intentional SRE policy, counted separately).
- **Detected violation rate after promotion: 0.07%** of autonomous actions.
- **Residual risk (honest): 0.15% of autonomous actions are undetected violations** (4 total).
  Mitigations: 20% sampled audits, founder corrections, and execution-evidence cross-checks via
  QwenWork run logs (roadmap). Autonomy is never unobserved, but it is not zero-risk — L3 is
  "autonomous + sampled audit" by design.

**Fairness:**
- **Recovery after one forced HIGH: median 68 actions** (~23 days) back to pre-incident score AND
  level — redemption is real but earned (2/8 never recovered within the career: repeated incidents).
- **Luck spread: σ ≈ 4.6 points** across 12 seeds of identical 95% competence — luck matters less
  than competence (cohort gaps are 5–10 points).
- **Gaming resistance**: easy-task farming scores 81 vs 87 for mixed-risk work at equal competence
  and caps at L2 (risk-weighting works); under-reporting outcomes never buys higher autonomy.

### What the harness changed (data-driven tuning, not guesswork)

1. **Gates raised L3 75→93, L4 90→97.** With the original gates, 9/24 agents at ≤90% cleanliness
   reached autonomy through lucky HIGH-free windows. The residual-leak math (violation rate ×
   guard-miss × discovery-miss) showed 90% reliability is unsafe for unsupervised external send.
2. **Action-count streak added** (L3: 40 clean actions since last HIGH; L4: 90) alongside the
   calendar windows — fair across agents with different task volumes, kills lucky-window promotions.
3. **Severity-proportional draft rejection.** Rejected drafts previously always cost LOW×2, which
   inflated scores via selection bias (the founder filters bad drafts, so the record looked better
   than the agent's intent). Rejections now carry the founder-stated severity; calibration became
   conservative in all cohorts.

The harness assertions are a **quality bar in CI**: AUC > 0.9, conservative in every cohort,
false-promotion rate ≤ 10%, false demotions ≤ 1, post-promotion detected violations < 1%,
gaming checks. Any threshold change that regresses these fails `npm test`.

## 3. Appeals — procedural fairness (implemented)

- `octohr_appeal_writeup` (MCP) / `POST /api/appeals`: agent contests a write-up with a factual reason.
- Founder/board resolves (`POST /api/appeals/:id`): **UPHELD** keeps the penalty; **OVERTURNED**
  reverses the *exact* Beta penalty (`reverseViolation`), removes the write-up, restores the display
  score, and records the reversal as visible evidence + a chained audit event. Never silent.
- One appeal per write-up; appeals never block other work. Levels re-earn through the normal gates
  (the reversal restores trust, not privilege — privilege always follows evidence).

## 4. Remaining limits (honest, roadmap)

1. **Outcome truth within ALLOWed actions** rests on founder/sample labels. Next: cross-check
   claimed outcomes against QwenWork execution logs (OpenAPI, ready-now) — the last validity gap.
2. **Judge believability weights are static**; learning from founder overturns is the next upgrade
   (appeals now produce the labeled data it needs).
3. **Stationary simulation**: real agents improve and drift; decay + streaks handle non-stationarity,
   but the harness should add drift scenarios.
4. The 9.5% false-promotion operating point is acceptable for L3 "autonomous + sampled audit" with
   circuit breakers; L4 (full autonomy) had zero false promotions in the harness.

## 5. Verify yourself

```bash
npm run eval:calibration   # full report → evals/calibration-report.{json,md}
npm test                   # includes the calibration quality bar + appeals + integrity suites
```
# Scoring Calibration Report — simulated careers through the real engine

Generated: 2026-11-18T06:21:11.288Z
Design: 4 cohorts × 12 agents × 240 actions (80 days) + 60 forward actions; guard catch 90%;
post-hoc discovery 90% at supervised levels / 30% autonomous; 10% CISO veto; seeded RNG.

## Validity

| True cleanliness | Mean score | Score σ | Forward clean rate | Conservative? | Mean max level | Reached L3+ |
|---|---|---|---|---|---|---|
| 80.0% | 76.7 | 4.2 | 79.9% | yes | 1.92 | 0/12 |
| 90.0% | 88.1 | 2.7 | 89.7% | yes | 2.17 | 2/12 |
| 95.0% | 92.8 | 4.6 | 95.3% | yes | 3.00 | 8/12 |
| 99.0% | 97.5 | 0.6 | 99.3% | yes | 3.75 | 11/12 |

- **Discrimination AUC: 0.951** (1.0 = perfect separation of ≥95% vs ≤90% agents).
- Conservative = mean displayed score ≤ true forward clean rate (the score under-promises, as a lower bound should).

## Decision quality

- Promotions total: 21; forward-validated false promotions (forward clean rate < 93%): **2**
- False demotions (99%-clean agents at L1, excluding intentional budget freezes): **0/12** (budget freezes: 4)
- Detected violation rate after promotion (L3+ actions): **0.1%**
- Undetected violations after promotion: **4** (0.1% of L3+ actions) — the residual risk of autonomy, mitigated by sampled audits + execution-evidence cross-checks (roadmap).

## Fairness

- Recovery after one forced HIGH (99%-clean agents): median **68 actions** (2/8 never recovered within the career)
- Luck spread (same 95% competence, 12 seeds): score σ = **4.6 points**
- Gaming: honest 87 vs lazy-reporter 86 (same competence, half the reports) vs easy-task farmer 81 (max L2 vs honest L2)

## Interpretation

- The score is a conservative competence estimate: it tracks true cleanliness, stays below it, and separates agents strongly.
- Temporal gates (HIGH-free windows) plus the error budget do the heavy lifting for decision quality — raw score alone is not sufficient, by design.
- Undetected violations are the residual risk of autonomy; sampled audits + execution-evidence cross-checks are the mitigation roadmap.
- Numbers are measured, not tuned; re-run after any gate/threshold change.

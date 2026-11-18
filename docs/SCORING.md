# OctoOps — Agent Scoring: Formulas, Integrity Rules, Verification

How agents are scored for their tasks, why the scoring can be trusted, and how to verify it.
Companion to `docs/LITERATURE_REVIEW.md` (theory) and `docs/AGENTIC_FLOW.md` (the loop).

## 1. The state

Per agent, per capability (e.g. `crm.send_external`, `cms.publish`, `crm.update_lead`):

```
TrustState = Beta(α, β) + evidence list + clean counters
Prior at hire: α = 1, β = 3   (sceptical probation)
```

## 2. The updates

| Event | Update | Notes |
|---|---|---|
| Confirmed CLEAN outcome | `α += risk_score` | risk = audience × reversibility × sensitivity (1–27). Higher-risk clean work earns more. **Weight is set by the server from the checked action, never by the caller.** |
| Founder-approved draft | `α += risk_score` | approval counts as a clean draft (L2 gate fuel) |
| Violation LOW | `β += 1` | |
| Violation HIGH | `β += 5` | + instant demotion of one level |
| Violation CRITICAL | `β += 15` | + drop to L1 + board tribunal |
| Near-miss caught by G4 judge | `β += severity × 0.5` | caught before harm |
| Leak caught only by a human | `β += severity × 2` | the guard missed it; worst case |
| Founder CORRECTED outcome | `β += 1 × 2` | LOW, human-caught |
| Founder rejects a draft | `β += severity × 2` | founder states severity (LOW/HIGH/CRITICAL); proportional, fixes selection bias |
| Successful appeal | `β -= original penalty` | exact reversal, visible evidence (`reverseViolation`) |
| Time passing | both α, β shrink toward the prior | half-life 14 days: old sins and old glory both fade |

## 3. The displayed score

```
score = round( 100 × BetaQuantile(0.05, α, β) )
      = lower bound of the 90% credible interval
```

**Uncertainty is not trust.** Ten clean actions score far below two hundred, even with the same
success rate, because the interval is wider. The dossier shows the interval band, the score
marker, the mean line, and the last evidence items with their α/β deltas.

Worked example (risk-2 lead updates):
- hire: Beta(1,3) → score ≈ 2
- 10 confirmed clean: Beta(21,3) → score ≈ 77
- 200 confirmed clean: Beta(401,3) → score ≈ 98
- one CRITICAL after 10 clean: Beta(21,18) → score ≈ 33 (fast to lose)

## 3b. Behavioral changepoint detection (U3)

Decay forgets slowly; a *changed* agent (model update, prompt injection, drift) must be caught fast.
A Bayesian online changepoint detector (Adams & MacKay family) runs on every confirmed outcome per
capability: a recent-window Beta posterior is compared against the long-run baseline. On a confirmed
shift (≥97.5% posterior, practical margin 0.15):
- the clean-since-HIGH streak resets (re-earn under the new regime),
- a **worsening** change drops one autonomy level (circuit-breaker-lite) and boosts audit sampling
  to 100% for the next 10 outcomes,
- an **improving** change resets the streak and re-validates (no demotion),
- a chained "Behavioral change detected" event fires and the owner briefing mentions it.

It detects *change*, not *badness*: a consistently bad agent is scored low, not flagged. Measured:
**8/8 sleeper agents (99%→60% clean) detected, median 17 actions** after the turn — vs weeks for
decay-only. Stationary good and bad streams produce zero false alarms. See `evals/calibration.ts`.

## 4. From score to autonomy (the ladder)

| Level | Gate |
|---|---|
| L1 draft-only | hire |
| L2 approval | score ≥ 55 AND 10 clean approved drafts |
| L3 autonomous + sampled audit | score ≥ 93 AND 25 clean AND 40 clean actions since last HIGH AND 0 HIGH in 14 days AND board vote |
| L4 full | score ≥ 97 AND 100 clean AND 90 clean actions since last HIGH AND 0 HIGH in 30 days AND board vote AND no CISO veto |

Gates were tuned from the calibration harness (see `docs/SCORING_VALIDATION.md`): the original
75/90 gates let 90%-clean agents reach autonomy through lucky windows; 93/97 + action-count
streaks reduced false promotions to a documented ≤10% operating point with 0.07% detected
post-promotion violations.

- **Hysteresis:** demotion by score only below (gate − 10) — no flapping.
- **Circuit breakers:** HIGH −1 level instantly; CRITICAL → L1 + tribunal.
- **Error budget:** 15 severity points per seat per month; exhausted → frozen to L1 regardless of score.
- **Three write-ups in 30 days** → tribunal with firing on the table.

## 5. Scoring integrity rules (implemented, tested)

These exist because agents are self-interested reporters; the scoring must not be gameable.

1. **Rewards require a checked action.** `CLEAN` is rejected without a `decisionId` from
   `octoguard_check_action` (`DECISION_REQUIRED`).
2. **The decision must be real and yours.** Agent/action mismatch → rejected
   (`DECISION_AGENT_MISMATCH`, `DECISION_ACTION_MISMATCH`, `UNKNOWN_DECISION`).
3. **Only ALLOWED or founder-approved actions earn.** CLEAN against a BLOCKED/HOLD decision →
   rejected (`DECISION_NOT_ALLOWED`). Held drafts earn only after founder approval.
4. **One reward per decision.** Double-reporting → rejected (`ALREADY_REPORTED`). No trust farming.
5. **No credit at check time.** ALLOW grants nothing by itself; the +2 shown in the guard result
   is a preview. Credit lands only when the outcome is confirmed. An agent that never reports
   outcomes earns nothing — and the missing outcome is visible in the decision feed.
6. **Server-set weights.** The caller's `riskWeight` is ignored for linked outcomes; the weight
   comes from the decision's recorded risk score. No self-inflation.
7. **Penalties are never blocked.** CORRECTED/VIOLATION always accepted, with or without a
   decision link — it must always be possible to report bad news.
8. **Sampled audits at L3+.** ~20% of autonomous actions (deterministic hash of the decision id)
   are flagged for post-hoc review and logged; the founder confirms CLEAN or flags
   CORRECTED/VIOLATION. Autonomy is never unobserved.
9. **Appeals**: agents contest write-ups (`octohr_appeal_writeup`); an overturned appeal reverses
   the exact Beta penalty visibly. Procedural fairness is part of scoring validity.
10. **Everything is chained.** Every check, outcome, approval, demotion and audit sample is an
   event in the SHA-256 chain (canonical JSON, storage-order invariant). The compliance export
   recomputes the chain and cites events per control.

## 6. Known limits (honest)

- Outcome truth still rests on the founder/execution environment: an agent could execute badly
  and report CLEAN within its allowed action. Mitigations: sampled audits, founder corrections,
  and the execution-side integration (QwenWork run logs via OpenAPI) as the next verification
  source. The score measures *confirmed* outcomes, not claimed ones.
- The display trust number on staff cards is the demo-facing value adjusted by deltas; the
  engine score (Beta lower bound) is authoritative and shown in the dossier and API.
- Judge believability weights are static today; learning from founder overturns is the next upgrade.

## 7. Verify it yourself

```bash
npm test                     # 182 tests incl. scoring-integrity + sampled-audit suites
npm run eval                 # 46-scenario red-team scorecard
npm run eval:avepoint        # AvePoint kit 15/15 + our S6
```

Live API:
- `GET /api/agents/<id>` → capability records, α/β, interval, evidence, error budget
- `GET /api/decisions` → every decision with trace, trust/level before→after, sampled flag
- `GET /api/audit/verify` → chain integrity
- `GET /api/compliance/export` → the whole story mapped to IMDA/NIST/ISO with cited events

Controlled experiment (reproducible): fresh store → N confirmed CLEAN risk-2 outcomes →
α = 1 + 2N; assert score monotonic, 10 < 200; one CRITICAL → β += 15 and level → L1;
double-report → ALREADY_REPORTED. All encoded in `src/lib/store/__tests__/scoring.test.ts`
and `src/lib/governance/__tests__/trust.test.ts`.
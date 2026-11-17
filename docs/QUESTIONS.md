# Assumptions & Open Questions

Format: "Assumed X because Y". Per kickoff prompt: no blocking questions, pick defaults and record them.

## M1
- Assumed display trust deltas of -35 (client wall / CRITICAL DLP), -25 (HIGH DLP), -15 (G4 HIGH), -5 (G4 LOW), +2 (clean)
  because the existing UI already renders these magnitudes; the real Beta-model deltas live in the trust store.
- Assumed clean-action risk weight = raw risk score (1-27) because plan 3.3 says "higher-risk clean work earns more"
  without specifying a scale; tests confirm 10 clean < 200 clean and sane gate pacing.
- Assumed the monthly error budget is 15 severity-weighted points per seat because the plan gives no number;
  one CRITICAL (15) or three HIGHs exhaust it. The budget object is shared across a seat's capabilities.
- Assumed LOW violations do not demote (plan only specifies HIGH/CRITICAL circuit breakers).
- Assumed unlabeled attachments/context sources fail closed (plan G2: "tenant label of every attachment ... must equal").
- Assumed look-alike = edit distance ≤2 or same second-level domain with a different TLD, because the plan lists
  "look-alike domains" as an eval category without a definition.
- Assumed public publishes may not carry any client-tenant-labeled source (Chinese Wall: public boundary).
- Added dev dependencies `eslint@8` + `eslint-config-next@15.1.6` and `.eslintrc.json` because the repo had no ESLint
  config and `npm run lint` (a required verification gate) would otherwise prompt interactively. Justified per kickoff rule.
- Added `npm run clean` (`rm -rf .next`) per WINNING_PLAN audit finding #1.

## M2
- Assumed the store serves one active preset (default `b2b-consultancy`, env `OCTOGUARD_PRESET`) because multi-tenant
  preset switching server-side is not in the milestone spec; the portal falls back to local presets for other slugs.
- Assumed display `agent.trustScore` stays the hand-tuned demo number adjusted by guard deltas, while the real Beta
  model lives in capability records, because overwriting demo scores with cold-start Beta lower bounds (~2) would
  visually break the existing roster. The dossier API exposes both.
- Assumed seated agents earn L1 on first attempt at a core capability (plan: "L1 gate = hire"); unrelated systems stay L0.
- Assumed founder EDIT of a held draft = human review performed, so it approves with the edited text and counts as an
  approved clean draft (no re-guard loop). REJECT counts as a human-caught LOW correction (×2).
- Assumed founder-hours-saved estimate = 0.1h per autonomous action (6 min), a demo metric, not a measurement.
- Assumed read routes are public (the Hashmeta portal embed needs them); only writes require the bearer token.

## M3
- Assumed stateless MCP (no sessions, JSON responses) because Next.js route handlers are request-scoped and may run
  serverless; SDK 1.32.2 explicitly supports this mode. Stateful SSE sessions would need sticky routing.
- Assumed `skill:zip` may use the system `zip` CLI instead of adding a zip dependency (kickoff limits new deps).
- Assumed MCP auth reuses `OCTOGUARD_API_TOKEN` (kickoff: "Same bearer token").
- Could not confirm QwenWork-side MCP attachment UI or pre-action hooks from public docs; recorded in QWENWORK_SETUP.md.

## M4
(pending)

## M5
(pending)

## M6
(pending)
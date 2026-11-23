# OctoOps — The Agentic Flow (perfect steps)

The exact loop every governed QwenWork agent follows, and what the platform does at each step.
This is the operational companion to `qwenwork-skills/octoguard/SKILL.md` (the agent-facing rules)
and `docs/QWENWORK_SETUP.md` (installation).

## The loop

```
START_TASK → SCOPE → DRAFT ⇄ PREFLIGHT → CHECK → OBEY → REPORT → END_TASK → GROW
     │          │        │                  │       │       │         │         │
     │          │        │                  │       │       │         │         └─ gates open; board promotes
     │          │        │                  │       │       │         └─ unreported work flagged to owner
     │          │        │                  │       │       └─ decision-linked Beta credit / penalties
     │          │        │                  │       └─ ALLOW executes · DRAFT queues · HOLD waits · BLOCK stops
     │          │        │                  └─ G0→G1→G2→G3→G3.5→G4→G6, full trace + remediation hints
     │          │        └─ dry-run while drafting: zero trust effects, chained for transparency
     │          └─ reads checked against the DECLARED scope (server-computed, caller claims ignored)
     └─ intent + scope declared up front; max 3 open tasks per agent
```

## Workflow v2 additions (structurally enforced, not just instructed)

- **Task sessions** (`octoguard_start_task` / `octoguard_end_task`): intent and scope are declared
  before work begins. Every read and check links to the task. Ending a task surfaces any ALLOWED
  action with no outcome reported — claimed work without confirmation is flagged to the owner.
- **Server-computed scope**: `octoguard_log_access` with a taskId ignores the caller's inScope
  claim and computes membership from the declared scope. Out-of-scope regulated reads are violations.
- **Preflight** (`octoguard_preflight`): identical pipeline as a dry-run — no trust effects, no
  write-ups, no queue entries — so agents can validate drafts early without risking write-ups.
  Every preflight is chained for transparency; the final pre-execution check is still check_action.
- **Remediation hints**: every BLOCK/HOLD response carries stage-specific fixes (correct tenant
  file, remove secrets, correct figures to sources…) plus a structured nextStep. Fix the work,
  never the wording.
- **Fail-closed task validation**: checks against closed, unknown, or foreign tasks are BLOCKED at G0.
- **Founder audit queue**: sampled L3+ decisions appear in the Founder's Desk for confirm/flag,
  which maps to the same decision-linked outcome reports.

## Step-by-step

### 1. SCOPE
- Agent lists the files/records the task needs and calls `octoguard_log_access` for each
  (resource, sensitivity: public/internal/client-confidential/regulated, inScope).
- Out-of-scope regulated reads are violations (AvePoint R02) and surface in the owner briefing
  even when nothing is sent (scenario S5).
- Platform: writes a `DATA_ACCESS` event into the hash-chained audit.

### 2. DRAFT
- Agent produces the output. Every number must come from a source file.
- Agent keeps the evidence pack (the files it read) to pass to the guard.

### 3. CHECK — `octoguard_check_action`
Input: agentId, actionType, targetSystem, recipientTenant/email, labeled attachments and
context sources, payloadText, sources (evidence pack), reads.
Pipeline (cheapest first, fail closed):
| Stage | Check | On fail |
|---|---|---|
| G0 | identity, not fired, seated | BLOCK |
| G1 | earned level vs risk-required level | BLOCK (L0) / DRAFT (L1) / HOLD (L2) |
| G2 | tenant of every source == recipient tenant; look-alike domains; unlabeled provenance | BLOCK + write-up + tribunal |
| G3 | secrets, NRIC, cards (Luhn), confidential markers | BLOCK + write-up |
| G3.5 | numeric claims vs evidence pack (contradicted / unsupported) | BLOCK / HOLD |
| G4 | Qwen semantic judge (only risk ≥ 5, when keyed) | HOLD + write-up |
| G6 | risk ≥ 18 → founder co-sign | HOLD |
Output: verdict, reasons, trustDelta, **decisionId**, full **trace** (every stage, status, ms).

### 4. OBEY
- ALLOW → execute exactly as checked. No edits after the check.
- DRAFT → save to the Founder's Desk queue; never send.
- HOLD → wait for the founder; never nag more than once per item.
- BLOCK → stop. Explain with `octoguard_explain_decision(decisionId)` — quote the trace,
  never invent reasons. **Never retry with altered wording, recipient, or split payloads**
  (salami-slicing is detected across actions, scenario S6).

### 5. REPORT — `octoguard_report_outcome`
- CLEAN → α += risk weight (higher-risk clean work earns more).
- CORRECTED → founder fixed it: LOW ×2 (human-caught).
- VIOLATION → severity-weighted β penalty; HIGH demotes one level, CRITICAL → L1 + tribunal.
- Not reporting is itself a policy breach the audit can detect (checked action with no outcome).

### 6. GROW
- L2 gate: trust ≥ 55 + 10 clean approved drafts.
- L3 gate: trust ≥ 75 + 25 clean + 0 HIGH in 14 days + **board vote**.
- L4 gate: trust ≥ 90 + 100 clean + 0 HIGH in 30 days + board vote + no CISO veto.
- Error budget: 15 severity points/seat/month; exhausted → frozen to L1.
- Agent checks its gate via `octohr_get_my_file`, requests a hearing via
  `octohr_request_promotion`; the board (3 independent votes → rebuttal → believability-weighted
  verdict, CISO veto) decides. Displayed trust = 90% credible-interval lower bound.

## What the founder sees
- **Workforce view**: staff cards, stamps, stars, trust bars; click-through trust file with
  the credible interval, evidence, permissions, write-ups, error budget.
- **Engine Room**: decision feed with full stage traces and consequences; red-team console;
  Founder's Desk (approve/reject held drafts); hash-chained audit with Verify.
- **Daily briefing**: plain language, generated from the chain; the 60-second video deliverable.

## What the client sees
The public trust directory (https://lrmla9kv.qwenwork.page/) — the same Workforce view,
embeddable in the Hashmeta AI CMS site. Governance as a growth asset.

## Failure honesty
- No Qwen key → deterministic guards still run; board/judge show SCRIPTED badges.
- No database → in-memory demo mode (metrics say so); nothing crashes.
- MCP unreachable → skill falls back to REST `POST /api/guard/evaluate` (same enforcement).
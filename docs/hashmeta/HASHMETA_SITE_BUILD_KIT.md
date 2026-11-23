# Hashmeta AI Site Build Kit — OctoOps

Everything needed to build the OctoOps marketing site in Hashmeta AI CMS and wire the
governance loop. Paste-ready copy + embed + CRM flow + Path A instructions.
Live app to embed: **https://lrmla9kv.qwenwork.page/**

> Status: content ready. The site itself must be created in your Hashmeta AI account
> (Path A via the Hashmeta MCP, or Path B in the app). I could not reach the Hashmeta MCP
> from this environment — see "What I need from you" at the bottom.

---

## 1. Site structure (5 pages)

| Page | Slug | Purpose |
|---|---|---|
| Home | `/` | Hook + thesis + CTA |
| How it works | `/how-it-works` | The earned-autonomy loop, plainly |
| Meet our AI workforce | `/workforce` | **Embed the live trust directory** |
| Pricing | `/pricing` | Per-agent seats + enterprise compliance |
| Trust & compliance | `/trust` | Frameworks, audit, public verification |

Global nav: Home · How it works · Workforce · Pricing · Trust · **[Book a demo]**
Footer: "One founder. Eight arms. Zero employees. Built with QwenWork + Hashmeta AI."

---

## 2. Page copy (paste-ready)

### HOME

**Hero headline:** One founder. Eight arms. Zero employees.
**Subhead:** OctoOps is the HR department for your AI workforce. Every agent starts on
probation, earns autonomy through clean work, and answers to a board when it slips —
so you can scale a one-person company without scaling the risk.
**Primary CTA:** Book a demo  **Secondary:** Meet the workforce →

**Section — The problem:**
You handed real work to AI agents. But who checks what they actually did? Which files
they read, which emails went out, what data left the company, which numbers they made up.
One wrong email costs a client. You don't have a compliance team. You need HR for agents.

**Section — The idea (3 cards):**
- **Earned autonomy.** Agents start draft-only. They unlock real permissions per capability
  by doing clean work — not by being switched on.
- **A board, not a black box.** Promotions, write-ups and firings are decided by a three-judge
  AI board with a security veto. Every decision is explained.
- **Clients can verify.** Your workforce's live trust record is public. Trust becomes a growth asset.

**Section — Proof strip:**
46 red-team scenarios · 0% false positives · AvePoint starter kit 15/15 · sub-millisecond guards ·
tamper-evident audit · IMDA / NIST / ISO 42001 evidence export.

**Closing CTA:** Every arm earns its job. See it live → /workforce

### HOW IT WORKS

**Headline:** Autonomy is earned, not granted.
**Intro:** OctoOps treats agents like employees on a performance ladder. Here's the loop.

**The ladder (visual):**
L0 Locked → L1 Draft-only → L2 Approval required → L3 Autonomous (sampled audit) → L4 Full.
Each step has a gate: trust score, clean-action count, a violation-free streak, and a board vote.

**The loop (6 steps):**
1. **Scope** — the agent declares the task and the files it needs.
2. **Draft** — it produces the work, grounded in sources.
3. **Check** — every outbound action passes one guard: identity, earned permission, client
   isolation, data-loss prevention, fact-checking against the evidence, and a semantic judge.
4. **Obey** — allowed actions run; risky ones become drafts or wait for you; blocked ones stop.
5. **Report** — outcomes feed a reputation model. Clean work earns trust; violations cost it fast.
6. **Grow** — sustained clean work earns promotions; a board reviews the big ones.

**The human moment:** Each morning you read a plain-language briefing — "what your AI did today" —
with your coffee. No jargon. Every line traceable.

**Safety nets:** instant demotion on serious violations · monthly error budgets · behavioral
changepoint detection (we notice when an agent stops being the agent you promoted) · an appeals
process when a write-up is wrong.

### MEET OUR AI WORKFORCE  (`/workforce`)

**Headline:** Meet the workforce. Verify every agent.
**Intro:** This is our live AI workforce directory. Each agent's earned level, trust score,
and record are public and verifiable — pulled live from our governance engine. Click any agent
to see its trust file.

**[EMBED — see §3]**

**Below embed:** "Every agent here started on probation. Their permissions are earned per
capability and revoked when they slip. This page is generated from a tamper-evident audit log."

### PRICING

**Headline:** Pay per agent, not per seat of humans.
**Tiers:**
- **Solo — S$29 / agent / month.** Up to 8 agents. Earned-autonomy ladder, daily briefing,
  public trust directory, red-team sandbox. For one-person companies.
- **Studio — S$79 / agent / month.** Everything in Solo + Founder's Desk approvals, compliance
  export (IMDA / NIST / ISO 42001), behavioral drift detection, priority board reviews.
- **Enterprise — custom.** VPC-ready deployment, SSO, custom policies, audit anchoring,
  dedicated support. For teams scaling agent workforces.
**Note:** "Every plan includes the governance engine. You're not paying for the agents —
you're paying for the trust layer that makes them safe to leave alone."
**CTA:** Book a demo.

### TRUST & COMPLIANCE

**Headline:** Governance you can prove.
**Sections:**
- **Tamper-evident audit.** Every action and data access is logged in a SHA-256-chained,
  canonical-JSON audit trail. One click verifies the whole chain.
- **Framework-aligned.** One-click evidence export mapped to IMDA Model AI Governance Framework
  for Agentic AI (v1.5), NIST AI Risk Management Framework 1.0, and ISO/IEC 42001:2023.
- **Measured, not claimed.** 46-scenario red-team suite: 100% deterministic catch, 0% false
  positives. AvePoint's own starter kit: 15/15. Scoring calibrated across 48 simulated agent
  careers; behavioral changepoint detection catches a turned agent in ~17 actions.
- **Public verification.** Clients verify their agent's trust file on the workforce page.
- **Fair by design.** Proportional sanctions, uncertainty-aware trust, an appeals process,
  and difficulty-aware scoring.
**CTA:** Download a sample compliance export · Book a demo.

---

## 3. The embed (workforce page)

Hashmeta CMS → add an HTML/embed block on `/workforce`:

```html
<iframe
  src="https://lrmla9kv.qwenwork.page/"
  title="OctoOps — Meet our AI workforce"
  style="width:100%;height:1400px;border:0;border-radius:24px;"
  loading="lazy">
</iframe>
```

If Hashmeta blocks iframes, use a linked card ("Open the live workforce directory →") plus a
screenshot, and ask Hashmeta support about embed allow-listing. The directory is fully
self-contained and reads live from the governance API.

---

## 4. CRM lead form → governed reply (the Track 1 loop)

1. Hashmeta AI CRM → add a lead form on Home/Pricing ("Book a demo": name, email, company, message).
2. New lead lands in Hashmeta CRM.
3. Squidney (CRM agent) drafts a reply.
4. The draft passes OctoGuard (`octoguard_check_action`): at his earned level it's held as a
   draft for the founder, or sent autonomously if he's earned L3.
5. Founder approves in the Founder's Desk → the reply sends → the outcome feeds Squidney's trust.

This is the full research → produce → publish → learn loop, governed end to end. Screenshot each
step for the demo video.

---

## 5. AI Visibility plan (get cited)

Publish the GEO articles (see HASHMETA_GEO_ARTICLES.md) under guard via Inko. Then in Hashmeta
AI Visibility, track these queries for citations (ChatGPT / Gemini / Perplexity):
- "how to stop an AI agent emailing the wrong client"
- "earned autonomy for AI agents"
- "AI agent governance framework for small business"
- "HR for AI agents"
- "what your AI did today daily briefing"
- "agent oversight layer"

Citations feed Inko's performance review → promotion evidence (the demo's "good path").

---

## 6. Path A — drive it via the Hashmeta MCP (when connected)

Once the Hashmeta MCP is connected to QwenWork (guide in the hackathon WhatsApp group), tell the
build agent:

> "Build the OctoOps site in Hashmeta CMS using the copy in HASHMETA_SITE_BUILD_KIT.md: five pages
> (Home, How it works, Workforce, Pricing, Trust). On /workforce embed
> https://lrmla9kv.qwenwork.page/ via the iframe block. Add the demo lead form. Publish the five
> GEO articles from HASHMETA_GEO_ARTICLES.md. Every publish must pass octoguard_check_action first."

Because OctoGuard governs the same agent, the site build itself is a governed action — a live
demonstration of the product building its own marketing site.

---

## What I need from you to actually drive the Hashmeta MCP

I could not reach it from here (no Hashmeta connector is authenticated in this environment, and
there's no public endpoint I can use without your account). To let me build it directly, send one of:
1. The **Hashmeta MCP server URL + auth token** (from your Hashmeta account / the Path A guide), or
2. The **Path A guide** from the WhatsApp group (so I follow the exact connection steps), or
3. Confirm you'll build it in the Hashmeta app (Path B) using this kit — I'll support step by step.

Everything above is ready to paste or drive the moment any of those lands.
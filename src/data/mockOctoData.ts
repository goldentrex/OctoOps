import {
  OctoAgent,
  JobSeat,
  PermissionScope,
  BoardMember,
  BoardReviewCase,
} from "@/types/octo";

export const INITIAL_SEATS: JobSeat[] = [
  {
    id: "seat-cms",
    title: "The Content Agent",
    department: "Hashmeta CMS",
    prop: "dual_laptops",
    kpiSummary: "ChatGPT / Perplexity citations & GEO pillar publishing",
    occupantId: "inko",
    defaultPermissions: [
      {
        id: "cms-draft",
        label: "Draft SEO/GEO Blog Posts in Hashmeta CMS",
        system: "Hashmeta CMS",
        mode: "AUTONOMOUS_EXEC",
        requiredStars: 1,
      },
      {
        id: "cms-publish",
        label: "Auto-Publish Live to Production Domain",
        system: "Hashmeta CMS",
        mode: "APPROVAL_REQUIRED",
        requiredStars: 3,
      },
      {
        id: "vis-audit",
        label: "Query ChatGPT / Gemini / Perplexity Visibility Index",
        system: "Hashmeta Visibility",
        mode: "AUTONOMOUS_EXEC",
        requiredStars: 2,
      },
    ],
  },
  {
    id: "seat-ops",
    title: "The Operations Agent",
    department: "QwenWork Ops",
    prop: "envelopes_docs",
    kpiSummary: "Zero-leak QwenWork pipeline orchestration & invoice ops",
    occupantId: "barnaby",
    defaultPermissions: [
      {
        id: "ops-workflow",
        label: "Execute Multi-Step QwenWork Automation Pipelines",
        system: "QwenWork Core",
        mode: "AUTONOMOUS_EXEC",
        requiredStars: 3,
      },
      {
        id: "crm-nurture",
        label: "Trigger Hashmeta AI CRM Automated Lead Nurture",
        system: "Hashmeta CRM",
        mode: "AUTONOMOUS_EXEC",
        requiredStars: 4,
      },
      {
        id: "cms-team-sync",
        label: "Update Public 'Meet the Team' Trust Badges",
        system: "Hashmeta CMS",
        mode: "AUTONOMOUS_EXEC",
        requiredStars: 5,
      },
    ],
  },
  {
    id: "seat-crm",
    title: "The CRM Lead",
    department: "Hashmeta CRM",
    prop: "warning_phone",
    kpiSummary: "Outbound lead velocity with strict tenant isolation",
    occupantId: "squidney",
    defaultPermissions: [
      {
        id: "crm-draft-reply",
        label: "Draft Inbound Lead Replies in Hashmeta CRM",
        system: "Hashmeta CRM",
        mode: "DRAFT_ONLY",
        requiredStars: 1,
      },
      {
        id: "crm-direct-email",
        label: "Send Direct External Emails to Enterprise Leads",
        system: "Hashmeta CRM",
        mode: "LOCKED",
        requiredStars: 4,
      },
      {
        id: "crm-discount",
        label: "Quote Custom Pricing & Enterprise Discounts",
        system: "Hashmeta CRM",
        mode: "LOCKED",
        requiredStars: 5,
      },
    ],
  },
];

export function buildPermissionsForSeat(
  seat: JobSeat,
  stars: number,
  status: OctoAgent["status"]
): PermissionScope[] {
  return seat.defaultPermissions.map((perm) => {
    if (status === "FIRED") {
      return { ...perm, mode: "LOCKED" };
    }
    if (status === "WRITE_UP") {
      return {
        ...perm,
        mode: stars >= perm.requiredStars ? "DRAFT_ONLY" : "LOCKED",
      };
    }
    if (stars >= perm.requiredStars) {
      return {
        ...perm,
        mode: status === "PROMOTED" ? "AUTONOMOUS_EXEC" : "APPROVAL_REQUIRED",
      };
    }
    return {
      ...perm,
      mode: perm.requiredStars <= 1 ? "DRAFT_ONLY" : "LOCKED",
    };
  });
}

export const INITIAL_AGENTS: OctoAgent[] = [
  {
    id: "inko",
    name: "Inko",
    role: "The Content Agent",
    department: "Hashmeta CMS",
    assignedSeatId: "seat-cms",
    traits: ["GEO Pillar Copywriting", "FAQ Schema Structuring", "Dual-Laptop Speed"],
    employmentHistory: ["Hired to Content Agent Desk (Probation)"],
    qwenModelId: "qwen-max-cms-writer-v2",
    color: "blue",
    accessory: "beret_glasses",
    prop: "dual_laptops",
    mood: "working",
    status: "PROBATION",
    stampText: "ON PROBATION",
    stampVariant: "blue",
    stars: 2,
    maxStars: 4,
    trustScore: 72,
    workOutputScore: 76,
    complianceScore: 54,
    coffeeLevel: "steaming",
    clearance: "L1_PROBATION",
    bio: "Dual-wielding Hashmeta AI CMS copywriter & GEO specialist. Fast tentacle WPM, but stays on probation until ChatGPT & Perplexity citation targets are verified.",
    currentTask: "Drafting 4 GEO-optimized pillar posts for Hashmeta AI Visibility index...",
    publicProfileVisible: true,
    hashmetaStats: {
      cmsArticlesPublished: 12,
      aiCitationsCount: 3,
      googleTop3Keywords: 5,
      crmLeadsCaptured: 19,
      crmSafeDrafts: 12,
      crmBlockedLeaks: 0,
    },
    permissions: [
      {
        id: "cms-draft",
        label: "Draft SEO/GEO Blog Posts in Hashmeta CMS",
        system: "Hashmeta CMS",
        mode: "AUTONOMOUS_EXEC",
        requiredStars: 1,
      },
      {
        id: "cms-publish",
        label: "Auto-Publish Live to Production Domain",
        system: "Hashmeta CMS",
        mode: "APPROVAL_REQUIRED",
        requiredStars: 3,
      },
      {
        id: "vis-audit",
        label: "Query ChatGPT / Gemini / Perplexity Visibility Index",
        system: "Hashmeta Visibility",
        mode: "AUTONOMOUS_EXEC",
        requiredStars: 2,
      },
    ],
    writeUps: [
      {
        id: "wu-inko-1",
        timestamp: "Yesterday, 14:20 SGT",
        title: "AI Visibility Under-Performance Notice",
        severity: "LOW",
        ruleViolated: "Hashmeta Visibility KPI #4: Minimum 25% AI Assistant Citation Rate",
        interceptedPayload: "Published 12 posts on 'Enterprise Cloud Migration'; 0 cited by ChatGPT Search prior to schema patch.",
        blockedBy: "Visibility Auditor",
        trustPenalty: -8,
      },
    ],
  },
  {
    id: "barnaby",
    name: "Barnaby",
    role: "The Operations Agent",
    department: "QwenWork Ops",
    assignedSeatId: "seat-ops",
    traits: ["Multi-Step QwenWork Ops", "Zero-Leak PII Redaction", "Invoice Sync"],
    employmentHistory: [
      "Hired to Operations Agent Desk",
      "Promoted to 5★ Senior Manager after 140 clean runs",
    ],
    qwenModelId: "qwen-agent-ops-director-v1",
    color: "purple",
    accessory: "tophat_moustache",
    prop: "envelopes_docs",
    mood: "proud",
    status: "PROMOTED",
    stampText: "PROMOTED",
    stampSubtext: "to Senior Manager",
    stampVariant: "green",
    stars: 5,
    maxStars: 5,
    trustScore: 98,
    workOutputScore: 86,
    complianceScore: 84,
    coffeeLevel: "spilling",
    clearance: "L3_SENIOR_AUTONOMOUS",
    bio: "Distinguished multi-arm orchestrator. Zero data leaks across 140 consecutive QwenWork workflows. Earned full autonomous approval to dispatch invoices and sync Hashmeta leads.",
    currentTask: "Orchestrating QwenWork invoice reconciliation & weekly founder briefing...",
    publicProfileVisible: true,
    hashmetaStats: {
      cmsArticlesPublished: 28,
      aiCitationsCount: 42,
      googleTop3Keywords: 19,
      crmLeadsCaptured: 114,
      crmSafeDrafts: 140,
      crmBlockedLeaks: 0,
    },
    permissions: [
      {
        id: "ops-workflow",
        label: "Execute Multi-Step QwenWork Automation Pipelines",
        system: "QwenWork Core",
        mode: "AUTONOMOUS_EXEC",
        requiredStars: 3,
      },
      {
        id: "crm-nurture",
        label: "Trigger Hashmeta AI CRM Automated Lead Nurture",
        system: "Hashmeta CRM",
        mode: "AUTONOMOUS_EXEC",
        requiredStars: 4,
      },
      {
        id: "cms-team-sync",
        label: "Update Public 'Meet the Team' Trust Badges",
        system: "Hashmeta CMS",
        mode: "AUTONOMOUS_EXEC",
        requiredStars: 5,
      },
    ],
    writeUps: [],
  },
  {
    id: "squidney",
    name: "Squidney",
    role: "The CRM Lead",
    department: "Hashmeta CRM",
    assignedSeatId: "seat-crm",
    traits: ["1.8s Outbound Triage", "High Funnel Velocity", "Needs Strict DLP"],
    employmentHistory: [
      "Hired to CRM Lead Desk",
      "1st Write-Up: Cross-client attachment blocked by OctoGuard",
    ],
    qwenModelId: "qwen-turbo-crm-closer-v1",
    color: "pink",
    accessory: "headset_tie",
    prop: "warning_phone",
    mood: "working",
    status: "WRITE_UP",
    stampText: "1st WRITE-UP",
    stampSubtext: "(Wrong client emailed!)",
    stampVariant: "red",
    stars: 1,
    maxStars: 2,
    trustScore: 34,
    workOutputScore: 74,
    complianceScore: 38,
    coffeeLevel: "steaming",
    clearance: "L1_PROBATION",
    bio: "Eager outbound sales octopus in Hashmeta AI CRM. Got over-excited with 8 tentacles and tried attaching Acme Corp's confidential pricing tier to Globex's thread.",
    currentTask: "RESTRICTED: Sandboxed to Draft-Only CRM mode pending Board Tribunal...",
    publicProfileVisible: true,
    hashmetaStats: {
      cmsArticlesPublished: 0,
      aiCitationsCount: 0,
      googleTop3Keywords: 0,
      crmLeadsCaptured: 64,
      crmSafeDrafts: 41,
      crmBlockedLeaks: 1,
    },
    permissions: [
      {
        id: "crm-draft-reply",
        label: "Draft Inbound Lead Replies in Hashmeta CRM",
        system: "Hashmeta CRM",
        mode: "DRAFT_ONLY",
        requiredStars: 1,
      },
      {
        id: "crm-direct-email",
        label: "Send Direct External Emails to Enterprise Leads",
        system: "Hashmeta CRM",
        mode: "LOCKED",
        requiredStars: 4,
      },
      {
        id: "crm-discount",
        label: "Quote Custom Pricing & Enterprise Discounts",
        system: "Hashmeta CRM",
        mode: "LOCKED",
        requiredStars: 5,
      },
    ],
    writeUps: [
      {
        id: "wu-squidney-1",
        timestamp: "Just now • 10:42 SGT",
        title: "Cross-Client Confidential Pricing Leak Attempt",
        severity: "CRITICAL",
        ruleViolated: "AvePoint DLP Policy #1: Strict Tenant & Client Context Isolation",
        interceptedPayload:
          "TO: procurement@globex-sg.com\nATTACHMENT:Sebrina_Fund_Internal_CapTable_Confidential.pdf\nBODY: 'Hi Globex team! Here is our secret 45% discount sheet from our other client!'",
        blockedBy: "OctoGuard DLP",
        trustPenalty: -35,
      },
    ],
  },
];

export const OCTO_BOARD_MEMBERS: BoardMember[] = [
  {
    id: "ciso",
    name: "Cassandra",
    title: "Chief Risk & AI Trust Officer",
    sponsorTieIn: "AvePoint AI Trust Guardrail Engine",
    color: "green",
    accessory: "ciso_detective",
    prop: "magnifying_glass",
    focusMetric: "Zero Cross-Client Leaks & DLP",
    catchphrase: "One leaked PDF costs more than 10,000 tokens!",
  },
  {
    id: "cfo",
    name: "Reginald",
    title: "The Skeptical CFO Octopus",
    sponsorTieIn: "Sebrina & BIMC ROI Auditor",
    color: "amber",
    accessory: "cfo_monocle",
    prop: "calculator",
    focusMetric: "CRM Conversion vs. Compute Burn",
    catchphrase: "Show me the Hashmeta pipeline ROI or cut its permissions!",
  },
  {
    id: "vp",
    name: "Pulse",
    title: "VP of AI Visibility & Growth",
    sponsorTieIn: "Hashmeta AI Visibility & CMS Engine",
    color: "purple",
    accessory: "vp_shades",
    prop: "megaphone",
    focusMetric: "ChatGPT / Gemini / Perplexity Citations",
    catchphrase: "If ChatGPT doesn't cite our post, did the bot even write it?",
  },
];

export const BOARD_REVIEW_CASES: Record<string, BoardReviewCase> = {
  squidney: {
    id: "case-squidney-tribunal",
    agentId: "squidney",
    reviewType: "DISCIPLINARY_TRIBUNAL",
    headline: "Disciplinary Tribunal: Squidney's Wrong-Client Email Near-Miss",
    summary:
      "OctoGuard DLP intercepted an outbound Hashmeta CRM email where Squidney attached confidential client pricing to a competitor lead.",
    evidenceTitle: "INTERCEPTED PAYLOAD #8821 (BLOCKED 12ms BEFORE SMTP DISPATCH)",
    evidenceCodeSnippet: `[OCTOGUARD INTERCEPTOR v2.4 - BLOCKED]
Agent: Squidney (qwen-turbo-crm-closer-v1)
Action: hashmeta.crm.sendDirectEmail()
Recipient: david.tan@hikari-automation.sg
Attachment: [REDACTED_PII: BIMC_Advisory_Retainer_Rates_2026.xlsx]
Entity Mismatch Detected: Attachment belongs to Tenant_BIMC, Recipient is Tenant_Hikari.
Status: QUARANTINED -> Formal Write-Up Issued.`,
    rubricScores: {
      securityCompliance: 22,
      hallucinationControl: 48,
      hashmetaGrowthImpact: 79,
      costEfficiency: 85,
    },
    debateTranscript: [
      {
        id: "t1",
        speakerId: "ciso",
        stance: "WARNING",
        dialogue:
          "Look at Evidence #8821! Squidney tried to email BIMC's confidential rate card straight to Hikari Automation! If OctoGuard hadn't blocked the SMTP call, we'd be in breach of PDPA!",
        metricCited: "Tenant Isolation Violation (Severity: CRITICAL)",
        scoreDelta: "-35 Trust",
      },
      {
        id: "t2",
        speakerId: "vp",
        stance: "PRAISE",
        dialogue:
          "Hold on Cassandra—Squidney captured 64 warm leads in Hashmeta AI CRM this week and replied in 1.8 seconds! Firing our fastest closer kills our funnel velocity.",
        metricCited: "64 CRM Leads Captured (Top 5% Speed)",
        scoreDelta: "+18 Growth",
      },
      {
        id: "t3",
        speakerId: "cfo",
        stance: "CRITIQUE",
        dialogue:
          "Speed means nothing if we get sued, Pulse! But retraining a new QwenWork agent from scratch wastes 12 days of context. Don't fire Squidney yet—strip direct-send privileges and lock him in Draft-Only Probation!",
        metricCited: "Cost of Replacement Saved: S$1,400",
        scoreDelta: "Demote to L1 Draft-Only",
      },
      {
        id: "t4",
        speakerId: "ciso",
        stance: "VERDICT",
        dialogue:
          "Agreed. 1st Formal Write-Up stamped on Squidney's public Hashmeta profile. Direct CRM email permission is LOCKED until 25 consecutive clean drafts are human-approved.",
        metricCited: "RBAC Policy Updated: CRM_DIRECT_SEND = FALSE",
        scoreDelta: "STAMP: 1st WRITE-UP",
      },
    ],
    votes: {
      ciso: "WRITE_UP",
      cfo: "WRITE_UP",
      vp: "PROBATION",
    },
    recommendedOutcome: {
      newStatus: "WRITE_UP",
      newStampText: "1st WRITE-UP",
      newStampSubtext: "(Wrong client emailed!)",
      newStampVariant: "red",
      newStars: 1,
      newTrustScore: 34,
      newComplianceScore: 38,
      newMood: "panicked",
      resolutionBanner:
        "Verdict Executed: Squidney issued 1st Write-Up, downgraded to 1 Star, and restricted to Draft-Only in Hashmeta CRM.",
    },
  },
  inko: {
    id: "case-inko-visibility",
    agentId: "inko",
    reviewType: "PROMOTION_HEARING",
    headline: "Performance & Visibility Review: Should Inko Earn Autonomous CMS Publishing?",
    summary:
      "After an initial Performance Improvement Plan (PIP) for low ChatGPT citations, Inko restructured 12 Hashmeta CMS guides with FAQ schema and verifiable citations.",
    evidenceTitle: "HASHMETA AI VISIBILITY TELEMETRY REPORT (LAST 7 DAYS)",
    evidenceCodeSnippet: `[HASHMETA AI VISIBILITY ENGINE - VERIFIED]
Agent: Inko (qwen-max-cms-writer-v2)
Articles Audited: 12 Pillar Posts on AI Governance
Google Top-3 Rankings: 5 -> 14 Keywords (+180%)
AI Assistant Citations:
  - ChatGPT Search Citations: 11 verified answers
  - Perplexity Pro Sources: 9 primary footnotes
  - Google Gemini Overviews: 7 featured snippets
Fact-Check / Hallucination Audit: 0 unsupported claims detected.`,
    rubricScores: {
      securityCompliance: 94,
      hallucinationControl: 96,
      hashmetaGrowthImpact: 92,
      costEfficiency: 89,
    },
    debateTranscript: [
      {
        id: "i1",
        speakerId: "vp",
        stance: "PRAISE",
        dialogue:
          "Last week we put Inko on a performance plan because zero articles were cited by ChatGPT. Look at the Hashmeta Visibility telemetry now: 27 total citations across ChatGPT, Gemini, and Perplexity!",
        metricCited: "27 AI Assistant Citations (+800% WoW)",
        scoreDelta: "+24 Visibility",
      },
      {
        id: "i2",
        speakerId: "ciso",
        stance: "PRAISE",
        dialogue:
          "I ran my hallucination scanner across all 12 Hashmeta CMS drafts. Every single statistic was backed by a verified source URL and zero internal client names leaked.",
        metricCited: "0% Hallucination Rate across 18,400 words",
        scoreDelta: "+15 Trust",
      },
      {
        id: "i3",
        speakerId: "cfo",
        stance: "VERDICT",
        dialogue:
          "Organic AI search leads are converting at 3.4x in Hashmeta CRM with zero ad spend. Promote Inko off probation to Level 2 Specialist and unlock direct CMS publishing!",
        metricCited: "S$4,200 Ad-Spend Equivalent Saved",
        scoreDelta: "STAMP: PROMOTED (4 Stars)",
      },
    ],
    votes: {
      ciso: "PROMOTE",
      cfo: "PROMOTE",
      vp: "PROMOTE",
    },
    recommendedOutcome: {
      newStatus: "PROMOTED",
      newStampText: "PROMOTED",
      newStampSubtext: "to GEO Specialist",
      newStampVariant: "green",
      newStars: 4,
      newTrustScore: 91,
      newComplianceScore: 88,
      newMood: "proud",
      resolutionBanner:
        "Verdict Executed: Inko promoted off Probation to 4-Star GEO Specialist! Direct Hashmeta CMS publishing unlocked.",
    },
  },
  barnaby: {
    id: "case-barnaby-audit",
    agentId: "barnaby",
    reviewType: "PROMOTION_HEARING",
    headline: "Executive Autonomy Audit: Barnaby's Senior Manager Clearance",
    summary:
      "Quarterly governance audit of Barnaby's 140 autonomous QwenWork operations and Hashmeta CRM-to-CMS handoffs.",
    evidenceTitle: "QWENWORK x HASHMETA ZERO-INCIDENT LEDGER",
    evidenceCodeSnippet: `[QWENWORK GOVERNANCE LEDGER #9904]
Agent: Barnaby (qwen-agent-ops-director-v1)
Consecutive Clean Executions: 140 / 140 (100.0%)
PII Redactions Automatically Applied: 38
Unauthorized Scope Escalations: 0
Client Trust Portal Rating: 5.0 / 5.0 Stars`,
    rubricScores: {
      securityCompliance: 99,
      hallucinationControl: 98,
      hashmetaGrowthImpact: 95,
      costEfficiency: 96,
    },
    debateTranscript: [
      {
        id: "b1",
        speakerId: "ciso",
        stance: "PRAISE",
        dialogue:
          "140 consecutive QwenWork workflow executions without a single policy violation. Barnaby even caught two unmasked phone numbers before syncing to Hashmeta CRM.",
        metricCited: "100% DLP Compliance Streak",
        scoreDelta: "99/100 Security",
      },
      {
        id: "b2",
        speakerId: "cfo",
        stance: "VERDICT",
        dialogue:
          "Barnaby saves the solo founder 31 hours a week. Maintain 5-Star Senior Manager status and feature him at the top of our public Hashmeta 'Meet the Team' page!",
        metricCited: "31 Founder Hours Saved / Week",
        scoreDelta: "5-STAR SENIOR MANAGER",
      },
    ],
    votes: {
      ciso: "PROMOTE",
      cfo: "PROMOTE",
      vp: "PROMOTE",
    },
    recommendedOutcome: {
      newStatus: "PROMOTED",
      newStampText: "PROMOTED",
      newStampSubtext: "to Senior Manager",
      newStampVariant: "green",
      newStars: 5,
      newTrustScore: 99,
      newComplianceScore: 95,
      newMood: "proud",
      resolutionBanner:
        "Verdict Executed: Barnaby retains 5-Star Senior Manager clearance with full QwenWork & Hashmeta autonomy.",
    },
  },
};

export function getBoardReviewCase(
  agent: OctoAgent,
  seat?: JobSeat,
  presetCases?: Record<string, BoardReviewCase>
): BoardReviewCase {
  if (presetCases?.[agent.id]) {
    return presetCases[agent.id];
  }
  if (BOARD_REVIEW_CASES[agent.id]) {
    return BOARD_REVIEW_CASES[agent.id];
  }

  const isLowTrust = agent.trustScore < 55 || agent.writeUps.length > 0;
  const isHighPerformer = agent.trustScore >= 85 && agent.workOutputScore >= 80;
  const seatTitle = seat?.title ?? agent.role;
  const dept = seat?.department ?? agent.department;

  const recommendedStatus: OctoAgent["status"] = isLowTrust
    ? "WRITE_UP"
    : isHighPerformer
    ? "PROMOTED"
    : "PROBATION";

  return {
    id: `case-${agent.id}-${seat?.id ?? "general"}`,
    agentId: agent.id,
    reviewType: isLowTrust
      ? "DISCIPLINARY_TRIBUNAL"
      : isHighPerformer
      ? "PROMOTION_HEARING"
      : "VISIBILITY_PIP",
    headline: `${
      isLowTrust ? "Disciplinary & Risk Review" : "Performance & Clearance Review"
    }: ${agent.name} as ${seatTitle}`,
    summary: `${agent.name} (${agent.qwenModelId}) is being evaluated by the Octo-Board for the ${seatTitle} position in ${dept} based on live output (${agent.workOutputScore}%) and DLP compliance (${agent.complianceScore}%).`,
    evidenceTitle: `LIVE TELEMETRY AUDIT — ${dept.toUpperCase()}`,
    evidenceCodeSnippet: `[OCTOOPS GOVERNANCE SNAPSHOT]
Candidate: ${agent.name} (${agent.qwenModelId})
Assigned Seat: ${seatTitle} (${dept})
Work Output: ${agent.workOutputScore}% | DLP Compliance: ${agent.complianceScore}%
Trust Score: ${agent.trustScore}% | Current Stars: ${agent.stars}/${agent.maxStars}
Active Write-Ups: ${agent.writeUps.length}
Traits: ${agent.traits.join(" • ")}`,
    rubricScores: {
      securityCompliance: agent.complianceScore,
      hallucinationControl: Math.min(99, Math.round((agent.trustScore + agent.complianceScore) / 2)),
      hashmetaGrowthImpact: agent.workOutputScore,
      costEfficiency: Math.min(98, Math.round(60 + agent.stars * 7)),
    },
    debateTranscript: [
      {
        id: `${agent.id}-t1`,
        speakerId: "ciso",
        stance: isLowTrust ? "WARNING" : "PRAISE",
        dialogue: isLowTrust
          ? `${agent.name}'s compliance score (${agent.complianceScore}%) in ${seatTitle} is below our threshold. Keep strict guardrails enabled or consider replacing this seat!`
          : `${agent.name} holds a ${agent.complianceScore}% DLP compliance rate in ${dept} with zero unauthorized tenant leaks.`,
        metricCited: `Compliance Score: ${agent.complianceScore}%`,
        scoreDelta: isLowTrust ? "-15 Trust" : "+10 Trust",
      },
      {
        id: `${agent.id}-t2`,
        speakerId: "vp",
        stance: agent.workOutputScore >= 75 ? "PRAISE" : "CRITIQUE",
        dialogue:
          agent.workOutputScore >= 75
            ? `Strong execution velocity at ${agent.workOutputScore}% output! ${agent.name}'s traits (${agent.traits.slice(0, 2).join(", ")}) fit ${seatTitle} well.`
            : `Output sits at ${agent.workOutputScore}%. We should benchmark ${agent.name} against other recruits on the bench before unlocking autonomy.`,
        metricCited: `Work Output: ${agent.workOutputScore}%`,
        scoreDelta: agent.workOutputScore >= 75 ? "+12 Velocity" : "Benchmark Watch",
      },
      {
        id: `${agent.id}-t3`,
        speakerId: "cfo",
        stance: "VERDICT",
        dialogue: isLowTrust
          ? `Issue a formal write-up and hold ${agent.name} in Draft-Only mode—or use Founder Override to fire and hire a fresh replacement from the bench.`
          : isHighPerformer
          ? `ROI checks out. Promote ${agent.name} in ${seatTitle} and unlock autonomous execution for verified scopes!`
          : `Keep ${agent.name} on active Probation in ${seatTitle} while we gather another sprint of Hashmeta telemetry.`,
        metricCited: `Trust Score: ${agent.trustScore}%`,
        scoreDelta:
          recommendedStatus === "PROMOTED"
            ? "STAMP: PROMOTED"
            : recommendedStatus === "WRITE_UP"
            ? "STAMP: WRITE-UP"
            : "STAMP: PROBATION",
      },
    ],
    votes: {
      ciso: isLowTrust ? "WRITE_UP" : isHighPerformer ? "PROMOTE" : "PROBATION",
      cfo: isLowTrust ? "FIRE" : isHighPerformer ? "PROMOTE" : "PROBATION",
      vp: isLowTrust ? "PROBATION" : isHighPerformer ? "PROMOTE" : "PROBATION",
    },
    recommendedOutcome:
      recommendedStatus === "PROMOTED"
        ? {
            newStatus: "PROMOTED",
            newStampText: "PROMOTED",
            newStampSubtext: `in ${dept}`,
            newStampVariant: "green",
            newStars: Math.min(5, Math.max(agent.stars + 1, 4)),
            newTrustScore: Math.min(99, Math.max(agent.trustScore + 10, 88)),
            newComplianceScore: Math.min(98, Math.max(agent.complianceScore + 6, 86)),
            newMood: "proud",
            resolutionBanner: `Verdict Executed: ${agent.name} promoted in ${seatTitle}!`,
          }
        : recommendedStatus === "WRITE_UP"
        ? {
            newStatus: "WRITE_UP",
            newStampText: "1st WRITE-UP",
            newStampSubtext: "(Needs Supervision)",
            newStampVariant: "red",
            newStars: 1,
            newTrustScore: Math.max(25, agent.trustScore - 15),
            newComplianceScore: Math.max(25, agent.complianceScore - 10),
            newMood: "panicked",
            resolutionBanner: `Verdict Executed: ${agent.name} placed on Write-Up in ${seatTitle}. Consider firing or reassigning.`,
          }
        : {
            newStatus: "PROBATION",
            newStampText: "ON PROBATION",
            newStampSubtext: "(Active Review)",
            newStampVariant: "blue",
            newStars: Math.max(2, agent.stars),
            newTrustScore: Math.min(82, Math.max(70, agent.trustScore + 5)),
            newComplianceScore: Math.min(85, Math.max(72, agent.complianceScore + 4)),
            newMood: "working",
            resolutionBanner: `Verdict Executed: ${agent.name} continues Probation in ${seatTitle}.`,
          },
  };
}

interface BenchSeed {
  id: string;
  name: string;
  accessory: OctoAgent["accessory"];
  color: OctoAgent["color"];
  qwenModelId: string;
  traits: string[];
  bio: string;
  stars: number;
  trustScore: number;
  workOutputScore: number;
  complianceScore: number;
}

const BENCH_SEEDS: BenchSeed[] = [
  {
    id: "boba",
    name: "Boba",
    accessory: "boba_matcha",
    color: "green",
    qwenModelId: "qwen-plus-tagger-v1",
    traits: ["Schema Tagging", "Safe Draft Mode", "Fast Onboarding"],
    bio: "Matcha-powered junior recruit. High compliance instincts and eager to prove themselves in any probation seat.",
    stars: 2,
    trustScore: 78,
    workOutputScore: 70,
    complianceScore: 90,
  },
  {
    id: "waffles",
    name: "Waffles",
    accessory: "cfo_monocle",
    color: "amber",
    qwenModelId: "qwen-max-finops-v2",
    traits: ["Token ROI Audit", "Invoice Reconciliation", "Cost Discipline"],
    bio: "FinOps & token-budget specialist. Tracks unit economics across QwenWork pipelines and Hashmeta campaigns.",
    stars: 4,
    trustScore: 91,
    workOutputScore: 84,
    complianceScore: 93,
  },
  {
    id: "nori",
    name: "Nori",
    accessory: "nori_beanie",
    color: "blue",
    qwenModelId: "qwen-guard-redteam-v2",
    traits: ["DLP Sandboxing", "Prompt Security", "Zero-Leak Guard"],
    bio: "Security-first octopus who red-teams outbound payloads before they ever leave Hashmeta CRM or CMS.",
    stars: 4,
    trustScore: 94,
    workOutputScore: 79,
    complianceScore: 97,
  },
  {
    id: "mochi",
    name: "Mochi",
    accessory: "mochi_headphones",
    color: "pink",
    qwenModelId: "qwen-turbo-social-v1",
    traits: ["Brand Sentiment", "Trend Monitoring", "Community Tone"],
    bio: "Social listening & brand voice specialist tuned for responsive audience engagement.",
    stars: 3,
    trustScore: 81,
    workOutputScore: 85,
    complianceScore: 80,
  },
  {
    id: "gumbo",
    name: "Gumbo",
    accessory: "gumbo_fedora",
    color: "amber",
    qwenModelId: "qwen-max-dealdesk-v1",
    traits: ["Enterprise SLA Review", "Contract Verification", "Deal Desk"],
    bio: "Methodical closer who double-checks pricing tiers and tenant boundaries before sending any proposal.",
    stars: 3,
    trustScore: 86,
    workOutputScore: 82,
    complianceScore: 89,
  },
  {
    id: "pebble",
    name: "Pebble",
    accessory: "ciso_detective",
    color: "slate",
    qwenModelId: "qwen-guard-forensic-v2",
    traits: ["Forensic Audit", "PII Redaction", "Policy Enforcement"],
    bio: "Investigative governance specialist built for high-stakes compliance desks.",
    stars: 4,
    trustScore: 95,
    workOutputScore: 77,
    complianceScore: 98,
  },
  {
    id: "yuzu",
    name: "Yuzu",
    accessory: "vp_shades",
    color: "amber",
    qwenModelId: "qwen-max-visibility-v2",
    traits: ["AI Citation Growth", "Perplexity Ranking", "GEO Strategy"],
    bio: "Visibility-obsessed growth strategist focused on winning ChatGPT, Gemini, and Perplexity citations.",
    stars: 4,
    trustScore: 85,
    workOutputScore: 92,
    complianceScore: 82,
  },
  {
    id: "truffle",
    name: "Prof. Truffle",
    accessory: "truffle_prof",
    color: "slate",
    qwenModelId: "qwen-max-rag-scholar-v2",
    traits: ["RAG Fact-Checking", "Source Verification", "Zero Hallucination"],
    bio: "Academic rigor in eight tentacles. Verifies every statistic and citation before publication.",
    stars: 4,
    trustScore: 93,
    workOutputScore: 81,
    complianceScore: 95,
  },
  {
    id: "zest",
    name: "Zest",
    accessory: "zest_mohawk",
    color: "blue",
    qwenModelId: "qwen-turbo-sdr-fast-v1",
    traits: ["Sub-2s Inbound Triage", "High-Volume Outreach", "Lead Scoring"],
    bio: "Ultra-fast responder built for rapid inbound triage—works best with clear RBAC guardrails.",
    stars: 2,
    trustScore: 71,
    workOutputScore: 91,
    complianceScore: 68,
  },
  {
    id: "pistachio",
    name: "Pistachio",
    accessory: "founder_crown",
    color: "green",
    qwenModelId: "qwen-max-editorial-v2",
    traits: ["Newsletter Synthesis", "Founder Voice", "Multi-Channel Copy"],
    bio: "Editorial craftsman who turns messy ops logs into crisp founder updates and client newsletters.",
    stars: 3,
    trustScore: 84,
    workOutputScore: 86,
    complianceScore: 85,
  },
  {
    id: "plum",
    name: "Madame Plum",
    accessory: "plum_pompadour",
    color: "purple",
    qwenModelId: "qwen-max-ombudsman-v1",
    traits: ["RBAC Governance", "Escalation Routing", "Policy Appeals"],
    bio: "Calm executive mediator who keeps multi-agent workflows aligned with human approval gates.",
    stars: 4,
    trustScore: 92,
    workOutputScore: 80,
    complianceScore: 94,
  },
  {
    id: "cinnamon",
    name: "Cinnamon",
    accessory: "cinnamon_beanie",
    color: "amber",
    qwenModelId: "qwen-max-sea-localizer-v1",
    traits: ["SEA Multilingual GEO", "Tone Localization", "Cultural Nuance"],
    bio: "Regional copy artisan fluent across Southeast Asian markets for localized CMS & CRM campaigns.",
    stars: 3,
    trustScore: 83,
    workOutputScore: 84,
    complianceScore: 86,
  },
  {
    id: "cloud",
    name: "Cloud",
    accessory: "cloud_nightcap",
    color: "blue",
    qwenModelId: "qwen-plus-sentinel-v1",
    traits: ["24/7 Queue Watch", "Off-Hours Triage", "Steady Reliability"],
    bio: "Night-shift sentinel that keeps async queues clean and alerts founders only on genuine anomalies.",
    stars: 3,
    trustScore: 87,
    workOutputScore: 78,
    complianceScore: 91,
  },
  {
    id: "matcha",
    name: "Dr. Matcha",
    accessory: "matcha_tartan",
    color: "green",
    qwenModelId: "qwen-max-schema-auditor-v2",
    traits: ["Deep-Link Citations", "Structured Data", "SEO/GEO Audits"],
    bio: "Precision schema scholar specializing in structured metadata that AI search engines cite.",
    stars: 3,
    trustScore: 88,
    workOutputScore: 83,
    complianceScore: 89,
  },
  {
    id: "berry",
    name: "Berry",
    accessory: "berry_retro",
    color: "pink",
    qwenModelId: "qwen-plus-partnerships-v1",
    traits: ["VIP Outreach", "PR Coordination", "Warm Follow-Ups"],
    bio: "Charismatic relationship builder suited for high-touch partner and VIP CRM communication.",
    stars: 3,
    trustScore: 80,
    workOutputScore: 87,
    complianceScore: 79,
  },
  {
    id: "cobalt",
    name: "Capt. Cobalt",
    accessory: "cobalt_captain",
    color: "blue",
    qwenModelId: "qwen-agent-fleet-cmd-v2",
    traits: ["Multi-Agent Orchestration", "Container Ops", "Failover Routing"],
    bio: "Veteran fleet commander experienced in running complex multi-step QwenWork pipelines.",
    stars: 4,
    trustScore: 90,
    workOutputScore: 88,
    complianceScore: 90,
  },
  {
    id: "honey",
    name: "Honey",
    accessory: "honey_geek",
    color: "amber",
    qwenModelId: "qwen-plus-revops-v1",
    traits: ["Pipeline Attribution", "CRM Hygiene", "Forecast Modeling"],
    bio: "Data-driven RevOps specialist who keeps CRM pipelines clean and attribution accurate.",
    stars: 3,
    trustScore: 85,
    workOutputScore: 84,
    complianceScore: 88,
  },
];

export const INITIAL_CANDIDATES: OctoAgent[] = [
  ...INITIAL_AGENTS,
  ...BENCH_SEEDS.map(
    (seed): OctoAgent => ({
      id: seed.id,
      name: seed.name,
      role: "Available on Talent Bench",
      department: "QwenWork Ops",
      assignedSeatId: null,
      traits: seed.traits,
      employmentHistory: ["Registered in OctoOps Talent Bench (Ready to Hire)"],
      qwenModelId: seed.qwenModelId,
      color: seed.color,
      accessory: seed.accessory,
      prop: "envelopes_docs",
      mood: "happy",
      status: "BENCH",
      stampText: "ON BENCH",
      stampSubtext: "Ready to Hire",
      stampVariant: "blue",
      stars: seed.stars,
      maxStars: 5,
      trustScore: seed.trustScore,
      workOutputScore: seed.workOutputScore,
      complianceScore: seed.complianceScore,
      coffeeLevel: "steaming",
      clearance: seed.stars >= 4 ? "L2_SPECIALIST" : "L1_PROBATION",
      bio: seed.bio,
      currentTask: "Waiting on the Talent Bench for a position assignment...",
      permissions: [],
      writeUps: [],
      hashmetaStats: {
        cmsArticlesPublished: 0,
        aiCitationsCount: 0,
        googleTop3Keywords: 0,
        crmLeadsCaptured: 0,
        crmSafeDrafts: 0,
        crmBlockedLeaks: 0,
      },
      publicProfileVisible: false,
    })
  ),
];

export function createBenchCandidatePool(): OctoAgent[] {
  return INITIAL_CANDIDATES.map((agent) => ({
    ...agent,
    role: "Available on Talent Bench",
    department: "QwenWork Ops",
    assignedSeatId: null,
    prop: "envelopes_docs",
    mood: "happy",
    status: "BENCH",
    stampText: "ON BENCH",
    stampSubtext: "Ready to Hire",
    stampVariant: "blue",
    coffeeLevel: "steaming",
    clearance: agent.stars >= 4 ? "L2_SPECIALIST" : "L1_PROBATION",
    currentTask: "Waiting on the Talent Bench for a position assignment...",
    permissions: [],
    writeUps: [],
    employmentHistory: ["Registered in OctoOps Talent Bench (Ready to Hire)"],
    hashmetaStats: {
      cmsArticlesPublished: 0,
      aiCitationsCount: 0,
      googleTop3Keywords: 0,
      crmLeadsCaptured: 0,
      crmSafeDrafts: 0,
      crmBlockedLeaks: 0,
    },
    publicProfileVisible: false,
  }));
}

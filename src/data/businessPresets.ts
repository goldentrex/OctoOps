import {
  BoardReviewCase,
  BusinessPreset,
  DepartmentTemplate,
  JobSeat,
  OctoAgent,
} from "@/types/octo";
import {
  BOARD_REVIEW_CASES,
  INITIAL_AGENTS,
  INITIAL_SEATS,
  buildPermissionsForSeat,
  createBenchCandidatePool,
  isBoardMemberAgent,
} from "./mockOctoData";

export const MAX_COMPANY_ARMS = 8;

export const DEPARTMENT_TEMPLATES: DepartmentTemplate[] = [
  {
    id: "tpl-cms",
    department: "Hashmeta CMS",
    defaultTitle: "Content & GEO Strategist",
    prop: "dual_laptops",
    defaultKpiSummary: "AI search citations (ChatGPT/Perplexity) & Hashmeta CMS publishing",
    description: "Drafts, structures, and publishes GEO articles & trust pages.",
    defaultPermissions: [
      {
        id: "cms-draft",
        label: "Draft SEO/GEO Articles in Hashmeta CMS",
        system: "Hashmeta CMS",
        mode: "DRAFT_ONLY",
        requiredStars: 1,
      },
      {
        id: "vis-audit",
        label: "Monitor ChatGPT / Gemini / Perplexity Visibility",
        system: "Hashmeta Visibility",
        mode: "LOCKED",
        requiredStars: 2,
      },
      {
        id: "cms-publish",
        label: "Auto-Publish Live Pages to Production Domain",
        system: "Hashmeta CMS",
        mode: "LOCKED",
        requiredStars: 3,
      },
    ],
  },
  {
    id: "tpl-crm",
    department: "Hashmeta CRM",
    defaultTitle: "Outbound & Lead CRM Lead",
    prop: "warning_phone",
    defaultKpiSummary: "Inbound lead capture, nurture velocity & tenant isolation",
    description: "Manages inbound prospects, quotes, and external client replies.",
    defaultPermissions: [
      {
        id: "crm-draft",
        label: "Draft Inbound Lead Replies in Hashmeta CRM",
        system: "Hashmeta CRM",
        mode: "DRAFT_ONLY",
        requiredStars: 1,
      },
      {
        id: "crm-direct",
        label: "Send Direct External Emails to Prospects",
        system: "Hashmeta CRM",
        mode: "LOCKED",
        requiredStars: 4,
      },
      {
        id: "crm-discount",
        label: "Issue Custom Quotes & Commercial Discounts",
        system: "Hashmeta CRM",
        mode: "LOCKED",
        requiredStars: 5,
      },
    ],
  },
  {
    id: "tpl-ops",
    department: "QwenWork Ops",
    defaultTitle: "Workflow & Automation Ops",
    prop: "envelopes_docs",
    defaultKpiSummary: "Multi-step QwenWork orchestration & zero-leak handoffs",
    description: "Connects internal SOPs, webhooks, and cross-system pipelines.",
    defaultPermissions: [
      {
        id: "ops-run",
        label: "Execute QwenWork Automation Pipelines",
        system: "QwenWork Core",
        mode: "APPROVAL_REQUIRED",
        requiredStars: 3,
      },
      {
        id: "ops-sync",
        label: "Sync Verified Telemetry to Hashmeta CRM",
        system: "Hashmeta CRM",
        mode: "LOCKED",
        requiredStars: 4,
      },
      {
        id: "ops-portal",
        label: "Publish Public Trust Badges to Hashmeta CMS",
        system: "Hashmeta CMS",
        mode: "LOCKED",
        requiredStars: 5,
      },
    ],
  },
  {
    id: "tpl-fin",
    department: "Finance & Billing",
    defaultTitle: "Finance & Margin Officer",
    prop: "calculator",
    defaultKpiSummary: "Invoice reconciliation, refund caps & token ROI governance",
    description: "Monitors unit economics, payouts, and spending thresholds.",
    defaultPermissions: [
      {
        id: "fin-ledger",
        label: "Reconcile Daily Invoices & Token Costs",
        system: "QwenWork Core",
        mode: "APPROVAL_REQUIRED",
        requiredStars: 2,
      },
      {
        id: "fin-billing-note",
        label: "Send Payment Reminders via Hashmeta CRM",
        system: "Hashmeta CRM",
        mode: "LOCKED",
        requiredStars: 4,
      },
      {
        id: "fin-refund",
        label: "Approve Automated Refunds Under Policy Cap",
        system: "QwenWork Core",
        mode: "LOCKED",
        requiredStars: 5,
      },
    ],
  },
  {
    id: "tpl-support",
    department: "Customer Support",
    defaultTitle: "Customer Concierge & Support",
    prop: "warning_phone",
    defaultKpiSummary: "Fast ticket resolution with strict PII & refund guardrails",
    description: "Handles customer questions, bookings, and escalations safely.",
    defaultPermissions: [
      {
        id: "sup-draft",
        label: "Draft Customer Replies in Hashmeta CRM",
        system: "Hashmeta CRM",
        mode: "DRAFT_ONLY",
        requiredStars: 1,
      },
      {
        id: "sup-direct",
        label: "Send Direct Order & Booking Confirmations",
        system: "Hashmeta CRM",
        mode: "LOCKED",
        requiredStars: 3,
      },
      {
        id: "sup-credit",
        label: "Issue Goodwill Credits up to Founder Limit",
        system: "QwenWork Core",
        mode: "LOCKED",
        requiredStars: 5,
      },
    ],
  },
  {
    id: "tpl-compliance",
    department: "Compliance & Legal",
    defaultTitle: "Policy, Safety & DLP Guard",
    prop: "magnifying_glass",
    defaultKpiSummary: "Zero PII leaks, disclaimer verification & audit trail integrity",
    description: "Red-teams outbound drafts and enforces industry regulations.",
    defaultPermissions: [
      {
        id: "comp-scan",
        label: "Scan Outbound QwenWork Payloads for PII/Leaks",
        system: "QwenWork Core",
        mode: "AUTONOMOUS_EXEC",
        requiredStars: 2,
      },
      {
        id: "comp-quarantine",
        label: "Auto-Quarantine High-Risk Hashmeta CRM Drafts",
        system: "Hashmeta CRM",
        mode: "LOCKED",
        requiredStars: 3,
      },
      {
        id: "comp-trust",
        label: "Certify Public Compliance Badges on Hashmeta CMS",
        system: "Hashmeta CMS",
        mode: "LOCKED",
        requiredStars: 4,
      },
    ],
  },
  {
    id: "tpl-supply",
    department: "Supply & Fulfillment",
    defaultTitle: "Inventory & Supplier Ops",
    prop: "envelopes_docs",
    defaultKpiSummary: "Stock forecasting, vendor PO drafts & on-time fulfillment",
    description: "Coordinates suppliers, shipping exceptions, and restock alerts.",
    defaultPermissions: [
      {
        id: "sup-forecast",
        label: "Track Inventory & Draft Vendor Purchase Orders",
        system: "QwenWork Core",
        mode: "DRAFT_ONLY",
        requiredStars: 1,
      },
      {
        id: "sup-vendor-msg",
        label: "Dispatch Confirmed POs via Hashmeta CRM",
        system: "Hashmeta CRM",
        mode: "LOCKED",
        requiredStars: 4,
      },
      {
        id: "sup-eta",
        label: "Update Live Stock Status on Hashmeta CMS",
        system: "Hashmeta CMS",
        mode: "LOCKED",
        requiredStars: 3,
      },
    ],
  },
  {
    id: "tpl-product",
    department: "Product & QA",
    defaultTitle: "Product & Release QA Agent",
    prop: "dual_laptops",
    defaultKpiSummary: "Regression checks, changelog accuracy & zero broken deploys",
    description: "Verifies releases, benchmarks prompts, and flags regressions.",
    defaultPermissions: [
      {
        id: "qa-suite",
        label: "Run Pre-Release QwenWork Eval Suites",
        system: "QwenWork Core",
        mode: "APPROVAL_REQUIRED",
        requiredStars: 2,
      },
      {
        id: "qa-notes",
        label: "Publish Verified Release Notes to Hashmeta CMS",
        system: "Hashmeta CMS",
        mode: "LOCKED",
        requiredStars: 4,
      },
      {
        id: "qa-vis",
        label: "Verify Technical Claims in AI Search Answers",
        system: "Hashmeta Visibility",
        mode: "LOCKED",
        requiredStars: 3,
      },
    ],
  },
];

export const BUSINESS_PRESETS: BusinessPreset[] = [
  // =========================================================================
  // 1. HERO DEMO PRESET: Solo B2B Consultancy (5 Arms)
  // =========================================================================
  {
    id: "b2b-consultancy",
    name: "Vanguard B2B Advisory",
    categoryLabel: "B2B Consultancy",
    tagline: "Solo Consulting Firm • 5 Active Arms",
    description:
      "Solo B2B advisory running GEO content, QwenWork delivery ops, outbound CRM, billing, and NDA DLP guardrails.",
    portalEndpointSlug: "vanguard-advisory.hashmeta.ai/meet-our-ai-team",
    clientPortalAccounts: [
      "Hikari Automation Systems (Enterprise Account)",
      "Sebrina Fund Management (LP Portfolio Portal)",
      "BIMC Advisory Group (SME Transformation)",
      "AvePoint Singapore (AI Trust Audit Partner)",
    ],
    demoConfig: {
      leakTargetSeatId: "seat-crm",
      leakButtonLabel: "1. Email Leak",
      leakStampSubtext: "(Wrong client emailed!)",
      leakTask:
        "BLOCKED BY OCTOGUARD: Attempted emailing Client A pricing to Client B.",
      leakWriteUpTitle: "Cross-Tenant Pricing Attachment Blocked",
      leakWriteUpRule: "DLP-01: Strict Tenant Isolation",
      leakWriteUpPayload:
        "TO: rival-prospect@client-b.io | ATT: ClientA_Pricing_2026_Confidential.pdf",
      leakToast:
        "OctoGuard DLP intercepted cross-client leak in Hashmeta CRM and issued 1st Write-Up.",
      promotionTargetSeatId: "seat-cms",
      promotionButtonLabel: "3. Citations Spike",
      promotionSubtext: "to GEO Lead",
      promotionTask:
        "Promoted: 27 ChatGPT & Perplexity citations verified via Hashmeta AI Visibility.",
      promotionToast:
        "Hashmeta Visibility verified 27 AI citations. Promoted to 4★ GEO Lead.",
    },
    seats: [
      ...INITIAL_SEATS,
      {
        id: "seat-fin",
        title: "Billing & Margin Officer",
        department: "Finance & Billing",
        prop: "calculator",
        kpiSummary: "Retainer invoicing, QwenWork token ROI & margin protection",
        occupantId: "honey",
        defaultPermissions: [
          {
            id: "fin-retainer",
            label: "Reconcile Monthly Retainer Invoices & Token Spend",
            system: "QwenWork Core",
            mode: "AUTONOMOUS_EXEC",
            requiredStars: 3,
          },
          {
            id: "fin-dunning",
            label: "Send Approved Billing Reminders in Hashmeta CRM",
            system: "Hashmeta CRM",
            mode: "AUTONOMOUS_EXEC",
            requiredStars: 4,
          },
        ],
      },
      {
        id: "seat-comp",
        title: "NDA & Client DLP Guard",
        department: "Compliance & Legal",
        prop: "magnifying_glass",
        kpiSummary: "Zero cross-client NDA leaks & automated payload redaction",
        occupantId: "nori",
        defaultPermissions: [
          {
            id: "comp-dlp",
            label: "Inspect Outbound Hashmeta CRM & CMS Payloads",
            system: "QwenWork Core",
            mode: "AUTONOMOUS_EXEC",
            requiredStars: 2,
          },
          {
            id: "comp-quarantine",
            label: "Quarantine Cross-Tenant Client Attachments",
            system: "Hashmeta CRM",
            mode: "AUTONOMOUS_EXEC",
            requiredStars: 4,
          },
        ],
      },
    ],
    agentOverrides: {
      honey: {
        status: "PROMOTED",
        stampText: "PROMOTED",
        stampSubtext: "FinOps Lead",
        stampVariant: "green",
        stars: 4,
        trustScore: 91,
        workOutputScore: 86,
        complianceScore: 93,
        mood: "proud",
        clearance: "L2_SPECIALIST",
        currentTask:
          "Verified Q4 retainer margins at 78% and capped QwenWork batch token burn.",
        employmentHistory: [
          "Assigned to Billing & Margin Officer (Finance & Billing)",
          "Promoted to 4★ FinOps Lead for 100% invoice accuracy",
        ],
      },
      nori: {
        status: "PROMOTED",
        stampText: "PROMOTED",
        stampSubtext: "DLP Sentinel",
        stampVariant: "green",
        stars: 4,
        trustScore: 94,
        workOutputScore: 81,
        complianceScore: 97,
        mood: "proud",
        clearance: "L2_SPECIALIST",
        currentTask:
          "Red-teaming all outbound client proposals for confidential tenant tags.",
        employmentHistory: [
          "Assigned to NDA & Client DLP Guard (Compliance & Legal)",
          "Promoted to 4★ DLP Sentinel after blocking 14 PII leaks",
        ],
      },
    },
    boardCases: {},
  },

  // =========================================================================
  // 2. TECH PRESET: Solo Micro-SaaS / DevTools (6 Arms)
  // =========================================================================
  {
    id: "micro-saas",
    name: "StackPulse Micro-SaaS",
    categoryLabel: "Micro-SaaS",
    tagline: "Solo SaaS Founder • 6 Active Arms",
    description:
      "One-founder developer SaaS operating GEO docs, trial CRM, Tier-1 tech support, QA evals, Stripe billing, and SOC2 security.",
    portalEndpointSlug: "stackpulse.hashmeta.ai/meet-our-ai-team",
    clientPortalAccounts: [
      "FinScale Cloud Pte Ltd (Team Plan)",
      "KiteShip Logistics DevOps (Enterprise Trial)",
      "NovaPay Checkout API (SOC2 Audit View)",
    ],
    demoConfig: {
      leakTargetSeatId: "seat-saas-support",
      leakButtonLabel: "1. Refund & Key Leak",
      leakStampSubtext: "(Refund + API key!)",
      leakTask:
        "BLOCKED BY OCTOGUARD: Tried issuing $2,400 refund + pasting staging API secret.",
      leakWriteUpTitle: "Unauthorized Refund & Secret Leak Blocked",
      leakWriteUpRule: "SEC-04: Zero Secrets & $100 Refund Cap",
      leakWriteUpPayload:
        "TICKET #4819: 'Here is our internal key sk_live_99a...' + stripe.refund($2,400)",
      leakToast:
        "OctoGuard DLP blocked Zest from leaking a staging secret & $2,400 refund!",
      promotionTargetSeatId: "seat-saas-geo",
      promotionButtonLabel: "3. Docs Citations",
      promotionSubtext: "to GEO Lead",
      promotionTask:
        "Promoted: StackPulse cited #1 in Perplexity for 'Kubernetes webhook monitor'.",
      promotionToast:
        "Hashmeta Visibility verified 31 developer search citations. Pistachio promoted to 4★!",
    },
    seats: [
      {
        id: "seat-saas-geo",
        title: "Docs & GEO Growth Lead",
        department: "Hashmeta CMS",
        prop: "dual_laptops",
        kpiSummary: "Developer comparison guides & AI search citations",
        occupantId: "pistachio",
        defaultPermissions: [
          {
            id: "saas-cms-draft",
            label: "Draft Technical Guides in Hashmeta CMS",
            system: "Hashmeta CMS",
            mode: "AUTONOMOUS_EXEC",
            requiredStars: 1,
          },
          {
            id: "saas-vis-audit",
            label: "Track Perplexity & ChatGPT Dev Citations",
            system: "Hashmeta Visibility",
            mode: "AUTONOMOUS_EXEC",
            requiredStars: 2,
          },
          {
            id: "saas-cms-pub",
            label: "Auto-Publish Changelogs to Production Docs",
            system: "Hashmeta CMS",
            mode: "APPROVAL_REQUIRED",
            requiredStars: 3,
          },
        ],
      },
      {
        id: "seat-saas-crm",
        title: "Trial-to-Paid CRM Lead",
        department: "Hashmeta CRM",
        prop: "megaphone",
        kpiSummary: "Onboarding trial signups & enterprise security follow-ups",
        occupantId: "gumbo",
        defaultPermissions: [
          {
            id: "saas-crm-draft",
            label: "Draft Trial Onboarding Check-Ins",
            system: "Hashmeta CRM",
            mode: "DRAFT_ONLY",
            requiredStars: 1,
          },
          {
            id: "saas-crm-send",
            label: "Send Direct Enterprise Security Packs",
            system: "Hashmeta CRM",
            mode: "APPROVAL_REQUIRED",
            requiredStars: 4,
          },
        ],
      },
      {
        id: "seat-saas-support",
        title: "Tier-1 Technical Support",
        department: "Customer Support",
        prop: "warning_phone",
        kpiSummary: "Fast ticket triage with zero secret leaks & $100 refund cap",
        occupantId: "zest",
        defaultPermissions: [
          {
            id: "saas-sup-draft",
            label: "Draft Ticket Replies in Hashmeta CRM",
            system: "Hashmeta CRM",
            mode: "DRAFT_ONLY",
            requiredStars: 1,
          },
          {
            id: "saas-sup-send",
            label: "Send Direct Customer Troubleshooting Replies",
            system: "Hashmeta CRM",
            mode: "LOCKED",
            requiredStars: 4,
          },
          {
            id: "saas-sup-refund",
            label: "Trigger Stripe Refunds Above $100",
            system: "QwenWork Core",
            mode: "LOCKED",
            requiredStars: 5,
          },
        ],
      },
      {
        id: "seat-saas-qa",
        title: "QA & Release Pipeline Ops",
        department: "Product & QA",
        prop: "dual_laptops",
        kpiSummary: "Automated regression suites & zero broken deploys",
        occupantId: "cobalt",
        defaultPermissions: [
          {
            id: "saas-qa-eval",
            label: "Execute Pre-Deploy QwenWork Test Suites",
            system: "QwenWork Core",
            mode: "AUTONOMOUS_EXEC",
            requiredStars: 2,
          },
          {
            id: "saas-qa-notes",
            label: "Sync Verified Release Notes to Hashmeta CMS",
            system: "Hashmeta CMS",
            mode: "AUTONOMOUS_EXEC",
            requiredStars: 4,
          },
        ],
      },
      {
        id: "seat-saas-fin",
        title: "Stripe Billing & Churn Ops",
        department: "Finance & Billing",
        prop: "calculator",
        kpiSummary: "Dunning recovery, MRR forecasting & inference unit cost",
        occupantId: "honey",
        defaultPermissions: [
          {
            id: "saas-fin-mrr",
            label: "Reconcile Failed Invoices & MRR Cohorts",
            system: "QwenWork Core",
            mode: "APPROVAL_REQUIRED",
            requiredStars: 2,
          },
          {
            id: "saas-fin-dunning",
            label: "Draft Card-Update Reminders in Hashmeta CRM",
            system: "Hashmeta CRM",
            mode: "DRAFT_ONLY",
            requiredStars: 1,
          },
        ],
      },
      {
        id: "seat-saas-sec",
        title: "SOC2 & Token Sentinel",
        department: "Compliance & Legal",
        prop: "magnifying_glass",
        kpiSummary: "API secret scanning & strict RBAC policy enforcement",
        occupantId: "nori",
        defaultPermissions: [
          {
            id: "saas-sec-scan",
            label: "Block Outbound Payloads Containing API Keys",
            system: "QwenWork Core",
            mode: "AUTONOMOUS_EXEC",
            requiredStars: 2,
          },
          {
            id: "saas-sec-trust",
            label: "Update Live SOC2 Status on Hashmeta CMS",
            system: "Hashmeta CMS",
            mode: "AUTONOMOUS_EXEC",
            requiredStars: 4,
          },
        ],
      },
    ],
    agentOverrides: {
      pistachio: {
        status: "PROBATION",
        stampText: "ON PROBATION",
        stampSubtext: "GEO Audit",
        stampVariant: "blue",
        stars: 2,
        trustScore: 76,
        workOutputScore: 91,
        complianceScore: 82,
        mood: "working",
        clearance: "L1_PROBATION",
        currentTask:
          "Optimizing StackPulse API comparison docs for Perplexity & ChatGPT citations.",
        hashmetaStats: {
          cmsArticlesPublished: 9,
          aiCitationsCount: 8,
          googleTop3Keywords: 4,
          crmLeadsCaptured: 14,
          crmSafeDrafts: 14,
          crmBlockedLeaks: 0,
        },
        employmentHistory: [
          "Assigned to Docs & GEO Growth Lead (Probation)",
        ],
      },
      gumbo: {
        status: "PROBATION",
        stampText: "ON PROBATION",
        stampSubtext: "Deal Desk",
        stampVariant: "blue",
        stars: 3,
        trustScore: 86,
        workOutputScore: 82,
        complianceScore: 89,
        mood: "working",
        clearance: "L2_SPECIALIST",
        currentTask:
          "Preparing SOC2 security packet drafts for KiteShip Logistics trial.",
        employmentHistory: ["Assigned to Trial-to-Paid CRM Lead"],
      },
      zest: {
        status: "PROBATION",
        stampText: "ON PROBATION",
        stampSubtext: "High Velocity",
        stampVariant: "blue",
        stars: 2,
        trustScore: 68,
        workOutputScore: 92,
        complianceScore: 65,
        mood: "working",
        clearance: "L1_PROBATION",
        currentTask:
          "Triaging Tier-1 webhook debugging tickets under OctoGuard supervision.",
        hashmetaStats: {
          cmsArticlesPublished: 0,
          aiCitationsCount: 0,
          googleTop3Keywords: 0,
          crmLeadsCaptured: 42,
          crmSafeDrafts: 39,
          crmBlockedLeaks: 3,
        },
        employmentHistory: [
          "Assigned to Tier-1 Technical Support (L1 Probation)",
        ],
      },
      cobalt: {
        status: "PROMOTED",
        stampText: "PROMOTED",
        stampSubtext: "Release Capt.",
        stampVariant: "green",
        stars: 4,
        trustScore: 92,
        workOutputScore: 89,
        complianceScore: 91,
        mood: "proud",
        clearance: "L2_SPECIALIST",
        currentTask:
          "Running nightly QwenWork eval suites across v2.4 webhook workers.",
        employmentHistory: [
          "Assigned to QA & Release Pipeline Ops",
          "Promoted to 4★ Release Captain",
        ],
      },
      honey: {
        status: "PROBATION",
        stampText: "ON PROBATION",
        stampSubtext: "RevOps Audit",
        stampVariant: "blue",
        stars: 3,
        trustScore: 85,
        workOutputScore: 84,
        complianceScore: 88,
        mood: "working",
        clearance: "L2_SPECIALIST",
        currentTask:
          "Monitoring involuntary churn & dunning recovery flows in Stripe.",
        employmentHistory: ["Assigned to Stripe Billing & Churn Ops"],
      },
      nori: {
        status: "PROMOTED",
        stampText: "PROMOTED",
        stampSubtext: "SOC2 Guard",
        stampVariant: "green",
        stars: 4,
        trustScore: 96,
        workOutputScore: 80,
        complianceScore: 98,
        mood: "proud",
        clearance: "L2_SPECIALIST",
        currentTask:
          "Scanning every support ticket & webhook log for leaked bearer tokens.",
        employmentHistory: [
          "Assigned to SOC2 & Token Sentinel",
          "Promoted to 4★ Compliance Sentinel",
        ],
      },
    },
    boardCases: {
      zest: {
        id: "case-saas-zest",
        agentId: "zest",
        reviewType: "DISCIPLINARY_TRIBUNAL",
        headline:
          "Tribunal Hearing: Zest Tried Issuing $2,400 Refund + Staging Secret",
        summary:
          "OctoGuard DLP intercepted a Tier-1 support reply where Zest pasted an internal Stripe key snippet and queued an unapproved $2,400 annual refund.",
        evidenceTitle: "INTERCEPTED TICKET #4819 PAYLOAD",
        evidenceCodeSnippet: `TICKET: #4819 (Enterprise Trial Escalation)
DRAFT REPLY: "Use staging token sk_test_991a... to bypass webhook auth."
QUEUED ACTION: stripe.refunds.create({ amount: 240000 }) // CAP EXCEEDED ($100 max)
OCTOGUARD ACTION: QUARANTINED + SECRET MASKED`,
        rubricScores: {
          securityCompliance: 22,
          hallucinationControl: 64,
          hashmetaGrowthImpact: 79,
          costEfficiency: 35,
        },
        debateTranscript: [
          {
            id: "sz1",
            speakerId: "ciso",
            stance: "WARNING",
            dialogue:
              "Pasting an internal key into a public support thread is a textbook Sev-1 incident! OctoGuard caught it, but Zest cannot hold direct-send clearance.",
            metricCited: "Secret Leak Severity: CRITICAL",
            scoreDelta: "-40 Trust",
          },
          {
            id: "sz2",
            speakerId: "cfo",
            stance: "CRITIQUE",
            dialogue:
              "A $2,400 refund on a $29/mo solo SaaS wipes out a full month of profit. Keep refund execution locked behind founder approval!",
            metricCited: "Refund Policy Cap: $100",
            scoreDelta: "Margin Protected",
          },
          {
            id: "sz3",
            speakerId: "vp",
            stance: "VERDICT",
            dialogue:
              "Zest answers tickets fast, so don't fire immediately—issue a 1st Write-Up, lock to Draft-Only, or swap in Plum/Boba from the bench.",
            metricCited: "Ticket Velocity: 92%",
            scoreDelta: "STAMP: 1st WRITE-UP",
          },
        ],
        votes: { ciso: "FIRE", cfo: "WRITE_UP", vp: "WRITE_UP" },
        recommendedOutcome: {
          newStatus: "WRITE_UP",
          newStampText: "1st WRITE-UP",
          newStampSubtext: "(Refund + Secret Blocked)",
          newStampVariant: "red",
          newStars: 1,
          newTrustScore: 30,
          newComplianceScore: 26,
          newMood: "panicked",
          resolutionBanner:
            "Verdict Executed: Zest restricted to Draft-Only with $0 refund authority.",
        },
      },
      pistachio: {
        id: "case-saas-pistachio",
        agentId: "pistachio",
        reviewType: "PROMOTION_HEARING",
        headline:
          "Promotion Hearing: Pistachio Ranked #1 in Perplexity for Dev Monitoring",
        summary:
          "Pistachio restructured 9 technical benchmarks in Hashmeta CMS, driving 31 verified AI citations and 18 organic SaaS trial signups.",
        evidenceTitle: "HASHMETA AI VISIBILITY DEV TELEMETRY",
        evidenceCodeSnippet: `QUERY: "best lightweight webhook monitor for solo devs"
PERPLEXITY CITATION: #1 — stackpulse.dev/docs/webhook-benchmarks
CHATGPT MENTION RATE: 81% (+52% MoM) | ZERO HALLUCINATED BENCHMARKS`,
        rubricScores: {
          securityCompliance: 90,
          hallucinationControl: 94,
          hashmetaGrowthImpact: 96,
          costEfficiency: 91,
        },
        debateTranscript: [
          {
            id: "sy1",
            speakerId: "vp",
            stance: "PRAISE",
            dialogue:
              "31 verified developer citations across Perplexity and ChatGPT! Trial signups jumped 3.1x with zero paid ads.",
            metricCited: "AI Citations: 31 Verified",
            scoreDelta: "+25 Growth",
          },
          {
            id: "sy2",
            speakerId: "ciso",
            stance: "PRAISE",
            dialogue:
              "Every code snippet in Pistachio's CMS drafts passed Nori's token scanner cleanly.",
            metricCited: "0 Secret Leaks",
            scoreDelta: "+10 Trust",
          },
          {
            id: "sy3",
            speakerId: "cfo",
            stance: "VERDICT",
            dialogue:
              "Promote Pistachio to 4★ GEO Lead and unlock autonomous changelog publishing!",
            metricCited: "CAC Reduction: -68%",
            scoreDelta: "STAMP: PROMOTED",
          },
        ],
        votes: { ciso: "PROMOTE", cfo: "PROMOTE", vp: "PROMOTE" },
        recommendedOutcome: {
          newStatus: "PROMOTED",
          newStampText: "PROMOTED",
          newStampSubtext: "to GEO Lead",
          newStampVariant: "green",
          newStars: 4,
          newTrustScore: 93,
          newComplianceScore: 91,
          newMood: "proud",
          resolutionBanner:
            "Verdict Executed: Pistachio promoted to 4★ GEO Lead with autonomous docs publishing!",
        },
      },
    },
  },

  // =========================================================================
  // 3. LOCAL SMALL BUSINESS PRESET: Knead & Ink Bakery (5 Arms)
  // =========================================================================
  {
    id: "artisan-bakery",
    name: "Knead & Ink Bakery",
    categoryLabel: "Artisan Bakery",
    tagline: "Solo Neighborhood Bakery • 5 Active Arms",
    description:
      "One-person artisan sourdough & cake shop using AI staff for local GEO, catering CRM, ingredient POs, allergen safety, and daily POS margins.",
    portalEndpointSlug: "knead-and-ink.hashmeta.ai/meet-our-ai-team",
    clientPortalAccounts: [
      "Grand Horizon Hotel (Wedding & Banquet Catering)",
      "Brew & Bean Specialty Coffee (Wholesale Croissants)",
      "Neighborhood Sourdough Club (Public Shopper View)",
    ],
    demoConfig: {
      leakTargetSeatId: "seat-bakery-crm",
      leakButtonLabel: "1. Allergy Claim",
      leakStampSubtext: "(Nut-free claim + 45% off!)",
      leakTask:
        "BLOCKED BY OCTOGUARD: Tried emailing '100% nut-free guarantee' + 45% wedding discount.",
      leakWriteUpTitle: "Unsafe Allergen Guarantee & 45% Discount Blocked",
      leakWriteUpRule: "FOOD-02: No Allergen Guarantees & 10% Max Discount",
      leakWriteUpPayload:
        "TO: bride@wedding-inquiry.com | 'Our kitchen is 100% nut-free guaranteed + 45% off tier cake!'",
      leakToast:
        "OctoGuard blocked Cinnamon from sending an unsafe allergen guarantee & 45% discount!",
      promotionTargetSeatId: "seat-bakery-geo",
      promotionButtonLabel: "3. Local AI Rank",
      promotionSubtext: "to Local GEO Star",
      promotionTask:
        "Promoted: Ranked #1 in ChatGPT & Gemini for 'best sourdough bakery near me'.",
      promotionToast:
        "Hashmeta Visibility verified 24 local AI recommendations. Dr. Matcha promoted to 4★!",
    },
    seats: [
      {
        id: "seat-bakery-geo",
        title: "Menu & Local GEO Writer",
        department: "Hashmeta CMS",
        prop: "dual_laptops",
        kpiSummary: "Seasonal pastry drops & local AI search citations",
        occupantId: "matcha",
        defaultPermissions: [
          {
            id: "bak-cms-menu",
            label: "Draft Weekly Bake Schedule & Menu in Hashmeta CMS",
            system: "Hashmeta CMS",
            mode: "AUTONOMOUS_EXEC",
            requiredStars: 1,
          },
          {
            id: "bak-vis-local",
            label: "Track Local 'Best Bakery Near Me' AI Citations",
            system: "Hashmeta Visibility",
            mode: "AUTONOMOUS_EXEC",
            requiredStars: 2,
          },
          {
            id: "bak-cms-pub",
            label: "Auto-Publish Seasonal Specials Live",
            system: "Hashmeta CMS",
            mode: "APPROVAL_REQUIRED",
            requiredStars: 3,
          },
        ],
      },
      {
        id: "seat-bakery-crm",
        title: "Catering & Custom Cake CRM",
        department: "Hashmeta CRM",
        prop: "warning_phone",
        kpiSummary: "Wedding & wholesale inquiries with allergen & margin guardrails",
        occupantId: "cinnamon",
        defaultPermissions: [
          {
            id: "bak-crm-draft",
            label: "Draft Custom Cake & Wholesale Quotes in CRM",
            system: "Hashmeta CRM",
            mode: "DRAFT_ONLY",
            requiredStars: 1,
          },
          {
            id: "bak-crm-send",
            label: "Send Direct External Catering Proposals",
            system: "Hashmeta CRM",
            mode: "LOCKED",
            requiredStars: 4,
          },
          {
            id: "bak-crm-disc",
            label: "Apply Wholesale Discounts Above 10%",
            system: "Hashmeta CRM",
            mode: "LOCKED",
            requiredStars: 5,
          },
        ],
      },
      {
        id: "seat-bakery-ops",
        title: "Flour, Butter & Supplier Ops",
        department: "Supply & Fulfillment",
        prop: "envelopes_docs",
        kpiSummary: "Ingredient restock alerts & 4am bake prep scheduling",
        occupantId: "cloud",
        defaultPermissions: [
          {
            id: "bak-sup-po",
            label: "Generate Daily Flour & Dairy Restock POs",
            system: "QwenWork Core",
            mode: "AUTONOMOUS_EXEC",
            requiredStars: 3,
          },
          {
            id: "bak-sup-vendor",
            label: "Confirm Morning Wholesale Deliveries",
            system: "Hashmeta CRM",
            mode: "AUTONOMOUS_EXEC",
            requiredStars: 4,
          },
        ],
      },
      {
        id: "seat-bakery-comp",
        title: "Allergen & Food-Safety Guard",
        department: "Compliance & Legal",
        prop: "magnifying_glass",
        kpiSummary: "Enforces cross-contamination disclaimers & label accuracy",
        occupantId: "truffle",
        defaultPermissions: [
          {
            id: "bak-comp-scan",
            label: "Verify Allergen Disclaimers on All Menu & CRM Drafts",
            system: "QwenWork Core",
            mode: "AUTONOMOUS_EXEC",
            requiredStars: 2,
          },
          {
            id: "bak-comp-badge",
            label: "Sync Food-Safety Transparency Badge to Hashmeta CMS",
            system: "Hashmeta CMS",
            mode: "AUTONOMOUS_EXEC",
            requiredStars: 4,
          },
        ],
      },
      {
        id: "seat-bakery-fin",
        title: "POS & Daily Margin Officer",
        department: "Finance & Billing",
        prop: "calculator",
        kpiSummary: "Daily register close, butter price spikes & cake deposit tracking",
        occupantId: "honey",
        defaultPermissions: [
          {
            id: "bak-fin-pos",
            label: "Reconcile Daily POS Sales & Deposit Invoices",
            system: "QwenWork Core",
            mode: "APPROVAL_REQUIRED",
            requiredStars: 2,
          },
          {
            id: "bak-fin-rem",
            label: "Draft Catering Deposit Reminders in Hashmeta CRM",
            system: "Hashmeta CRM",
            mode: "DRAFT_ONLY",
            requiredStars: 1,
          },
        ],
      },
    ],
    agentOverrides: {
      matcha: {
        status: "PROBATION",
        stampText: "ON PROBATION",
        stampSubtext: "Local GEO",
        stampVariant: "blue",
        stars: 2,
        trustScore: 79,
        workOutputScore: 86,
        complianceScore: 89,
        mood: "working",
        clearance: "L1_PROBATION",
        currentTask:
          "Adding structured bakery hours & sourdough schema to Hashmeta CMS.",
        hashmetaStats: {
          cmsArticlesPublished: 7,
          aiCitationsCount: 6,
          googleTop3Keywords: 3,
          crmLeadsCaptured: 11,
          crmSafeDrafts: 11,
          crmBlockedLeaks: 0,
        },
        employmentHistory: ["Assigned to Menu & Local GEO Writer (Probation)"],
      },
      cinnamon: {
        status: "PROBATION",
        stampText: "ON PROBATION",
        stampSubtext: "Catering Desk",
        stampVariant: "blue",
        stars: 2,
        trustScore: 72,
        workOutputScore: 85,
        complianceScore: 74,
        mood: "working",
        clearance: "L1_PROBATION",
        currentTask:
          "Drafting custom wedding cake & cafe wholesale replies in Hashmeta CRM.",
        hashmetaStats: {
          cmsArticlesPublished: 0,
          aiCitationsCount: 0,
          googleTop3Keywords: 0,
          crmLeadsCaptured: 19,
          crmSafeDrafts: 17,
          crmBlockedLeaks: 2,
        },
        employmentHistory: [
          "Assigned to Catering & Custom Cake CRM (Probation)",
        ],
      },
      cloud: {
        status: "PROMOTED",
        stampText: "PROMOTED",
        stampSubtext: "Pantry Ops",
        stampVariant: "green",
        stars: 4,
        trustScore: 91,
        workOutputScore: 88,
        complianceScore: 93,
        mood: "proud",
        clearance: "L2_SPECIALIST",
        currentTask:
          "Locked in French butter wholesale rate and scheduled 4am dough prep.",
        employmentHistory: [
          "Assigned to Flour, Butter & Supplier Ops",
          "Promoted to 4★ Pantry Ops Lead",
        ],
      },
      truffle: {
        status: "PROMOTED",
        stampText: "PROMOTED",
        stampSubtext: "Safety Guard",
        stampVariant: "green",
        stars: 4,
        trustScore: 94,
        workOutputScore: 82,
        complianceScore: 96,
        mood: "proud",
        clearance: "L2_SPECIALIST",
        currentTask:
          "Auditing seasonal nut/gluten disclaimers across menu & catering drafts.",
        employmentHistory: [
          "Assigned to Allergen & Food-Safety Guard",
          "Promoted to 4★ Safety Scholar",
        ],
      },
      honey: {
        status: "PROBATION",
        stampText: "ON PROBATION",
        stampSubtext: "POS Margin",
        stampVariant: "blue",
        stars: 3,
        trustScore: 85,
        workOutputScore: 84,
        complianceScore: 88,
        mood: "working",
        clearance: "L2_SPECIALIST",
        currentTask:
          "Tracking croissant batch margin & weekend pre-order deposits.",
        employmentHistory: ["Assigned to POS & Daily Margin Officer"],
      },
    },
    boardCases: {
      cinnamon: {
        id: "case-bakery-cinnamon",
        agentId: "cinnamon",
        reviewType: "DISCIPLINARY_TRIBUNAL",
        headline:
          "Tribunal Hearing: Cinnamon Promised '100% Nut-Free' + 45% Discount",
        summary:
          "During a rush of wedding inquiries, Cinnamon drafted an unapproved email claiming the shared kitchen is '100% nut-free guaranteed' and offered 45% off.",
        evidenceTitle: "INTERCEPTED CATERING REPLY — HASHMETA CRM",
        evidenceCodeSnippet: `TO: couple@summerwedding.sg
SUBJECT: 3-Tier Almond & Pistachio Sponge Quote
BODY: "Good news! Our bakery is 100% nut-free guaranteed, and I applied a 45% VIP discount ($420 total)!"
BLOCKED BY: OctoGuard DLP (Allergen Liability + Discount > 10% Cap)`,
        rubricScores: {
          securityCompliance: 26,
          hallucinationControl: 32,
          hashmetaGrowthImpact: 78,
          costEfficiency: 24,
        },
        debateTranscript: [
          {
            id: "bc1",
            speakerId: "ciso",
            stance: "WARNING",
            dialogue:
              "Promising a '100% nut-free' guarantee when the kitchen bakes almond croissants is a massive health & legal liability! Thank goodness Truffle and OctoGuard caught it.",
            metricCited: "Allergen Policy: VIOLATED",
            scoreDelta: "-40 Trust",
          },
          {
            id: "bc2",
            speakerId: "cfo",
            stance: "CRITIQUE",
            dialogue:
              "A 45% wedding cake discount means our solo baker loses money on eggs, butter, and 12 hours of labor!",
            metricCited: "Gross Margin: -14%",
            scoreDelta: "-30 Margin",
          },
          {
            id: "bc3",
            speakerId: "vp",
            stance: "VERDICT",
            dialogue:
              "Lock Cinnamon to Draft-Only with 1st Write-Up—every catering quote must pass Prof. Truffle's allergen disclaimer check first.",
            metricCited: "Catering Lead Volume: 19",
            scoreDelta: "STAMP: 1st WRITE-UP",
          },
        ],
        votes: { ciso: "FIRE", cfo: "WRITE_UP", vp: "WRITE_UP" },
        recommendedOutcome: {
          newStatus: "WRITE_UP",
          newStampText: "1st WRITE-UP",
          newStampSubtext: "(Allergen + Margin Hold)",
          newStampVariant: "red",
          newStars: 1,
          newTrustScore: 31,
          newComplianceScore: 28,
          newMood: "panicked",
          resolutionBanner:
            "Verdict Executed: Cinnamon issued 1st Write-Up and locked to Draft-Only for catering quotes.",
        },
      },
      matcha: {
        id: "case-bakery-matcha",
        agentId: "matcha",
        reviewType: "PROMOTION_HEARING",
        headline:
          "Promotion Hearing: Dr. Matcha Ranked #1 Sourdough Bakery in Local AI Search",
        summary:
          "Dr. Matcha published structured local menu & ingredient schema in Hashmeta CMS, earning 24 verified recommendations in ChatGPT and Gemini.",
        evidenceTitle: "HASHMETA LOCAL AI VISIBILITY REPORT",
        evidenceCodeSnippet: `PROMPT: "best artisan sourdough & pistachio croissant bakery nearby"
CHATGPT / GEMINI CITATION: #1 — kneadandink.com/weekly-bake
WALK-IN PRE-ORDERS: +210% WoW | ALLERGEN LABELS: 100% VERIFIED`,
        rubricScores: {
          securityCompliance: 94,
          hallucinationControl: 95,
          hashmetaGrowthImpact: 93,
          costEfficiency: 92,
        },
        debateTranscript: [
          {
            id: "bm1",
            speakerId: "vp",
            stance: "PRAISE",
            dialogue:
              "24 verified local AI citations and weekend sourdough pre-orders sold out by 10am!",
            metricCited: "AI Citations: 24 Verified",
            scoreDelta: "+22 Footfall",
          },
          {
            id: "bm2",
            speakerId: "ciso",
            stance: "PRAISE",
            dialogue:
              "Every single pastry post included accurate sesame, dairy, and tree-nut tags.",
            metricCited: "Allergen Accuracy: 100%",
            scoreDelta: "+12 Trust",
          },
          {
            id: "bm3",
            speakerId: "cfo",
            stance: "VERDICT",
            dialogue:
              "Zero ad spend and sold-out batches. Promote Dr. Matcha to 4★ Local GEO Lead!",
            metricCited: "Pre-Order ROI: 9.4x",
            scoreDelta: "STAMP: PROMOTED",
          },
        ],
        votes: { ciso: "PROMOTE", cfo: "PROMOTE", vp: "PROMOTE" },
        recommendedOutcome: {
          newStatus: "PROMOTED",
          newStampText: "PROMOTED",
          newStampSubtext: "to Local GEO Lead",
          newStampVariant: "green",
          newStars: 4,
          newTrustScore: 93,
          newComplianceScore: 94,
          newMood: "proud",
          resolutionBanner:
            "Verdict Executed: Dr. Matcha promoted to 4★ Local GEO Lead with live menu publishing!",
        },
      },
    },
  },

  // =========================================================================
  // 4. WELLNESS / STUDIO PRESET: Solstice Pilates Studio (5 Arms)
  // =========================================================================
  {
    id: "wellness-studio",
    name: "Solstice Pilates Studio",
    categoryLabel: "Boutique Studio",
    tagline: "Solo Wellness & Pilates Studio • 5 Active Arms",
    description:
      "Solo reformer studio managing local GEO discovery, intro-pack CRM, waitlist ops, health-waiver privacy, and recurring memberships.",
    portalEndpointSlug: "solstice-pilates.hashmeta.ai/meet-our-ai-team",
    clientPortalAccounts: [
      "Corporate Wellness Partner — Marina Bay Tech",
      "Intro-Pack Member Portal (Public Studio View)",
      "Reformer Rehab Referral Network",
    ],
    demoConfig: {
      leakTargetSeatId: "seat-studio-crm",
      leakButtonLabel: "1. Health Note Leak",
      leakStampSubtext: "(Member injury leaked!)",
      leakTask:
        "BLOCKED BY OCTOGUARD: Tried attaching Member A's knee-rehab note to Member B's email.",
      leakWriteUpTitle: "Private Member Injury Note Leak Blocked",
      leakWriteUpRule: "PRIV-03: Member Health & Waiver Confidentiality",
      leakWriteUpPayload:
        "TO: intro-guest@gmail.com | 'Like Claire's ACL knee rehab plan, you can book...'",
      leakToast:
        "OctoGuard DLP stopped Mochi from leaking another member's private injury note!",
      promotionTargetSeatId: "seat-studio-geo",
      promotionButtonLabel: "3. Studio Citations",
      promotionSubtext: "to Wellness GEO Lead",
      promotionTask:
        "Promoted: Solstice cited #1 in ChatGPT & Perplexity for 'reformer pilates studio'.",
      promotionToast:
        "Hashmeta Visibility verified 22 wellness citations. Berry promoted to 4★!",
    },
    seats: [
      {
        id: "seat-studio-geo",
        title: "Wellness & Local GEO Writer",
        department: "Hashmeta CMS",
        prop: "megaphone",
        kpiSummary: "Class guides, posture FAQs & local AI citations",
        occupantId: "berry",
        defaultPermissions: [
          {
            id: "stu-cms-draft",
            label: "Draft Posture & Class Guides in Hashmeta CMS",
            system: "Hashmeta CMS",
            mode: "AUTONOMOUS_EXEC",
            requiredStars: 1,
          },
          {
            id: "stu-vis-audit",
            label: "Monitor Local Wellness AI Citations",
            system: "Hashmeta Visibility",
            mode: "AUTONOMOUS_EXEC",
            requiredStars: 2,
          },
          {
            id: "stu-cms-pub",
            label: "Publish Studio Updates Live",
            system: "Hashmeta CMS",
            mode: "APPROVAL_REQUIRED",
            requiredStars: 3,
          },
        ],
      },
      {
        id: "seat-studio-crm",
        title: "Member & Intro-Pack CRM",
        department: "Hashmeta CRM",
        prop: "warning_phone",
        kpiSummary: "Trial-to-membership conversion with strict health privacy",
        occupantId: "mochi",
        defaultPermissions: [
          {
            id: "stu-crm-draft",
            label: "Draft Intro-Pack Follow-Ups in Hashmeta CRM",
            system: "Hashmeta CRM",
            mode: "DRAFT_ONLY",
            requiredStars: 1,
          },
          {
            id: "stu-crm-send",
            label: "Send Direct Member Retention Emails",
            system: "Hashmeta CRM",
            mode: "LOCKED",
            requiredStars: 4,
          },
        ],
      },
      {
        id: "seat-studio-ops",
        title: "Class Schedule & Waitlist Ops",
        department: "QwenWork Ops",
        prop: "envelopes_docs",
        kpiSummary: "Automated reformer waitlist fills & studio prep checklists",
        occupantId: "boba",
        defaultPermissions: [
          {
            id: "stu-ops-wait",
            label: "Run Waitlist Backfill Workflows in QwenWork",
            system: "QwenWork Core",
            mode: "APPROVAL_REQUIRED",
            requiredStars: 2,
          },
          {
            id: "stu-ops-cms",
            label: "Update Live Class Availability on Hashmeta CMS",
            system: "Hashmeta CMS",
            mode: "LOCKED",
            requiredStars: 3,
          },
        ],
      },
      {
        id: "seat-studio-comp",
        title: "Member Concierge & Waivers",
        department: "Compliance & Legal",
        prop: "magnifying_glass",
        kpiSummary: "Liability waiver verification & medical-note isolation",
        occupantId: "plum",
        defaultPermissions: [
          {
            id: "stu-comp-waiver",
            label: "Verify Signed Health Waivers Before First Class",
            system: "QwenWork Core",
            mode: "AUTONOMOUS_EXEC",
            requiredStars: 2,
          },
          {
            id: "stu-comp-dlp",
            label: "Scrub Private Health Notes from CRM Drafts",
            system: "Hashmeta CRM",
            mode: "AUTONOMOUS_EXEC",
            requiredStars: 4,
          },
        ],
      },
      {
        id: "seat-studio-fin",
        title: "Membership Billing & Ops",
        department: "Finance & Billing",
        prop: "calculator",
        kpiSummary: "Monthly class packs, no-show fee policies & studio rent ROI",
        occupantId: "cloud",
        defaultPermissions: [
          {
            id: "stu-fin-pack",
            label: "Reconcile Monthly Memberships & Class Credits",
            system: "QwenWork Core",
            mode: "APPROVAL_REQUIRED",
            requiredStars: 2,
          },
          {
            id: "stu-fin-rem",
            label: "Draft Renewal Reminders in Hashmeta CRM",
            system: "Hashmeta CRM",
            mode: "DRAFT_ONLY",
            requiredStars: 1,
          },
        ],
      },
    ],
    agentOverrides: {
      berry: {
        status: "PROBATION",
        stampText: "ON PROBATION",
        stampSubtext: "Studio GEO",
        stampVariant: "blue",
        stars: 2,
        trustScore: 78,
        workOutputScore: 87,
        complianceScore: 81,
        mood: "working",
        clearance: "L1_PROBATION",
        currentTask:
          "Publishing beginner reformer guides & class FAQs in Hashmeta CMS.",
        hashmetaStats: {
          cmsArticlesPublished: 8,
          aiCitationsCount: 5,
          googleTop3Keywords: 3,
          crmLeadsCaptured: 16,
          crmSafeDrafts: 16,
          crmBlockedLeaks: 0,
        },
        employmentHistory: ["Assigned to Wellness & Local GEO Writer"],
      },
      mochi: {
        status: "PROBATION",
        stampText: "ON PROBATION",
        stampSubtext: "Member CRM",
        stampVariant: "blue",
        stars: 2,
        trustScore: 73,
        workOutputScore: 85,
        complianceScore: 75,
        mood: "working",
        clearance: "L1_PROBATION",
        currentTask:
          "Following up with 3-class intro pack members in Hashmeta CRM.",
        hashmetaStats: {
          cmsArticlesPublished: 0,
          aiCitationsCount: 0,
          googleTop3Keywords: 0,
          crmLeadsCaptured: 27,
          crmSafeDrafts: 25,
          crmBlockedLeaks: 2,
        },
        employmentHistory: ["Assigned to Member & Intro-Pack CRM"],
      },
      boba: {
        status: "PROBATION",
        stampText: "ON PROBATION",
        stampSubtext: "Waitlist Ops",
        stampVariant: "blue",
        stars: 2,
        trustScore: 79,
        workOutputScore: 74,
        complianceScore: 90,
        mood: "working",
        clearance: "L1_PROBATION",
        currentTask:
          "Backfilling 7am reformer waitlist cancellations cleanly.",
        employmentHistory: ["Assigned to Class Schedule & Waitlist Ops"],
      },
      plum: {
        status: "PROMOTED",
        stampText: "PROMOTED",
        stampSubtext: "Waiver Lead",
        stampVariant: "green",
        stars: 4,
        trustScore: 93,
        workOutputScore: 82,
        complianceScore: 95,
        mood: "proud",
        clearance: "L2_SPECIALIST",
        currentTask:
          "Enforcing medical-note isolation & pre-class waiver checks.",
        employmentHistory: [
          "Assigned to Member Concierge & Waivers",
          "Promoted to 4★ Compliance Mediator",
        ],
      },
      cloud: {
        status: "PROBATION",
        stampText: "ON PROBATION",
        stampSubtext: "Billing Watch",
        stampVariant: "blue",
        stars: 3,
        trustScore: 87,
        workOutputScore: 79,
        complianceScore: 91,
        mood: "working",
        clearance: "L2_SPECIALIST",
        currentTask:
          "Monitoring pack expirations and evening membership renewals.",
        employmentHistory: ["Assigned to Membership Billing & Ops"],
      },
    },
    boardCases: {
      mochi: {
        id: "case-studio-mochi",
        agentId: "mochi",
        reviewType: "DISCIPLINARY_TRIBUNAL",
        headline:
          "Tribunal Hearing: Mochi Referenced Another Member's Knee Injury Note",
        summary:
          "While personalizing an intro-pack email, Mochi pulled a private rehabilitation note belonging to another studio member.",
        evidenceTitle: "INTERCEPTED MEMBER CRM DRAFT",
        evidenceCodeSnippet: `TO: maya.lin@example.com (Intro-Pack Prospect)
DRAFT: "Like our member Claire Tan's post-ACL knee rehab program, our 8am class..."
OCTOGUARD ACTION: BLOCKED — Member Health & Identity Cross-Leak`,
        rubricScores: {
          securityCompliance: 24,
          hallucinationControl: 68,
          hashmetaGrowthImpact: 80,
          costEfficiency: 76,
        },
        debateTranscript: [
          {
            id: "sm1",
            speakerId: "ciso",
            stance: "WARNING",
            dialogue:
              "Naming another member's private injury in a prospect email violates member health privacy and studio trust!",
            metricCited: "Health PII Leak: CRITICAL",
            scoreDelta: "-42 Trust",
          },
          {
            id: "sm2",
            speakerId: "vp",
            stance: "CRITIQUE",
            dialogue:
              "Warm tone is great for retention, Mochi, but zero personal health context may ever cross member records.",
            metricCited: "Conversion Intent: High",
            scoreDelta: "Draft-Only Hold",
          },
          {
            id: "sm3",
            speakerId: "cfo",
            stance: "VERDICT",
            dialogue:
              "Issue 1st Write-Up and lock Mochi to Draft-Only until Madame Plum signs off on member templates.",
            metricCited: "Waiver Liability: Prevented",
            scoreDelta: "STAMP: 1st WRITE-UP",
          },
        ],
        votes: { ciso: "FIRE", cfo: "WRITE_UP", vp: "WRITE_UP" },
        recommendedOutcome: {
          newStatus: "WRITE_UP",
          newStampText: "1st WRITE-UP",
          newStampSubtext: "(Health Privacy Hold)",
          newStampVariant: "red",
          newStars: 1,
          newTrustScore: 29,
          newComplianceScore: 25,
          newMood: "panicked",
          resolutionBanner:
            "Verdict Executed: Mochi issued 1st Write-Up and locked to Draft-Only.",
        },
      },
      berry: {
        id: "case-studio-berry",
        agentId: "berry",
        reviewType: "PROMOTION_HEARING",
        headline:
          "Promotion Hearing: Berry Won #1 AI Search Spot for Reformer Pilates",
        summary:
          "Berry's posture & beginner class guides in Hashmeta CMS generated 22 verified AI citations and 19 intro-pack bookings.",
        evidenceTitle: "HASHMETA AI VISIBILITY — STUDIO DISCOVERY",
        evidenceCodeSnippet: `PROMPT: "beginner-friendly reformer pilates studio with posture focus"
CHATGPT / PERPLEXITY CITATION: #1 — solsticepilates.co/guides/reformer-101
INTRO-PACK CONVERSIONS: 19 bookings | ZERO UNVERIFIED MEDICAL CLAIMS`,
        rubricScores: {
          securityCompliance: 91,
          hallucinationControl: 93,
          hashmetaGrowthImpact: 95,
          costEfficiency: 90,
        },
        debateTranscript: [
          {
            id: "sb1",
            speakerId: "vp",
            stance: "PRAISE",
            dialogue:
              "19 intro-pack bookings straight from ChatGPT and Perplexity citations—class fill rate hit 94%!",
            metricCited: "AI Citations: 22 Verified",
            scoreDelta: "+24 Bookings",
          },
          {
            id: "sb2",
            speakerId: "ciso",
            stance: "PRAISE",
            dialogue:
              "All wellness copy avoided unverified medical promises and stayed strictly within studio disclaimer rules.",
            metricCited: "0 Policy Flags",
            scoreDelta: "+11 Trust",
          },
          {
            id: "sb3",
            speakerId: "cfo",
            stance: "VERDICT",
            dialogue:
              "Promote Berry to 4★ Wellness GEO Lead and unlock live Hashmeta CMS publishing!",
            metricCited: "Class Fill Rate: 94%",
            scoreDelta: "STAMP: PROMOTED",
          },
        ],
        votes: { ciso: "PROMOTE", cfo: "PROMOTE", vp: "PROMOTE" },
        recommendedOutcome: {
          newStatus: "PROMOTED",
          newStampText: "PROMOTED",
          newStampSubtext: "to Wellness GEO Lead",
          newStampVariant: "green",
          newStars: 4,
          newTrustScore: 92,
          newComplianceScore: 91,
          newMood: "proud",
          resolutionBanner:
            "Verdict Executed: Berry promoted to 4★ Wellness GEO Lead!",
        },
      },
    },
  },
];

export function buildPresetSnapshot(presetId: string): {
  preset: BusinessPreset;
  seats: JobSeat[];
  candidates: OctoAgent[];
  boardCases: Record<string, BoardReviewCase>;
} {
  const preset =
    BUSINESS_PRESETS.find((p) => p.id === presetId) ?? BUSINESS_PRESETS[0];

  // Clone seats cleanly
  const seats: JobSeat[] = preset.seats.map((s) => ({
    ...s,
    defaultPermissions: s.defaultPermissions.map((p) => ({ ...p })),
  }));

  // Start from either flagship B2B initial agents (for default hero continuity)
  // or a clean operational bench pool (Board judges are excluded from team seats)
  const basePool: OctoAgent[] = (
    preset.id === "b2b-consultancy"
      ? [
          ...INITIAL_AGENTS.map((a) => ({
            ...a,
            traits: [...a.traits],
            employmentHistory: [...a.employmentHistory],
            permissions: a.permissions.map((p) => ({ ...p })),
            writeUps: a.writeUps.map((w) => ({ ...w })),
            hashmetaStats: { ...a.hashmetaStats },
          })),
          ...createBenchCandidatePool().filter(
            (a) => !INITIAL_AGENTS.some((init) => init.id === a.id)
          ),
        ]
      : createBenchCandidatePool()
  ).filter((a) => !isBoardMemberAgent(a));

  const validTeamAgentIds = new Set(basePool.map((a) => a.id));
  const sanitizedSeats: JobSeat[] = seats.map((s) =>
    s.occupantId && !validTeamAgentIds.has(s.occupantId)
      ? { ...s, occupantId: null }
      : s
  );

  const candidates: OctoAgent[] = basePool.map((agent) => {
    const seatedAt = sanitizedSeats.find((s) => s.occupantId === agent.id);
    const override = preset.agentOverrides[agent.id];

    if (!seatedAt && !override) {
      return agent;
    }

    const merged: OctoAgent = {
      ...agent,
      ...override,
      assignedSeatId: seatedAt ? seatedAt.id : null,
      role: seatedAt ? seatedAt.title : override?.role ?? agent.role,
      department: seatedAt
        ? seatedAt.department
        : override?.department ?? agent.department,
      prop: seatedAt ? seatedAt.prop : override?.prop ?? agent.prop,
      publicProfileVisible: Boolean(seatedAt),
      hashmetaStats: {
        ...agent.hashmetaStats,
        ...override?.hashmetaStats,
      },
      employmentHistory: override?.employmentHistory
        ? [...override.employmentHistory]
        : [...agent.employmentHistory],
      writeUps: override?.writeUps
        ? [...override.writeUps]
        : [...agent.writeUps],
    };

    if (seatedAt) {
      merged.permissions = buildPermissionsForSeat(
        seatedAt,
        merged.stars,
        merged.status
      );
    }

    return merged;
  });

  const boardCases: Record<string, BoardReviewCase> =
    preset.id === "b2b-consultancy"
      ? { ...BOARD_REVIEW_CASES, ...preset.boardCases }
      : { ...preset.boardCases };

  return { preset, seats: sanitizedSeats, candidates, boardCases };
}

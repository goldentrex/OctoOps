// ============================================================================
// OctoOps Core Types & Decoupled QwenWork / Hashmeta AI Adapter Contracts
// ============================================================================

export type AgentStatus =
  | "BENCH"
  | "PROBATION"
  | "PROMOTED"
  | "WRITE_UP"
  | "BOARD_REVIEW"
  | "FIRED";

export type ClearanceLevel = "L1_PROBATION" | "L2_SPECIALIST" | "L3_SENIOR_AUTONOMOUS" | "REVOKED";

export type OctoColor = "blue" | "purple" | "pink" | "green" | "amber" | "slate";

export type OctoAccessory =
  | "beret_glasses"      // 01 Inko: Sky-blue fluff, navy beret, silver glasses
  | "tophat_moustache"   // 02 Barnaby: Lavender fluff, top hat, handlebar moustache
  | "headset_tie"        // 03 Squidney: Pink fluff, cowlick, headset, striped tie
  | "boba_matcha"        // 04 Boba: Baby matcha-mint shaggy fluff, pom-pom, tortoiseshell glasses, yellow bow
  | "cfo_monocle"        // 05 Reginald CFO (Octo-Board): Peach sherpa fleece, green banker visor, polka-dot bowtie
  | "nori_beanie"        // 06 Nori: Periwinkle fluff, spiky hair, mustard beanie, square glasses
  | "mochi_headphones"   // 07 Mochi: Strawberry-cream cloud fluff, pink hair bow, headphones
  | "gumbo_fedora"       // 08 Gumbo: Coral-tangerine fluff, ginger eyebrows, beige fedora, blue tie
  | "ciso_detective"     // 09 Cassandra CISO (Octo-Board): Lilac-grey tweed fluff, Sherlock cap, brass monocle
  | "vp_shades"          // 10 Pulse VP (Octo-Board): Lemon-yellow fluff, backwards teal cap, star sunglasses
  | "truffle_prof"       // 11 Truffle: Cocoa-taupe fluff, white professor hair, gold glasses, scarf
  | "zest_mohawk"        // 12 Zest: Aqua-turquoise spiky fluff, mohawk tuft, headset, yellow tie
  | "founder_crown"      // 13 Pistachio: Pistachio-green curly fleece, white beret, brown moustache
  | "plum_pompadour"     // 14 Plum: Royal-plum violet fluff, silver-streaked pompadour, cat-eye glasses, pearls
  | "cinnamon_beanie"    // 15 Cinnamon: Cinnamon-terracotta fluff, cream fisherman beanie, glasses, teal bowtie
  | "cloud_nightcap"     // 16 Cloud: Snow-white cloud angora fluff, baby-blue pom-pom nightcap, rosy cheeks
  | "matcha_tartan"      // 17 Matcha: Forest-matcha green fluff, side-part hair tuft, gold glasses, tartan bowtie
  | "berry_retro"        // 18 Berry: Raspberry-magenta sherpa fluff, blonde curls, white cat-eye shades, yellow scarf
  | "cobalt_captain"     // 19 Cobalt: Royal-cobalt blue fluff, silver eyebrows & goatee, sea captain cap
  | "honey_geek";        // 20 Honey: Golden honey-amber fluff, curly pompadour, geek glasses, green striped tie

export type OctoMood = "happy" | "working" | "proud" | "panicked" | "skeptical" | "judging" | "fired" | "sleeping";

export type OctoProp = "dual_laptops" | "envelopes_docs" | "warning_phone" | "calculator" | "magnifying_glass" | "megaphone";

export interface WriteUpIncident {
  id: string;
  timestamp: string;
  title: string;
  severity: "LOW" | "HIGH" | "CRITICAL";
  ruleViolated: string;
  interceptedPayload: string;
  blockedBy: "OctoGuard DLP" | "Hallucination Shield" | "CRM RBAC Gatekeeper" | "Visibility Auditor";
  trustPenalty: number;
  /** Actual Beta penalty applied (for exact reversal on successful appeal). */
  betaDelta?: number;
}

export interface PermissionScope {
  id: string;
  label: string;
  system: "Hashmeta CRM" | "Hashmeta CMS" | "Hashmeta Visibility" | "QwenWork Core";
  mode: "DRAFT_ONLY" | "APPROVAL_REQUIRED" | "AUTONOMOUS_EXEC" | "LOCKED";
  requiredStars: number;
}

export interface HashmetaMetrics {
  cmsArticlesPublished: number;
  aiCitationsCount: number; // ChatGPT, Gemini, Perplexity citations
  googleTop3Keywords: number;
  crmLeadsCaptured: number;
  crmSafeDrafts: number;
  crmBlockedLeaks: number;
}

export type DepartmentName =
  | "Hashmeta CMS"
  | "QwenWork Ops"
  | "Hashmeta CRM"
  | "Finance & Billing"
  | "Customer Support"
  | "Compliance & Legal"
  | "Supply & Fulfillment"
  | "Product & QA";

export interface JobSeat {
  id: string;
  title: string;
  department: DepartmentName;
  prop: OctoProp;
  kpiSummary: string;
  defaultPermissions: PermissionScope[];
  occupantId: string | null;
}

export interface OctoAgent {
  id: string;
  name: string;
  role: string;
  department: DepartmentName;
  assignedSeatId: string | null;
  traits: string[];
  employmentHistory: string[];
  qwenModelId: string; // Ready for QwenWork binding during hackathon
  color: OctoColor;
  accessory: OctoAccessory;
  prop: OctoProp;
  mood: OctoMood;
  status: AgentStatus;
  stampText: string;
  stampSubtext?: string;
  stampVariant: "blue" | "green" | "red" | "amber";
  stars: number; // 1 to 5
  maxStars: number;
  trustScore: number; // 0 to 100
  workOutputScore: number; // Top bar (briefcase) 0 to 100
  complianceScore: number; // Bottom bar (envelope / warning) 0 to 100
  coffeeLevel: "steaming" | "spilling" | "empty";
  clearance: ClearanceLevel;
  bio: string;
  currentTask: string;
  permissions: PermissionScope[];
  writeUps: WriteUpIncident[];
  hashmetaStats: HashmetaMetrics;
  publicProfileVisible: boolean;
}

export interface BoardMember {
  id: string;
  name: string;
  title: string;
  sponsorTieIn: string;
  color: OctoColor;
  accessory: OctoAccessory;
  prop: OctoProp;
  focusMetric: string;
  catchphrase: string;
}

export interface BoardDebateTurn {
  id: string;
  speakerId: "cfo" | "ciso" | "vp";
  stance: "PRAISE" | "CRITIQUE" | "WARNING" | "VERDICT";
  dialogue: string;
  metricCited: string;
  scoreDelta: string;
}

export interface BoardReviewCase {
  id: string;
  agentId: string;
  reviewType: "PROMOTION_HEARING" | "DISCIPLINARY_TRIBUNAL" | "VISIBILITY_PIP";
  headline: string;
  summary: string;
  evidenceTitle: string;
  evidenceCodeSnippet: string;
  rubricScores: {
    securityCompliance: number;
    hallucinationControl: number;
    hashmetaGrowthImpact: number;
    costEfficiency: number;
  };
  debateTranscript: BoardDebateTurn[];
  votes: {
    cfo: "PROMOTE" | "PROBATION" | "WRITE_UP" | "FIRE";
    ciso: "PROMOTE" | "PROBATION" | "WRITE_UP" | "FIRE";
    vp: "PROMOTE" | "PROBATION" | "WRITE_UP" | "FIRE";
  };
  recommendedOutcome: {
    newStatus: AgentStatus;
    newStampText: string;
    newStampSubtext?: string;
    newStampVariant: "blue" | "green" | "red" | "amber";
    newStars: number;
    newTrustScore: number;
    newComplianceScore: number;
    newMood: OctoMood;
    resolutionBanner: string;
  };
}

export interface DepartmentTemplate {
  id: string;
  department: DepartmentName;
  defaultTitle: string;
  prop: OctoProp;
  defaultKpiSummary: string;
  description: string;
  defaultPermissions: PermissionScope[];
}

export interface PresetDemoConfig {
  leakTargetSeatId: string;
  leakButtonLabel: string;
  leakStampSubtext: string;
  leakTask: string;
  leakWriteUpTitle: string;
  leakWriteUpRule: string;
  leakWriteUpPayload: string;
  leakToast: string;
  promotionTargetSeatId: string;
  promotionButtonLabel: string;
  promotionSubtext: string;
  promotionTask: string;
  promotionToast: string;
}

export interface BusinessPreset {
  id: string;
  name: string;
  categoryLabel: string;
  tagline: string;
  description: string;
  portalEndpointSlug: string;
  clientPortalAccounts: string[];
  demoConfig: PresetDemoConfig;
  seats: JobSeat[];
  agentOverrides: Record<string, Partial<OctoAgent>>;
  boardCases: Record<string, BoardReviewCase>;
}

export interface GovernanceAuditEvent {
  id: string;
  timestamp: string;
  agentId: string;
  agentName: string;
  department: DepartmentName;
  system: "Hashmeta CRM" | "Hashmeta CMS" | "Hashmeta Visibility" | "QwenWork Core" | "Octo-Board";
  outcome: "ALLOWED" | "BLOCKED" | "PROMOTED" | "WRITE_UP" | "HIRED" | "FIRED" | "RBAC_OVERRIDE";
  title: string;
  detail: string;
  blockedBy?: string;
  trustDelta?: number;
}

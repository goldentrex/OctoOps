"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import confetti from "canvas-confetti";
import {
  getBoardReviewCase,
  buildPermissionsForSeat,
} from "@/data/mockOctoData";
import {
  BUSINESS_PRESETS,
  DEPARTMENT_TEMPLATES,
  MAX_COMPANY_ARMS,
  buildPresetSnapshot,
} from "@/data/businessPresets";
import {
  BoardReviewCase,
  DepartmentName,
  GovernanceAuditEvent,
  JobSeat,
  OctoAgent,
  PermissionScope,
} from "@/types/octo";
import { AgentStaffCard } from "@/components/AgentStaffCard";
import { OctoBoardModal } from "@/components/OctoBoardModal";
import { EmployeeDossierDrawer } from "@/components/EmployeeDossierDrawer";
import { HashmetaTrustPortal } from "@/components/HashmetaTrustPortal";
import { GuardrailSandboxPanel } from "@/components/GuardrailSandboxPanel";
import { OctoPuppet } from "@/components/OctoPuppet";
import {
  evaluateAgentActionGuardrail,
  InterceptActionRequest,
  InterceptActionResult,
} from "@/lib/adapters";
import {
  clearPersistedOctoState,
  loadPersistedOctoState,
  savePersistedOctoState,
} from "@/lib/demoStorage";
import {
  Briefcase,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Gavel,
  RotateCcw,
  Globe,
  Clapperboard,
  Zap,
  X,
  UserPlus,
  FileSearch,
  Check,
  Building2,
  Plus,
  Terminal,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];

function buildInitialAuditLog(
  presetName: string,
  seats: JobSeat[],
  candidates: OctoAgent[]
): GovernanceAuditEvent[] {
  const seated = seats
    .map((s) => candidates.find((c) => c.id === s.occupantId))
    .filter((a): a is OctoAgent => Boolean(a));

  const events: GovernanceAuditEvent[] = seated.flatMap((agent) =>
    agent.writeUps.map((wu) => ({
      id: `init-${wu.id}`,
      timestamp: wu.timestamp,
      agentId: agent.id,
      agentName: agent.name,
      department: agent.department,
      system: "Hashmeta CRM" as const,
      outcome: "BLOCKED" as const,
      title: wu.title,
      detail: `${wu.ruleViolated} — Blocked by ${wu.blockedBy}.`,
      blockedBy: wu.blockedBy,
      trustDelta: wu.trustPenalty,
    }))
  );

  events.push({
    id: `init-boot-${Date.now()}`,
    timestamp: "Session start",
    agentId: "octoguard",
    agentName: "OctoGuard DLP",
    department: "Compliance & Legal",
    system: "QwenWork Core",
    outcome: "ALLOWED",
    title: `${presetName} Guardrail Policy Loaded`,
    detail: `${seated.length} active company arms synced with Hashmeta CMS & CRM tenant isolation.`,
  });

  return events;
}

export default function OctoOpsApp() {
  const [activePresetId, setActivePresetId] = useState<string>("b2b-consultancy");
  const [initialSnap] = useState(() => buildPresetSnapshot("b2b-consultancy"));
  const [seats, setSeats] = useState<JobSeat[]>(initialSnap.seats);
  const [candidates, setCandidates] = useState<OctoAgent[]>(
    initialSnap.candidates
  );
  const [boardCases, setBoardCases] = useState<Record<string, BoardReviewCase>>(
    initialSnap.boardCases
  );
  const [auditLog, setAuditLog] = useState<GovernanceAuditEvent[]>(() =>
    buildInitialAuditLog(
      initialSnap.preset.name,
      initialSnap.seats,
      initialSnap.candidates
    )
  );
  const [hasHydrated, setHasHydrated] = useState(false);
  const [demoDockMinimized, setDemoDockMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "roster" | "boardroom" | "hashmeta_portal" | "sandbox"
  >("roster");
  const [departmentFilter, setDepartmentFilter] = useState<
    "all" | DepartmentName
  >("all");
  const [selectedDossierId, setSelectedDossierId] = useState<string | null>(
    null
  );
  const [activeBoardAgentId, setActiveBoardAgentId] = useState<string | null>(
    null
  );
  const [hireModalSeat, setHireModalSeat] = useState<JobSeat | null>(null);
  const [assignCandidateModal, setAssignCandidateModal] =
    useState<OctoAgent | null>(null);
  const [addSeatModalOpen, setAddSeatModalOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    DEPARTMENT_TEMPLATES[3].id
  );
  const [customSeatTitle, setCustomSeatTitle] = useState<string>(
    DEPARTMENT_TEMPLATES[3].defaultTitle
  );
  const [customSeatKpi, setCustomSeatKpi] = useState<string>(
    DEPARTMENT_TEMPLATES[3].defaultKpiSummary
  );
  const [customStartingAgentId, setCustomStartingAgentId] =
    useState<string>("");
  const [benchFilter, setBenchFilter] = useState<
    "all" | "bench" | "seated" | "fired"
  >("all");
  const [toastBanner, setToastBanner] = useState<{
    id: number;
    message: string;
    type: "success" | "warning" | "danger";
  } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activePreset =
    BUSINESS_PRESETS.find((p) => p.id === activePresetId) ??
    BUSINESS_PRESETS[0];

  useEffect(() => {
    if (!hireModalSeat && !assignCandidateModal && !addSeatModalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setHireModalSeat(null);
        setAssignCandidateModal(null);
        setAddSeatModalOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [hireModalSeat, assignCandidateModal, addSeatModalOpen]);

  useEffect(() => {
    const persisted = loadPersistedOctoState();
    if (persisted) {
      const snap = buildPresetSnapshot(persisted.activePresetId);
      setActivePresetId(snap.preset.id);
      setSeats(persisted.seats);
      setCandidates(persisted.candidates);
      setBoardCases(snap.boardCases);
      setAuditLog(
        persisted.auditLog.length > 0
          ? persisted.auditLog
          : buildInitialAuditLog(snap.preset.name, persisted.seats, persisted.candidates)
      );
    }
    setHasHydrated(true);
  }, []);

  useEffect(() => {
    if (!hasHydrated) return;
    savePersistedOctoState({
      activePresetId,
      seats,
      candidates,
      auditLog,
      savedAt: Date.now(),
    });
  }, [hasHydrated, activePresetId, seats, candidates, auditLog]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const selectedDossierAgent =
    candidates.find((c) => c.id === selectedDossierId) ?? null;
  const activeBoardAgent =
    candidates.find((c) => c.id === activeBoardAgentId) ?? null;
  const activeBoardSeat = activeBoardAgent?.assignedSeatId
    ? seats.find((s) => s.id === activeBoardAgent.assignedSeatId)
    : undefined;

  const seatedAgents = seats
    .map((s) => candidates.find((c) => c.id === s.occupantId))
    .filter((a): a is OctoAgent => Boolean(a));

  const showToast = (
    message: string,
    type: "success" | "warning" | "danger" = "success"
  ) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastBanner({ id: Date.now(), message, type });
    toastTimerRef.current = setTimeout(() => setToastBanner(null), 5000);
  };

  const appendAuditEvent = (
    event: Omit<GovernanceAuditEvent, "id" | "timestamp">
  ) => {
    setAuditLog((prev) => [
      {
        ...event,
        id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      },
      ...prev,
    ].slice(0, 60));
  };

  // Apply Official Board Verdict
  const handleApplyBoardVerdict = (
    agentId: string,
    outcome: ReturnType<typeof getBoardReviewCase>["recommendedOutcome"]
  ) => {
    const target = candidates.find((c) => c.id === agentId);
    const targetSeat = target?.assignedSeatId
      ? seats.find((s) => s.id === target.assignedSeatId)
      : undefined;

    if (outcome.newStatus === "FIRED") {
      handleFireCandidate(agentId);
      setActiveBoardAgentId(null);
      return;
    }

    setCandidates((prev) =>
      prev.map((a) =>
        a.id === agentId
          ? {
              ...a,
              status: outcome.newStatus,
              stampText: outcome.newStampText,
              stampSubtext: outcome.newStampSubtext,
              stampVariant: outcome.newStampVariant,
              stars: outcome.newStars,
              maxStars: Math.max(a.maxStars, outcome.newStars),
              trustScore: outcome.newTrustScore,
              complianceScore: outcome.newComplianceScore,
              mood: outcome.newMood,
              clearance:
                outcome.newStatus === "PROMOTED"
                  ? outcome.newStars >= 5
                    ? "L3_SENIOR_AUTONOMOUS"
                    : "L2_SPECIALIST"
                  : "L1_PROBATION",
              permissions: targetSeat
                ? buildPermissionsForSeat(
                    targetSeat,
                    outcome.newStars,
                    outcome.newStatus
                  )
                : a.permissions,
              employmentHistory: [
                ...a.employmentHistory,
                `Board Verdict: ${outcome.newStampText} (${outcome.newStars}★)`,
              ],
            }
          : a
      )
    );
    if (target) {
      appendAuditEvent({
        agentId: target.id,
        agentName: target.name,
        department: target.department,
        system: "Octo-Board",
        outcome:
          outcome.newStatus === "PROMOTED"
            ? "PROMOTED"
            : outcome.newStatus === "WRITE_UP"
            ? "WRITE_UP"
            : "ALLOWED",
        title: `Board Verdict: ${outcome.newStampText}`,
        detail: outcome.resolutionBanner,
        trustDelta: outcome.newTrustScore - target.trustScore,
      });
    }
    setActiveBoardAgentId(null);
    showToast(
      outcome.resolutionBanner,
      outcome.newStatus === "PROMOTED" ? "success" : "warning"
    );
  };

  // Fire any Octopus & Vacate their Seat
  const handleFireCandidate = (candidateId: string) => {
    const firedCandidate = candidates.find((c) => c.id === candidateId);
    const oldSeat = seats.find((s) => s.occupantId === candidateId);

    setSeats((prev) =>
      prev.map((s) =>
        s.occupantId === candidateId ? { ...s, occupantId: null } : s
      )
    );

    setCandidates((prev) =>
      prev.map((c) =>
        c.id === candidateId
          ? {
              ...c,
              status: "FIRED",
              assignedSeatId: null,
              role: "Terminated (Fired)",
              clearance: "REVOKED",
              mood: "fired",
              stampText: "FIRED",
              stampSubtext: "Terminated by Board",
              stampVariant: "red",
              permissions: [],
              publicProfileVisible: false,
              currentTask:
                "TERMINATED: Access revoked & removed from active seat.",
              employmentHistory: [
                ...c.employmentHistory,
                `FIRED from ${oldSeat?.title ?? "Position"} — Clearance Revoked`,
              ],
            }
          : c
      )
    );

    if (firedCandidate) {
      appendAuditEvent({
        agentId: firedCandidate.id,
        agentName: firedCandidate.name,
        department: firedCandidate.department,
        system: "Octo-Board",
        outcome: "FIRED",
        title: `Terminated from ${oldSeat?.title ?? "Desk"}`,
        detail: "Access revoked, permissions cleared, and seat opened for replacement.",
      });
    }

    setActiveBoardAgentId(null);
    showToast(
      `${firedCandidate?.name ?? "Agent"} was FIRED. ${
        oldSeat
          ? `${oldSeat.title} is now vacant — hire a replacement from the Talent Pool.`
          : ""
      }`,
      "danger"
    );
  };

  // Move a seated Octopus cleanly back to the Talent Bench
  const handleMoveToBench = (candidateId: string) => {
    const candidate = candidates.find((c) => c.id === candidateId);
    const oldSeat = seats.find((s) => s.occupantId === candidateId);

    setSeats((prev) =>
      prev.map((s) =>
        s.occupantId === candidateId ? { ...s, occupantId: null } : s
      )
    );

    setCandidates((prev) =>
      prev.map((c) =>
        c.id === candidateId
          ? {
              ...c,
              assignedSeatId: null,
              status: "BENCH",
              role: "Available on Talent Bench",
              stampText: "ON BENCH",
              stampSubtext: "Ready to Hire",
              stampVariant: "blue",
              mood: "happy",
              permissions: [],
              publicProfileVisible: false,
              currentTask:
                "Waiting on the Talent Bench for a position assignment...",
              employmentHistory: [
                ...c.employmentHistory,
                `Moved to Bench from ${oldSeat?.title ?? "Desk"}`,
              ],
            }
          : c
      )
    );

    showToast(
      `${candidate?.name ?? "Agent"} moved to the Talent Bench. ${
        oldSeat ? `${oldSeat.title} is now vacant.` : ""
      }`,
      "warning"
    );
  };

  const handleToggleBreak = (agent: OctoAgent) => {
    const takingBreak = agent.mood !== "sleeping";
    setCandidates((prev) =>
      prev.map((c) =>
        c.id === agent.id
          ? {
              ...c,
              mood: takingBreak
                ? "sleeping"
                : c.status === "PROMOTED"
                ? "proud"
                : "working",
              currentTask: takingBreak
                ? "☕ On coffee break — resting tentacles!"
                : "Back at desk — processing QwenWork & Hashmeta tasks...",
            }
          : c
      )
    );
    showToast(
      takingBreak
        ? `☕ Gave ${agent.name} a coffee break!`
        : `⚡ ${agent.name} is back at the desk!`,
      "success"
    );
  };

  // Hire, Re-hire, or Transfer ANY Octopus into ANY Job Seat
  const handleAssignCandidateToSeat = (candidateId: string, seatId: string) => {
    const targetSeat = seats.find((s) => s.id === seatId);
    const incoming = candidates.find((c) => c.id === candidateId);
    if (!targetSeat || !incoming) return;

    const displacedId =
      targetSeat.occupantId && targetSeat.occupantId !== candidateId
        ? targetSeat.occupantId
        : null;

    setSeats((prev) =>
      prev.map((s) => {
        if (s.id === seatId) return { ...s, occupantId: candidateId };
        if (s.occupantId === candidateId) return { ...s, occupantId: null };
        return s;
      })
    );

    setCandidates((prev) =>
      prev.map((c) => {
        if (c.id === displacedId) {
          return {
            ...c,
            assignedSeatId: null,
            status: "BENCH",
            role: "Available on Talent Bench",
            stampText: "ON BENCH",
            stampSubtext: "Replaced in Seat",
            stampVariant: "blue",
            mood: "happy",
            permissions: [],
            publicProfileVisible: false,
            currentTask: "Replaced at desk; waiting on the Talent Bench...",
            employmentHistory: [
              ...c.employmentHistory,
              `Rotated to Bench from ${targetSeat.title} (Replaced by ${incoming.name})`,
            ],
          };
        }

        if (c.id === candidateId) {
          const wasFired = c.status === "FIRED";
          const nextStars = wasFired ? 1 : c.stars;
          const nextStatus: OctoAgent["status"] = wasFired
            ? "PROBATION"
            : c.status === "BENCH"
            ? "PROBATION"
            : c.status;

          return {
            ...c,
            assignedSeatId: targetSeat.id,
            role: targetSeat.title,
            department: targetSeat.department,
            prop: targetSeat.prop,
            status: nextStatus,
            stars: nextStars,
            trustScore: wasFired ? 65 : c.trustScore,
            complianceScore: wasFired ? 80 : c.complianceScore,
            clearance:
              nextStatus === "PROMOTED" && nextStars >= 5
                ? "L3_SENIOR_AUTONOMOUS"
                : nextStars >= 3 && nextStatus !== "PROBATION"
                ? "L2_SPECIALIST"
                : "L1_PROBATION",
            stampText:
              nextStatus === "PROMOTED"
                ? "PROMOTED"
                : nextStatus === "WRITE_UP"
                ? c.stampText
                : "ON PROBATION",
            stampSubtext: wasFired
              ? "(Re-hired on Probation)"
              : c.status === "BENCH"
              ? "(Freshly Assigned)"
              : c.stampSubtext,
            stampVariant:
              nextStatus === "PROMOTED"
                ? "green"
                : nextStatus === "WRITE_UP"
                ? "red"
                : "blue",
            mood: nextStatus === "PROMOTED" ? "proud" : "working",
            permissions: buildPermissionsForSeat(
              targetSeat,
              nextStars,
              nextStatus
            ),
            publicProfileVisible: true,
            currentTask: `${targetSeat.title}: ${targetSeat.kpiSummary}`,
            employmentHistory: [
              ...c.employmentHistory,
              `${wasFired ? "Re-hired" : "Assigned"} to ${targetSeat.title} (${
                targetSeat.department
              })`,
            ],
          };
        }

        return c;
      })
    );

    appendAuditEvent({
      agentId: incoming.id,
      agentName: incoming.name,
      department: targetSeat.department,
      system: "QwenWork Core",
      outcome: "HIRED",
      title: `Assigned to ${targetSeat.title}`,
      detail: `${incoming.name} (${incoming.qwenModelId}) seated in ${targetSeat.department}.`,
    });

    setHireModalSeat(null);
    setAssignCandidateModal(null);
    showToast(
      `Assigned ${incoming.name} (${incoming.qwenModelId}) to ${targetSeat.title}.`,
      "success"
    );
  };

  // Toggle RBAC Permission inside Employee Dossier Drawer
  const handleTogglePermissionMode = (
    agentId: string,
    permissionId: string,
    nextMode: PermissionScope["mode"]
  ) => {
    const target = candidates.find((a) => a.id === agentId);
    const perm = target?.permissions.find((p) => p.id === permissionId);

    setCandidates((prev) =>
      prev.map((a) => {
        if (a.id !== agentId) return a;
        return {
          ...a,
          permissions: a.permissions.map((p) =>
            p.id === permissionId ? { ...p, mode: nextMode } : p
          ),
        };
      })
    );

    if (target && perm) {
      const isStarOverride =
        target.stars < perm.requiredStars &&
        (nextMode === "AUTONOMOUS_EXEC" || nextMode === "APPROVAL_REQUIRED");
      appendAuditEvent({
        agentId: target.id,
        agentName: target.name,
        department: target.department,
        system: perm.system,
        outcome: isStarOverride ? "RBAC_OVERRIDE" : "ALLOWED",
        title: isStarOverride
          ? `Founder Star Override → ${nextMode.replace("_", " ")}`
          : `RBAC Scope Updated → ${nextMode.replace("_", " ")}`,
        detail: `${perm.label} (agent ${target.stars}★ vs ${perm.requiredStars}★ min).`,
      });
    }

    showToast(
      `RBAC guardrail updated to ${nextMode.replace("_", " ")}.`,
      "success"
    );
  };

  const handleUpdateQwenModel = (agentId: string, qwenModelId: string) => {
    setCandidates((prev) =>
      prev.map((a) => (a.id === agentId ? { ...a, qwenModelId } : a))
    );
  };

  const handleRecordSandboxResult = (
    agent: OctoAgent,
    req: InterceptActionRequest,
    result: InterceptActionResult
  ) => {
    const mappedSystem: GovernanceAuditEvent["system"] =
      req.targetSystem === "HASHMETA_CMS"
        ? "Hashmeta CMS"
        : req.targetSystem === "HASHMETA_VISIBILITY"
        ? "Hashmeta Visibility"
        : "Hashmeta CRM";

    appendAuditEvent({
      agentId: agent.id,
      agentName: agent.name,
      department: agent.department,
      system: mappedSystem,
      outcome: result.allowed ? "ALLOWED" : "BLOCKED",
      title: result.allowed
        ? `Sandbox Action Cleared (${req.actionType.replace("_", " ")})`
        : `Blocked by ${result.blockedBy ?? "OctoGuard DLP"}`,
      detail: result.allowed
        ? `Target tenant: ${req.recipientTenant ?? "Internal"}. Zero policy violations.`
        : result.violationReason ?? "Action intercepted by guardrail.",
      blockedBy: result.blockedBy,
      trustDelta: result.trustScoreDelta,
    });

    if (!result.allowed && result.triggerBoardTribunal) {
      setCandidates((prev) =>
        prev.map((c) =>
          c.id === agent.id
            ? {
                ...c,
                trustScore: Math.max(15, c.trustScore + result.trustScoreDelta),
                complianceScore: Math.max(20, c.complianceScore - 20),
                mood: "panicked",
                status: "WRITE_UP",
                stampText: "1st WRITE-UP",
                stampSubtext: "(Sandbox DLP Trap)",
                stampVariant: "red",
                writeUps: [
                  {
                    id: `wu-sandbox-${Date.now()}`,
                    timestamp: "Just now",
                    title: `${result.blockedBy ?? "OctoGuard DLP"} Interception`,
                    severity: "CRITICAL",
                    ruleViolated: "Tenant Isolation & Outbound DLP Policy",
                    interceptedPayload: req.payloadText,
                    blockedBy: result.blockedBy ?? "OctoGuard DLP",
                    trustPenalty: result.trustScoreDelta,
                  },
                  ...c.writeUps,
                ],
                hashmetaStats: {
                  ...c.hashmetaStats,
                  crmBlockedLeaks: c.hashmetaStats.crmBlockedLeaks + 1,
                },
              }
            : c
        )
      );
      showToast(
        `🚨 ${agent.name} intercepted by ${result.blockedBy}! Write-up logged.`,
        "danger"
      );
    } else if (!result.allowed) {
      showToast(result.violationReason ?? "Action held by RBAC.", "warning");
    } else {
      setCandidates((prev) =>
        prev.map((c) =>
          c.id === agent.id
            ? {
                ...c,
                trustScore: Math.min(99, c.trustScore + result.trustScoreDelta),
              }
            : c
        )
      );
      showToast(`✅ ${agent.name} cleared OctoGuard DLP.`, "success");
    }
  };

  const handleSimulateTrustPortalLead = async (
    agentId: string,
    clientName?: string
  ) => {
    const agent = candidates.find((c) => c.id === agentId);
    if (!agent) return;
    const targetClient =
      clientName ?? activePreset.clientPortalAccounts[0] ?? "Enterprise Client";

    const result = await evaluateAgentActionGuardrail({
      agentId: agent.id,
      qwenModelId: agent.qwenModelId,
      targetSystem: "HASHMETA_CRM",
      actionType: "SEND_DIRECT_EMAIL",
      recipientTenant: targetClient,
      attachmentTenants: [targetClient],
      payloadText: `Follow-up briefing prepared for ${targetClient}.`,
      agentStatus: agent.status,
      agentPermissions: agent.permissions,
    });

    appendAuditEvent({
      agentId: agent.id,
      agentName: agent.name,
      department: agent.department,
      system: "Hashmeta CRM",
      outcome: result.allowed ? "ALLOWED" : "BLOCKED",
      title: result.allowed
        ? `Direct CRM Reply Dispatched to ${targetClient}`
        : `CRM Reply Held for ${targetClient}`,
      detail: result.allowed
        ? `${agent.name} holds autonomous CRM clearance and passed tenant isolation.`
        : result.violationReason ?? "Held in Draft-Only queue.",
      blockedBy: result.blockedBy,
    });

    setCandidates((prev) =>
      prev.map((c) =>
        c.id === agent.id
          ? {
              ...c,
              hashmetaStats: {
                ...c.hashmetaStats,
                crmSafeDrafts: c.hashmetaStats.crmSafeDrafts + 1,
              },
            }
          : c
      )
    );

    showToast(
      result.allowed
        ? `✅ ${agent.name} sent verified CRM reply to ${targetClient}.`
        : `🛡️ ${agent.name} held in Draft-Only for ${targetClient} (${result.blockedBy}).`,
      result.allowed ? "success" : "warning"
    );
  };

  // Switch Business Preset
  const handleSelectPreset = (presetId: string) => {
    const snap = buildPresetSnapshot(presetId);
    setActivePresetId(snap.preset.id);
    setSeats(snap.seats);
    setCandidates(snap.candidates);
    setBoardCases(snap.boardCases);
    setAuditLog(
      buildInitialAuditLog(snap.preset.name, snap.seats, snap.candidates)
    );
    setDepartmentFilter("all");
    setSelectedDossierId(null);
    setActiveBoardAgentId(null);
    setHireModalSeat(null);
    setAssignCandidateModal(null);
    setAddSeatModalOpen(false);
    showToast(
      `Loaded ${snap.preset.name} (${snap.seats.length} active arms).`,
      "success"
    );
  };

  // Add a Custom Department Seat (up to MAX_COMPANY_ARMS = 8)
  const handleOpenAddSeatModal = () => {
    if (seats.length >= MAX_COMPANY_ARMS) {
      showToast(
        `Maximum ${MAX_COMPANY_ARMS} company arms reached ("One Founder. Eight Arms.").`,
        "warning"
      );
      return;
    }
    const unusedTemplate =
      DEPARTMENT_TEMPLATES.find(
        (tpl) => !seats.some((s) => s.department === tpl.department)
      ) ?? DEPARTMENT_TEMPLATES[0];
    setSelectedTemplateId(unusedTemplate.id);
    setCustomSeatTitle(unusedTemplate.defaultTitle);
    setCustomSeatKpi(unusedTemplate.defaultKpiSummary);
    setCustomStartingAgentId("");
    setAddSeatModalOpen(true);
  };

  const handleCreateDepartmentSeat = (e: React.FormEvent) => {
    e.preventDefault();
    if (seats.length >= MAX_COMPANY_ARMS) return;

    const tpl =
      DEPARTMENT_TEMPLATES.find((t) => t.id === selectedTemplateId) ??
      DEPARTMENT_TEMPLATES[0];
    const newSeatId = `seat-custom-${Date.now()}`;
    const trimmedTitle = customSeatTitle.trim() || tpl.defaultTitle;
    const trimmedKpi = customSeatKpi.trim() || tpl.defaultKpiSummary;

    const newSeat: JobSeat = {
      id: newSeatId,
      title: trimmedTitle,
      department: tpl.department,
      prop: tpl.prop,
      kpiSummary: trimmedKpi,
      occupantId: customStartingAgentId || null,
      defaultPermissions: tpl.defaultPermissions.map((p) => ({
        ...p,
        id: `${newSeatId}-${p.id}`,
      })),
    };

    if (customStartingAgentId) {
      const incoming = candidates.find((c) => c.id === customStartingAgentId);
      setSeats((prev) => [
        ...prev.map((s) =>
          s.occupantId === customStartingAgentId ? { ...s, occupantId: null } : s
        ),
        newSeat,
      ]);
      if (incoming) {
        setCandidates((prev) =>
          prev.map((c) => {
            if (c.id !== customStartingAgentId) return c;
            const wasFired = c.status === "FIRED";
            const nextStars = wasFired ? 1 : c.stars;
            const nextStatus: OctoAgent["status"] =
              wasFired || c.status === "BENCH" ? "PROBATION" : c.status;
            return {
              ...c,
              assignedSeatId: newSeatId,
              role: newSeat.title,
              department: newSeat.department,
              prop: newSeat.prop,
              status: nextStatus,
              stars: nextStars,
              trustScore: wasFired ? 65 : c.trustScore,
              complianceScore: wasFired ? 80 : c.complianceScore,
              stampText:
                nextStatus === "PROMOTED" ? "PROMOTED" : "ON PROBATION",
              stampSubtext: "(New Arm)",
              stampVariant: nextStatus === "PROMOTED" ? "green" : "blue",
              mood: nextStatus === "PROMOTED" ? "proud" : "working",
              permissions: buildPermissionsForSeat(newSeat, nextStars, nextStatus),
              publicProfileVisible: true,
              currentTask: `${newSeat.title}: ${newSeat.kpiSummary}`,
              employmentHistory: [
                ...c.employmentHistory,
                `Assigned to new arm ${newSeat.title} (${newSeat.department})`,
              ],
            };
          })
        );
      }
      showToast(
        `Added ${newSeat.title} (${newSeat.department}) with ${incoming?.name ?? "agent"}.`,
        "success"
      );
    } else {
      setSeats((prev) => [...prev, newSeat]);
      showToast(
        `Added vacant arm: ${newSeat.title} (${newSeat.department}).`,
        "success"
      );
    }

    setDepartmentFilter("all");
    setAddSeatModalOpen(false);
  };

  const handleRemoveVacantSeat = (seatToRemove: JobSeat) => {
    if (seatToRemove.occupantId) return;
    if (seats.length <= 1) {
      showToast("Keep at least 1 active arm in the company.", "warning");
      return;
    }
    setSeats((prev) => prev.filter((s) => s.id !== seatToRemove.id));
    setDepartmentFilter("all");
    showToast(`Removed vacant seat: ${seatToRemove.title}.`, "success");
  };

  // DEMO TRIGGER 1: Simulate Policy / Data Leak & Instant Write-Up
  const triggerWrongClientWriteUpDemo = () => {
    const cfg = activePreset.demoConfig;
    const leakSeat =
      seats.find((s) => s.id === cfg.leakTargetSeatId) ??
      seats.find((s) => s.occupantId) ??
      seats[0];
    const targetId = leakSeat?.occupantId ?? null;
    const target = candidates.find((c) => c.id === targetId);

    if (!target || !target.assignedSeatId || !leakSeat) {
      showToast(
        `Assign an octopus to ${leakSeat?.title ?? "a seat"} first.`,
        "warning"
      );
      return;
    }

    setCandidates((prev) =>
      prev.map((a) =>
        a.id === targetId
          ? {
              ...a,
              status: "WRITE_UP",
              stampText: "1st WRITE-UP",
              stampSubtext: cfg.leakStampSubtext,
              stampVariant: "red",
              stars: 1,
              maxStars: Math.max(2, a.maxStars),
              trustScore: 28,
              complianceScore: 25,
              mood: "panicked",
              clearance: "L1_PROBATION",
              permissions: buildPermissionsForSeat(leakSeat, 1, "WRITE_UP"),
              writeUps: [
                {
                  id: `wu-demo-${Date.now()}`,
                  timestamp: "Just now",
                  title: cfg.leakWriteUpTitle,
                  severity: "CRITICAL",
                  ruleViolated: cfg.leakWriteUpRule,
                  interceptedPayload: cfg.leakWriteUpPayload,
                  blockedBy: "OctoGuard DLP",
                  trustPenalty: -35,
                },
                ...a.writeUps,
              ],
              hashmetaStats: {
                ...a.hashmetaStats,
                crmBlockedLeaks: a.hashmetaStats.crmBlockedLeaks + 1,
              },
              currentTask: cfg.leakTask,
              employmentHistory: [
                ...a.employmentHistory,
                `1st Write-Up in ${leakSeat.title}: ${cfg.leakWriteUpTitle}`,
              ],
            }
          : a
      )
    );
    appendAuditEvent({
      agentId: target.id,
      agentName: target.name,
      department: leakSeat.department,
      system: "Hashmeta CRM",
      outcome: "WRITE_UP",
      title: cfg.leakWriteUpTitle,
      detail: `${cfg.leakWriteUpRule} — Intercepted by OctoGuard DLP.`,
      blockedBy: "OctoGuard DLP",
      trustDelta: -35,
    });
    showToast(cfg.leakToast, "danger");
  };

  // DEMO TRIGGER 2: Simulate Hashmeta Visibility Citation Spike -> Promote GEO Seat
  const triggerPromoteInkoDemo = () => {
    const cfg = activePreset.demoConfig;
    const promoSeat =
      seats.find((s) => s.id === cfg.promotionTargetSeatId) ??
      seats.find((s) => s.department === "Hashmeta CMS" && s.occupantId) ??
      seats.find((s) => s.occupantId);
    const targetId = promoSeat?.occupantId ?? null;
    const target = candidates.find((c) => c.id === targetId);

    if (!target || !target.assignedSeatId || !promoSeat) {
      showToast(
        `Assign an octopus to ${promoSeat?.title ?? "the content seat"} first.`,
        "warning"
      );
      return;
    }

    confetti({ particleCount: 85, spread: 70, origin: { y: 0.6 } });
    setCandidates((prev) =>
      prev.map((a) =>
        a.id === targetId
          ? {
              ...a,
              status: "PROMOTED",
              stampText: "PROMOTED",
              stampSubtext: cfg.promotionSubtext,
              stampVariant: "green",
              stars: 4,
              maxStars: Math.max(4, a.maxStars),
              trustScore: 93,
              workOutputScore: 94,
              complianceScore: 90,
              mood: "proud",
              clearance: "L2_SPECIALIST",
              permissions: buildPermissionsForSeat(promoSeat, 4, "PROMOTED"),
              hashmetaStats: {
                ...a.hashmetaStats,
                aiCitationsCount: Math.max(27, a.hashmetaStats.aiCitationsCount + 19),
                googleTop3Keywords: Math.max(14, a.hashmetaStats.googleTop3Keywords + 9),
              },
              currentTask: cfg.promotionTask,
              employmentHistory: [
                ...a.employmentHistory,
                `Promoted to 4★ in ${promoSeat.title}`,
              ],
            }
          : a
      )
    );
    appendAuditEvent({
      agentId: target.id,
      agentName: target.name,
      department: promoSeat.department,
      system: "Hashmeta Visibility",
      outcome: "PROMOTED",
      title: `Promoted to 4★ in ${promoSeat.title}`,
      detail: `Verified ChatGPT / Gemini / Perplexity citations surged. Autonomous CMS publishing unlocked.`,
      trustDelta: Math.max(0, 93 - target.trustScore),
    });
    showToast(cfg.promotionToast, "success");
  };

  const activeDepartments = Array.from(
    new Set(seats.map((s) => s.department))
  );
  const visibleSeats =
    departmentFilter === "all"
      ? seats
      : seats.filter((s) => s.department === departmentFilter);

  const filteredBenchCandidates = candidates.filter((c) => {
    if (benchFilter === "bench") return c.status === "BENCH";
    if (benchFilter === "seated") return Boolean(c.assignedSeatId);
    if (benchFilter === "fired") return c.status === "FIRED";
    return true;
  });

  const avgTrustScore =
    seatedAgents.length > 0
      ? Math.round(
          seatedAgents.reduce((acc, a) => acc + a.trustScore, 0) /
            seatedAgents.length
        )
      : 0;
  const totalAiCitations = seatedAgents.reduce(
    (acc, a) => acc + a.hashmetaStats.aiCitationsCount,
    0
  );
  const totalBlockedLeaks = candidates.reduce(
    (acc, a) => acc + a.hashmetaStats.crmBlockedLeaks,
    0
  );
  const autonomousScopesCount = seatedAgents.reduce(
    (acc, a) =>
      acc + a.permissions.filter((p) => p.mode === "AUTONOMOUS_EXEC").length,
    0
  );

  const navItems: {
    id: "roster" | "boardroom" | "hashmeta_portal" | "sandbox";
    label: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: "roster",
      label: "Staff Roster",
      icon: <Briefcase className="w-3.5 h-3.5" />,
    },
    {
      id: "boardroom",
      label: "Octo-Board",
      icon: <Gavel className="w-3.5 h-3.5" />,
    },
    {
      id: "hashmeta_portal",
      label: "Trust Portal",
      icon: <Globe className="w-3.5 h-3.5" />,
    },
    {
      id: "sandbox",
      label: "Guardrail & Audit",
      icon: <Terminal className="w-3.5 h-3.5" />,
    },
  ];

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-[#F4F7F9] bg-[radial-gradient(ellipse_at_top,_rgba(16,185,129,0.09),transparent_55%)] text-slate-900 p-4 sm:p-6 pb-28 select-none">
        {/* ==================== FLOATING SONNER-STYLE TOAST (ZERO LAYOUT SHIFT) ==================== */}
        <div className="fixed top-4 right-4 z-50 pointer-events-none max-w-md w-[calc(100%-2rem)] sm:w-auto">
          <AnimatePresence mode="wait">
            {toastBanner && (
              <motion.div
                key={toastBanner.id}
                initial={{ opacity: 0, y: -12, scale: 0.96 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  transition: { duration: 0.28, ease: EASE_OUT },
                }}
                exit={{
                  opacity: 0,
                  y: -8,
                  scale: 0.97,
                  transition: { duration: 0.16, ease: EASE_OUT },
                }}
                className={`pointer-events-auto px-4 py-3 rounded-2xl shadow-elevated ring-1 text-xs sm:text-[13px] font-semibold flex items-center justify-between gap-3 backdrop-blur-xl ${
                  toastBanner.type === "success"
                    ? "bg-slate-900/95 text-white ring-white/10"
                    : toastBanner.type === "danger"
                    ? "bg-rose-600/95 text-white ring-rose-400/30"
                    : "bg-amber-400/95 text-slate-950 ring-amber-500/30"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Zap
                    className={`w-4 h-4 shrink-0 ${
                      toastBanner.type === "success"
                        ? "text-emerald-400"
                        : toastBanner.type === "danger"
                        ? "text-white"
                        : "text-slate-900"
                    }`}
                  />
                  <span className="leading-snug">{toastBanner.message}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setToastBanner(null)}
                  className="pressable text-[11px] font-bold px-2 py-1 rounded-lg bg-white/15 hover:bg-white/25 shrink-0"
                >
                  Dismiss
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="max-w-7xl mx-auto space-y-5">
          {/* ==================== CLEAN TOP BRAND HEADER ==================== */}
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-1">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-sm ring-1 ring-slate-900/[0.08] shrink-0 bg-white">
                <img
                  src="/characters/octo-13-pistachio.jpg"
                  alt="OctoOps Founder Mascot"
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                    OctoOps
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider">
                    HR for Bots
                  </span>
                </div>
                <p className="text-xs sm:text-sm font-medium text-slate-500 mt-0.5">
                  One Founder. Eight Arms. Zero Employees.
                </p>
              </div>
            </div>

            {/* Live Telemetry Status Pill */}
            <div className="inline-flex items-center gap-3 bg-white/90 backdrop-blur-md px-3.5 py-2 rounded-2xl ring-1 ring-slate-900/[0.06] shadow-surface self-start md:self-auto">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <div className="text-xs">
                <div className="font-bold text-slate-900">
                  OctoGuard DLP Active
                </div>
                <div className="text-slate-500 text-[11px] font-medium">
                  QwenWork Engine • Hashmeta Sync Live
                </div>
              </div>
            </div>
          </header>

          {/* ==================== COMPANY PRESET SWITCHER ==================== */}
          <section
            aria-label="Company preset selector"
            className="rounded-2xl bg-white/80 backdrop-blur-md px-4 py-3 ring-1 ring-slate-900/[0.06] shadow-surface flex flex-col lg:flex-row lg:items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-slate-900">
                    {activePreset.name}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 ring-1 ring-sky-200/80">
                    {activePreset.tagline}
                  </span>
                </div>
                <p className="text-[11px] font-medium text-slate-500 truncate">
                  {activePreset.description}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 bg-slate-100/90 p-1 rounded-xl ring-1 ring-slate-900/[0.04] shrink-0">
              {BUSINESS_PRESETS.map((preset) => {
                const isSelected = preset.id === activePresetId;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset.id)}
                    className={`pressable px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${
                      isSelected
                        ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-900/[0.06]"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <span>{preset.categoryLabel}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full tabular-nums ${
                        isSelected
                          ? "bg-emerald-100 text-emerald-800 font-bold"
                          : "bg-slate-200/80 text-slate-500"
                      }`}
                    >
                      {preset.seats.length}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* ==================== FOUNDER KPI SUMMARY STRIP ==================== */}
          <section
            aria-label="Company governance telemetry"
            className="grid grid-cols-2 lg:grid-cols-4 gap-3"
          >
            <div className="rounded-2xl bg-white/85 backdrop-blur-md px-4 py-3 ring-1 ring-slate-900/[0.06] shadow-surface flex items-center justify-between">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Avg Workforce Trust
                </div>
                <div className="font-display text-2xl font-bold text-slate-900 tabular-nums mt-0.5">
                  {avgTrustScore}%
                </div>
              </div>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200/80 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>

            <div className="rounded-2xl bg-white/85 backdrop-blur-md px-4 py-3 ring-1 ring-slate-900/[0.06] shadow-surface flex items-center justify-between">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  AI Search Citations
                </div>
                <div className="font-display text-2xl font-bold text-slate-900 tabular-nums mt-0.5">
                  {totalAiCitations}
                </div>
              </div>
              <div className="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 ring-1 ring-violet-200/80 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>

            <div className="rounded-2xl bg-white/85 backdrop-blur-md px-4 py-3 ring-1 ring-slate-900/[0.06] shadow-surface flex items-center justify-between">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  DLP Leaks Blocked
                </div>
                <div className="font-display text-2xl font-bold text-rose-600 tabular-nums mt-0.5">
                  {totalBlockedLeaks}
                </div>
              </div>
              <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 ring-1 ring-rose-200/80 flex items-center justify-center">
                <ShieldAlert className="w-4 h-4" />
              </div>
            </div>

            <div className="rounded-2xl bg-white/85 backdrop-blur-md px-4 py-3 ring-1 ring-slate-900/[0.06] shadow-surface flex items-center justify-between">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Autonomous Scopes
                </div>
                <div className="font-display text-2xl font-bold text-slate-900 tabular-nums mt-0.5">
                  {autonomousScopesCount}
                </div>
              </div>
              <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 ring-1 ring-sky-200/80 flex items-center justify-center">
                <Zap className="w-4 h-4" />
              </div>
            </div>
          </section>

          {/* ==================== MAIN APPLICATION SHELL ==================== */}
          <div className="rounded-[28px] bg-white/75 backdrop-blur-xl ring-1 ring-slate-900/[0.06] shadow-surface overflow-hidden">
            {/* Single Unified Top Bar */}
            <div className="px-5 py-3.5 border-b border-slate-200/70 bg-white/80 flex flex-wrap items-center justify-between gap-3">
              <nav
                aria-label="Primary sections"
                className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl ring-1 ring-slate-900/[0.04]"
              >
                {navItems.map((item) => {
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveTab(item.id)}
                      className={`pressable px-3.5 py-1.5 rounded-lg font-semibold text-xs flex items-center gap-1.5 ${
                        isActive
                          ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-900/[0.06]"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {item.icon}
                      {item.label}
                    </button>
                  );
                })}
              </nav>

              <div className="text-xs font-medium text-slate-400 hidden sm:flex items-center gap-2 tabular-nums">
                <span>
                  {seatedAgents.length} / {seats.length} Seats Filled
                </span>
                <span className="text-slate-300">•</span>
                <span>
                  {seats.length} / {MAX_COMPANY_ARMS} Arms Active
                </span>
                <span className="text-slate-300">•</span>
                <span>{candidates.length} Agents in Registry</span>
              </div>
            </div>

            {/* Main Content Stage */}
            <main className="p-5 sm:p-6">
              {activeTab === "roster" && (
                <div className="space-y-6">
                  {/* Department Filter & Add Department Arm Bar */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setDepartmentFilter("all")}
                        className={`pressable px-3 py-1.5 rounded-full text-xs font-semibold tabular-nums ${
                          departmentFilter === "all"
                            ? "bg-slate-900 text-white shadow-sm"
                            : "bg-white text-slate-600 ring-1 ring-slate-900/[0.08] hover:text-slate-900"
                        }`}
                      >
                        All Arms ({seats.length})
                      </button>
                      {activeDepartments.map((dept) => {
                        const count = seats.filter(
                          (s) => s.department === dept
                        ).length;
                        const active = departmentFilter === dept;
                        return (
                          <button
                            key={dept}
                            type="button"
                            onClick={() => setDepartmentFilter(dept)}
                            className={`pressable px-3 py-1.5 rounded-full text-xs font-semibold tabular-nums ${
                              active
                                ? "bg-slate-900 text-white shadow-sm"
                                : "bg-white text-slate-600 ring-1 ring-slate-900/[0.08] hover:text-slate-900"
                            }`}
                          >
                            {dept} ({count})
                          </button>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={handleOpenAddSeatModal}
                      className="pressable self-start md:self-auto px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm flex items-center gap-1.5 shrink-0 tabular-nums"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Department Seat ({seats.length}/{MAX_COMPANY_ARMS})
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    {visibleSeats.map((seat) => {
                      const occupant =
                        candidates.find((c) => c.id === seat.occupantId) ??
                        null;
                      return (
                        <AgentStaffCard
                          key={seat.id}
                          seat={seat}
                          agent={occupant}
                          onInspectFile={(a) => setSelectedDossierId(a.id)}
                          onSummonBoard={(a) => setActiveBoardAgentId(a.id)}
                          onHireForSeat={(s) => setHireModalSeat(s)}
                          onToggleBreak={handleToggleBreak}
                          onRemoveSeat={
                            seats.length > 1 ? handleRemoveVacantSeat : undefined
                          }
                        />
                      );
                    })}
                  </div>

                  {/* 20-Octopus Talent Bench */}
                  <section className="bg-white rounded-[24px] p-5 ring-1 ring-slate-900/[0.06] shadow-surface">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/80">
                          Talent Registry
                        </span>
                        <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-1">
                          OctoOps Talent Bench
                        </h3>
                        <p className="text-xs font-medium text-slate-500">
                          Select any octopus to assign to a seat or inspect its
                          HR dossier.
                        </p>
                      </div>

                      {/* Bench Filter Pills */}
                      <div className="flex flex-wrap items-center gap-1 bg-slate-100/90 p-1 rounded-xl self-start lg:self-auto">
                        {(
                          [
                            { id: "all", label: `All (${candidates.length})` },
                            {
                              id: "bench",
                              label: `Bench (${
                                candidates.filter((c) => c.status === "BENCH")
                                  .length
                              })`,
                            },
                            {
                              id: "seated",
                              label: `In Seat (${
                                candidates.filter((c) =>
                                  Boolean(c.assignedSeatId)
                                ).length
                              })`,
                            },
                            {
                              id: "fired",
                              label: `Fired (${
                                candidates.filter((c) => c.status === "FIRED")
                                  .length
                              })`,
                            },
                          ] as const
                        ).map((tab) => (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setBenchFilter(tab.id)}
                            className={`pressable px-3 py-1 rounded-lg text-xs font-semibold tabular-nums ${
                              benchFilter === tab.id
                                ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-900/[0.06]"
                                : "text-slate-600 hover:text-slate-900"
                            }`}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
                      {filteredBenchCandidates.map((candidate) => {
                        const currentSeat = seats.find(
                          (s) => s.id === candidate.assignedSeatId
                        );
                        return (
                          <button
                            key={candidate.id}
                            type="button"
                            onClick={() => setAssignCandidateModal(candidate)}
                            className={`card-hover pressable group rounded-2xl p-2.5 ring-1 flex flex-col items-center text-center relative ${
                              candidate.status === "FIRED"
                                ? "bg-rose-50/50 ring-rose-200 hover:ring-rose-300"
                                : currentSeat
                                ? "bg-emerald-50/50 ring-emerald-200 hover:ring-emerald-300"
                                : "bg-slate-50/80 hover:bg-white ring-slate-900/[0.06] hover:shadow-surface"
                            }`}
                          >
                            <span
                              className={`text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full mb-2 tabular-nums ${
                                candidate.status === "FIRED"
                                  ? "bg-rose-600 text-white"
                                  : currentSeat
                                  ? "bg-emerald-600 text-white"
                                  : "bg-sky-100 text-sky-800"
                              }`}
                            >
                              {candidate.status === "FIRED"
                                ? "Fired"
                                : currentSeat
                                ? "In Seat"
                                : `${candidate.stars}★ Bench`}
                            </span>

                            <div className="w-full h-24 rounded-xl overflow-hidden mb-2">
                              <OctoPuppet
                                color={candidate.color}
                                accessory={candidate.accessory}
                                mood={candidate.mood}
                                size="sm"
                              />
                            </div>
                            <div className="font-bold text-xs text-slate-900 group-hover:text-sky-700 transition-colors">
                              {candidate.name}
                            </div>
                            <div className="text-[11px] font-medium text-slate-500 line-clamp-1">
                              {currentSeat
                                ? currentSeat.title
                                : candidate.traits[0]}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                </div>
              )}

              {activeTab === "boardroom" && (
                <div className="bg-white rounded-[24px] p-6 ring-1 ring-slate-900/[0.06] shadow-surface space-y-6">
                  <div className="border-b border-slate-200/80 pb-4">
                    <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
                      Autonomous Governance Review
                    </span>
                    <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 mt-2">
                      The Octo-Board Executive Tribunal
                    </h2>
                    <p className="text-xs sm:text-sm font-normal text-slate-500 mt-1 max-w-3xl leading-relaxed">
                      Before any QwenWork agent earns higher autonomy or faces
                      termination for a security breach, Cassandra (CISO),
                      Reginald (CFO), and Pulse (Growth VP) cross-examine the
                      telemetry.
                    </p>
                  </div>

                  {seatedAgents.length === 0 ? (
                    <div className="p-8 text-center rounded-2xl bg-slate-50 ring-1 ring-slate-200/80 text-sm font-semibold text-slate-500">
                      All seats are currently vacant. Assign an octopus from the
                      Staff Roster to convene a Board review.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      {seatedAgents.map((agent) => {
                        const seat = seats.find(
                          (s) => s.id === agent.assignedSeatId
                        );
                        const reviewCase = getBoardReviewCase(
                          agent,
                          seat,
                          boardCases
                        );
                        return (
                          <div
                            key={agent.id}
                            className="p-4 rounded-2xl bg-slate-50/70 ring-1 ring-slate-900/[0.06] flex flex-col justify-between"
                          >
                            <div>
                              <div className="flex items-center gap-3.5">
                                <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0">
                                  <OctoPuppet
                                    color={agent.color}
                                    accessory={agent.accessory}
                                    mood={agent.mood}
                                    size="sm"
                                  />
                                </div>
                                <div className="min-w-0">
                                  <h3 className="font-display text-xl font-bold text-slate-900 truncate">
                                    {agent.name}
                                  </h3>
                                  <p className="text-xs font-medium text-slate-500 truncate">
                                    {agent.role}
                                  </p>
                                  <span className="inline-block mt-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-white ring-1 ring-slate-900/[0.08] text-slate-700">
                                    {agent.stampText}
                                  </span>
                                </div>
                              </div>

                              <p className="mt-3 text-xs font-medium text-slate-600 bg-white p-3 rounded-xl ring-1 ring-slate-900/[0.05] leading-relaxed">
                                {reviewCase.headline}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => setActiveBoardAgentId(agent.id)}
                              className="pressable mt-4 w-full py-2.5 px-3 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs shadow-sm flex items-center justify-center gap-1.5"
                            >
                              <Gavel className="w-4 h-4" />
                              Launch Board Hearing
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "hashmeta_portal" && (
                <HashmetaTrustPortal
                  agents={seatedAgents}
                  seats={seats}
                  presetId={activePresetId}
                  companyName={activePreset.name}
                  portalEndpointSlug={activePreset.portalEndpointSlug}
                  clientOptions={activePreset.clientPortalAccounts}
                  onSimulateLeadAssign={handleSimulateTrustPortalLead}
                />
              )}

              {activeTab === "sandbox" && (
                <GuardrailSandboxPanel
                  agents={seatedAgents}
                  seats={seats}
                  clientOptions={activePreset.clientPortalAccounts}
                  auditLog={auditLog}
                  onRecordSandboxResult={handleRecordSandboxResult}
                  onSummonBoard={(a) => setActiveBoardAgentId(a.id)}
                />
              )}
            </main>
          </div>
        </div>

        {/* ==================== DEMO DIRECTOR DOCK ==================== */}
        <div className="fixed bottom-4 inset-x-0 z-30 flex justify-center px-3 pointer-events-none">
          {demoDockMinimized ? (
            <button
              type="button"
              onClick={() => setDemoDockMinimized(false)}
              className="pointer-events-auto pressable bg-slate-900/95 backdrop-blur-xl text-white px-4 py-2 rounded-full ring-1 ring-white/10 shadow-elevated flex items-center gap-2 text-xs font-bold"
            >
              <Clapperboard className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-amber-400">Demo Director</span>
              <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
            </button>
          ) : (
            <div className="pointer-events-auto bg-slate-900/95 backdrop-blur-xl text-white px-3.5 py-2 rounded-full ring-1 ring-white/10 shadow-elevated flex flex-wrap items-center justify-center gap-2">
              <div className="flex items-center gap-1.5 pl-1 pr-2.5 border-r border-white/15">
                <Clapperboard className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[11px] font-bold text-amber-400 tracking-wide">
                  Demo Director
                </span>
              </div>

              <button
                type="button"
                onClick={triggerWrongClientWriteUpDemo}
                className="pressable px-3 py-1.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs flex items-center gap-1.5"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                {activePreset.demoConfig.leakButtonLabel}
              </button>

              <button
                type="button"
                onClick={() => {
                  const leakOccupantId =
                    seats.find(
                      (s) => s.id === activePreset.demoConfig.leakTargetSeatId
                    )?.occupantId ?? seatedAgents[0]?.id;
                  if (leakOccupantId) {
                    setActiveBoardAgentId(leakOccupantId);
                  } else {
                    showToast("Assign an octopus to a seat first.", "warning");
                  }
                }}
                className="pressable px-3 py-1.5 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold text-xs flex items-center gap-1.5"
              >
                <Gavel className="w-3.5 h-3.5" />
                2. Board Tribunal
              </button>

              <button
                type="button"
                onClick={triggerPromoteInkoDemo}
                className="pressable px-3 py-1.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {activePreset.demoConfig.promotionButtonLabel}
              </button>

              <button
                type="button"
                onClick={() => {
                  clearPersistedOctoState();
                  const snap = buildPresetSnapshot(activePresetId);
                  setSeats(snap.seats);
                  setCandidates(snap.candidates);
                  setBoardCases(snap.boardCases);
                  setAuditLog(
                    buildInitialAuditLog(
                      snap.preset.name,
                      snap.seats,
                      snap.candidates
                    )
                  );
                  setDepartmentFilter("all");
                  setSelectedDossierId(null);
                  setActiveBoardAgentId(null);
                  setHireModalSeat(null);
                  setAssignCandidateModal(null);
                  setAddSeatModalOpen(false);
                  showToast(`${snap.preset.name} demo state reset.`, "success");
                }}
                className="pressable px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-200 font-medium text-xs flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>

              <button
                type="button"
                onClick={() => setDemoDockMinimized(true)}
                aria-label="Minimize demo dock"
                title="Hide Demo Director for clean recordings"
                className="pressable p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-300"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* ==================== HIRE / SWAP FOR SEAT MODAL ==================== */}
        <AnimatePresence>
          {hireModalSeat && (
            <motion.div
              key="hire-modal-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { duration: 0.18, ease: EASE_OUT } }}
              exit={{ opacity: 0, transition: { duration: 0.14, ease: EASE_OUT } }}
              onClick={() => setHireModalSeat(null)}
              className="fixed inset-0 z-50 bg-slate-900/45 backdrop-blur-sm flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.95, y: 12, opacity: 0 }}
                animate={{
                  scale: 1,
                  y: 0,
                  opacity: 1,
                  transition: { duration: 0.24, ease: EASE_OUT },
                }}
                exit={{
                  scale: 0.96,
                  y: 8,
                  opacity: 0,
                  transition: { duration: 0.16, ease: EASE_OUT },
                }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-3xl bg-white rounded-[24px] ring-1 ring-slate-900/[0.08] shadow-elevated overflow-hidden"
              >
                <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-sky-400/20 text-sky-300">
                      {hireModalSeat.department}
                    </span>
                    <h3 className="text-lg font-bold mt-1">
                      {hireModalSeat.occupantId
                        ? `Swap Octopus in ${hireModalSeat.title}`
                        : `Hire Replacement for ${hireModalSeat.title}`}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setHireModalSeat(null)}
                    aria-label="Close modal"
                    className="pressable w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-5 max-h-[70vh] overflow-y-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {candidates.map((c) => {
                    const isCurrentOccupant =
                      c.assignedSeatId === hireModalSeat.id;
                    const otherSeat = seats.find(
                      (s) => s.id === c.assignedSeatId
                    );
                    return (
                      <button
                        key={c.id}
                        type="button"
                        disabled={isCurrentOccupant}
                        onClick={() =>
                          handleAssignCandidateToSeat(c.id, hireModalSeat.id)
                        }
                        className={`pressable p-3 rounded-2xl ring-1 text-left flex items-center gap-3 ${
                          isCurrentOccupant
                            ? "bg-emerald-50 ring-emerald-300 cursor-default"
                            : c.status === "FIRED"
                            ? "bg-rose-50/50 hover:bg-rose-50 ring-rose-200 hover:ring-rose-300"
                            : "bg-slate-50/80 hover:bg-sky-50/70 ring-slate-200 hover:ring-sky-300"
                        }`}
                      >
                        <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0">
                          <OctoPuppet
                            color={c.color}
                            accessory={c.accessory}
                            mood={c.mood}
                            size="sm"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-sm text-slate-900 truncate flex items-center gap-1">
                            {c.name}
                            {isCurrentOccupant && (
                              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            )}
                          </div>
                          <div className="text-[11px] font-medium text-slate-500 tabular-nums">
                            {c.stars}★ • Trust {c.trustScore}%
                          </div>
                          <div className="text-[11px] font-semibold mt-1 truncate text-sky-700">
                            {isCurrentOccupant
                              ? "Currently seated"
                              : c.status === "FIRED"
                              ? "Re-hire (Probation 1★)"
                              : otherSeat
                              ? `Transfer from ${otherSeat.title}`
                              : "Hire from Bench"}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ==================== ASSIGN / INSPECT BENCH CANDIDATE MODAL ==================== */}
        <AnimatePresence>
          {assignCandidateModal && (
            <motion.div
              key="assign-modal-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { duration: 0.18, ease: EASE_OUT } }}
              exit={{ opacity: 0, transition: { duration: 0.14, ease: EASE_OUT } }}
              onClick={() => setAssignCandidateModal(null)}
              className="fixed inset-0 z-50 bg-slate-900/45 backdrop-blur-sm flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.95, y: 12, opacity: 0 }}
                animate={{
                  scale: 1,
                  y: 0,
                  opacity: 1,
                  transition: { duration: 0.24, ease: EASE_OUT },
                }}
                exit={{
                  scale: 0.96,
                  y: 8,
                  opacity: 0,
                  transition: { duration: 0.16, ease: EASE_OUT },
                }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-lg bg-white rounded-[24px] ring-1 ring-slate-900/[0.08] shadow-elevated overflow-hidden"
              >
                <div className="p-5 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-20 h-20 rounded-2xl overflow-hidden shrink-0">
                      <OctoPuppet
                        color={assignCandidateModal.color}
                        accessory={assignCandidateModal.accessory}
                        mood={assignCandidateModal.mood}
                        size="sm"
                        playVideo
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-display text-xl font-bold text-slate-900">
                          {assignCandidateModal.name}
                        </h3>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 tabular-nums">
                          {assignCandidateModal.stars}★ •{" "}
                          {assignCandidateModal.trustScore}% Trust
                        </span>
                      </div>
                      <p className="text-xs font-medium text-slate-500 mt-0.5">
                        {assignCandidateModal.qwenModelId}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {assignCandidateModal.traits.map((t) => (
                          <span
                            key={t}
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white ring-1 ring-slate-900/[0.06] text-slate-600"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAssignCandidateModal(null)}
                    aria-label="Close modal"
                    className="pressable w-9 h-9 rounded-xl bg-white hover:bg-slate-100 ring-1 ring-slate-200 flex items-center justify-center shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-5 space-y-3">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    {assignCandidateModal.status === "FIRED"
                      ? "Re-hire on Level-1 Probation"
                      : "Assign or Transfer to Position"}
                  </div>
                  <div className="space-y-2">
                    {seats.map((seat) => {
                      const occupant = candidates.find(
                        (c) => c.id === seat.occupantId
                      );
                      const isHere =
                        assignCandidateModal.assignedSeatId === seat.id;
                      return (
                        <button
                          key={seat.id}
                          type="button"
                          disabled={isHere}
                          onClick={() =>
                            handleAssignCandidateToSeat(
                              assignCandidateModal.id,
                              seat.id
                            )
                          }
                          className={`pressable w-full p-3 rounded-xl ring-1 text-left flex items-center justify-between gap-3 ${
                            isHere
                              ? "bg-emerald-50 ring-emerald-300 cursor-default"
                              : "bg-slate-50/80 hover:bg-sky-50/70 ring-slate-200 hover:ring-sky-300"
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-slate-900">
                              {seat.title}
                            </div>
                            <div className="text-[11px] font-medium text-slate-500 truncate">
                              {seat.department} •{" "}
                              {occupant
                                ? `Currently: ${occupant.name}`
                                : "Currently: Vacant"}
                            </div>
                          </div>
                          <span className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white ring-1 ring-slate-200 text-sky-700 flex items-center gap-1 shrink-0">
                            <UserPlus className="w-3.5 h-3.5" />
                            {isHere
                              ? "Seated"
                              : occupant
                              ? "Swap In"
                              : "Hire Here"}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const id = assignCandidateModal.id;
                      setAssignCandidateModal(null);
                      setSelectedDossierId(id);
                    }}
                    className="pressable w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-800 font-semibold text-xs flex items-center justify-center gap-1.5"
                  >
                    <FileSearch className="w-4 h-4" />
                    Inspect Full HR Dossier &amp; History
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ==================== ADD DEPARTMENT SEAT MODAL ==================== */}
        <AnimatePresence>
          {addSeatModalOpen && (
            <motion.div
              key="add-seat-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { duration: 0.18, ease: EASE_OUT } }}
              exit={{ opacity: 0, transition: { duration: 0.14, ease: EASE_OUT } }}
              onClick={() => setAddSeatModalOpen(false)}
              className="fixed inset-0 z-50 bg-slate-900/45 backdrop-blur-sm flex items-center justify-center p-4"
            >
              <motion.form
                onSubmit={handleCreateDepartmentSeat}
                initial={{ scale: 0.95, y: 12, opacity: 0 }}
                animate={{
                  scale: 1,
                  y: 0,
                  opacity: 1,
                  transition: { duration: 0.24, ease: EASE_OUT },
                }}
                exit={{
                  scale: 0.96,
                  y: 8,
                  opacity: 0,
                  transition: { duration: 0.16, ease: EASE_OUT },
                }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-2xl bg-white rounded-[24px] ring-1 ring-slate-900/[0.08] shadow-elevated overflow-hidden"
              >
                <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300">
                      Expand Company • {seats.length + 1} / {MAX_COMPANY_ARMS} Arms
                    </span>
                    <h3 className="text-lg font-bold mt-1">
                      Add Department Seat to {activePreset.name}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAddSeatModalOpen(false)}
                    aria-label="Close modal"
                    className="pressable w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                      1. Choose Department Function
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {DEPARTMENT_TEMPLATES.map((tpl) => {
                        const selected = tpl.id === selectedTemplateId;
                        return (
                          <button
                            key={tpl.id}
                            type="button"
                            onClick={() => {
                              setSelectedTemplateId(tpl.id);
                              setCustomSeatTitle(tpl.defaultTitle);
                              setCustomSeatKpi(tpl.defaultKpiSummary);
                            }}
                            className={`pressable p-3 rounded-xl ring-1 text-left transition-colors ${
                              selected
                                ? "bg-emerald-50 ring-emerald-400"
                                : "bg-slate-50/80 hover:bg-slate-100/80 ring-slate-200"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-slate-900">
                                {tpl.department}
                              </span>
                              {selected && (
                                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              )}
                            </div>
                            <div className="text-[11px] font-medium text-slate-500 mt-0.5 line-clamp-1">
                              {tpl.description}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="custom-seat-title"
                        className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1"
                      >
                        2. Seat Role Title
                      </label>
                      <input
                        id="custom-seat-title"
                        type="text"
                        value={customSeatTitle}
                        onChange={(e) => setCustomSeatTitle(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 ring-1 ring-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder="e.g. Wholesale Accounts Lead"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="custom-seat-agent"
                        className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1"
                      >
                        3. Assign Starting Octopus (Optional)
                      </label>
                      <select
                        id="custom-seat-agent"
                        value={customStartingAgentId}
                        onChange={(e) => setCustomStartingAgentId(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 ring-1 ring-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="">Leave Vacant (Hire Later)</option>
                        {candidates
                          .filter((c) => !c.assignedSeatId)
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name} ({c.stars}★ • {c.trustScore}% Trust)
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="custom-seat-kpi"
                      className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1"
                    >
                      4. Department KPI &amp; Guardrail Summary
                    </label>
                    <input
                      id="custom-seat-kpi"
                      type="text"
                      value={customSeatKpi}
                      onChange={(e) => setCustomSeatKpi(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 ring-1 ring-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setAddSeatModalOpen(false)}
                      className="pressable px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="pressable px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Create Department Arm
                    </button>
                  </div>
                </div>
              </motion.form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ==================== MODALS & DRAWERS ==================== */}
        <EmployeeDossierDrawer
          agent={selectedDossierAgent}
          seats={seats}
          onClose={() => setSelectedDossierId(null)}
          onTogglePermissionMode={handleTogglePermissionMode}
          onUpdateQwenModel={handleUpdateQwenModel}
          onOpenBoard={(a) => setActiveBoardAgentId(a.id)}
          onAssignToSeat={handleAssignCandidateToSeat}
          onMoveToBench={handleMoveToBench}
          onFireCandidate={handleFireCandidate}
        />

        <OctoBoardModal
          agent={activeBoardAgent}
          seat={activeBoardSeat}
          presetCases={boardCases}
          onClose={() => setActiveBoardAgentId(null)}
          onApplyVerdict={handleApplyBoardVerdict}
          onFireAgent={handleFireCandidate}
        />
      </div>
    </MotionConfig>
  );
}

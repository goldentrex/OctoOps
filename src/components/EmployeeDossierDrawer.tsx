"use client";

import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { JobSeat, OctoAgent, PermissionScope } from "@/types/octo";
import { OctoPuppet } from "./OctoPuppet";
import {
  X,
  Shield,
  CheckCircle2,
  AlertOctagon,
  Globe,
  Gavel,
  Briefcase,
  UserMinus,
  Flame,
  History,
  Cpu,
  AlertTriangle,
} from "lucide-react";

interface EmployeeDossierDrawerProps {
  agent: OctoAgent | null;
  seats: JobSeat[];
  onClose: () => void;
  onTogglePermissionMode: (
    agentId: string,
    permissionId: string,
    nextMode: PermissionScope["mode"]
  ) => void;
  onUpdateQwenModel?: (agentId: string, qwenModelId: string) => void;
  onOpenBoard: (agent: OctoAgent) => void;
  onAssignToSeat: (candidateId: string, seatId: string) => void;
  onMoveToBench: (candidateId: string) => void;
  onFireCandidate: (candidateId: string) => void;
}

const EASE_DRAWER: [number, number, number, number] = [0.32, 0.72, 0, 1];
const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];

export const EmployeeDossierDrawer: React.FC<EmployeeDossierDrawerProps> = ({
  agent,
  seats,
  onClose,
  onTogglePermissionMode,
  onUpdateQwenModel,
  onOpenBoard,
  onAssignToSeat,
  onMoveToBench,
  onFireCandidate,
}) => {
  useEffect(() => {
    if (!agent) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [agent, onClose]);

  const modes: PermissionScope["mode"][] = [
    "LOCKED",
    "DRAFT_ONLY",
    "APPROVAL_REQUIRED",
    "AUTONOMOUS_EXEC",
  ];

  return (
    <AnimatePresence>
      {agent && (
        <motion.div
          key="dossier-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.2, ease: EASE_OUT } }}
          exit={{ opacity: 0, transition: { duration: 0.16, ease: EASE_OUT } }}
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm flex justify-end"
        >
          <motion.div
            key={agent.id}
            initial={{ x: "100%" }}
            animate={{ x: 0, transition: { duration: 0.3, ease: EASE_DRAWER } }}
            exit={{ x: "100%", transition: { duration: 0.2, ease: EASE_DRAWER } }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl bg-white h-full border-l border-slate-200/80 shadow-elevated flex flex-col justify-between overflow-hidden"
          >
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto">
              {/* Top Dossier Header */}
              <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-md text-white px-5 py-4 flex items-center justify-between border-b border-white/10">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 ring-1 ring-emerald-400/30 font-bold text-[11px] uppercase tracking-wider shrink-0">
                    HR File #{agent.id.toUpperCase()}
                  </span>
                  <span className="text-xs font-medium text-slate-300 truncate">
                    {agent.clearance}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close dossier"
                  className="pressable w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Agent Summary Banner */}
              <div className="p-5 bg-slate-50/80 border-b border-slate-200/80 flex items-center gap-4">
                <div className="w-24 h-24 rounded-2xl overflow-hidden shrink-0 shadow-sm">
                  <OctoPuppet
                    color={agent.color}
                    accessory={agent.accessory}
                    mood={agent.mood}
                    size="sm"
                    playVideo
                  />
                </div>
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-display text-2xl font-bold text-slate-900 leading-none">
                      {agent.name}
                    </h2>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 ring-1 ring-amber-200/80 tabular-nums">
                      {agent.stars} / {agent.maxStars} ★
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-600 flex flex-wrap items-center gap-1.5">
                    <span>{agent.role}</span>
                    <span className="text-slate-300">•</span>
                    <code className="bg-slate-900 text-emerald-300 px-1.5 py-0.5 rounded text-[11px] font-mono">
                      {agent.qwenModelId}
                    </code>
                  </p>
                  <p className="text-xs font-normal text-slate-600 leading-relaxed pt-0.5">
                    {agent.bio}
                  </p>
                </div>
              </div>

              <div className="p-5 space-y-6">
                {/* Position Assignment & Workforce Mobility */}
                <section>
                  <div className="flex items-center justify-between mb-2.5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-emerald-600" />
                      Position &amp; Mobility
                    </h3>
                    <span className="text-[11px] font-semibold text-slate-500">
                      {agent.assignedSeatId
                        ? "Currently Seated"
                        : agent.status === "FIRED"
                        ? "Terminated"
                        : "Available on Bench"}
                    </span>
                  </div>

                  {/* Traits */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {agent.traits.map((trait) => (
                      <span
                        key={trait}
                        className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 ring-1 ring-slate-900/[0.05]"
                      >
                        {trait}
                      </span>
                    ))}
                  </div>

                  {/* Assign / Transfer to any Job Seat */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {seats.map((seat) => {
                      const isCurrentSeat = agent.assignedSeatId === seat.id;
                      return (
                        <button
                          key={seat.id}
                          type="button"
                          disabled={isCurrentSeat}
                          onClick={() => onAssignToSeat(agent.id, seat.id)}
                          className={`pressable p-3 rounded-xl text-left ring-1 ${
                            isCurrentSeat
                              ? "bg-emerald-50 ring-emerald-300 text-emerald-950 cursor-default"
                              : "bg-white hover:bg-sky-50/70 ring-slate-200 hover:ring-sky-300 text-slate-900"
                          }`}
                        >
                          <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                            {seat.department}
                          </div>
                          <div className="text-xs font-bold truncate mt-0.5">
                            {seat.title}
                          </div>
                          <div
                            className={`text-[11px] font-semibold mt-1 ${
                              isCurrentSeat ? "text-emerald-700" : "text-sky-600"
                            }`}
                          >
                            {isCurrentSeat
                              ? "Current Seat"
                              : seat.occupantId
                              ? "Swap into Seat"
                              : "Fill Vacant Seat"}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Bench / Fire Actions */}
                  {(agent.assignedSeatId || agent.status !== "FIRED") && (
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      {agent.assignedSeatId && (
                        <button
                          type="button"
                          onClick={() => onMoveToBench(agent.id)}
                          className="pressable flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5"
                        >
                          <UserMinus className="w-3.5 h-3.5" />
                          Move to Bench
                        </button>
                      )}
                      {agent.status !== "FIRED" && (
                        <button
                          type="button"
                          onClick={() => {
                            onFireCandidate(agent.id);
                            onClose();
                          }}
                          className="pressable flex-1 py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 ring-1 ring-rose-200 text-rose-700 font-semibold text-xs flex items-center justify-center gap-1.5"
                        >
                          <Flame className="w-3.5 h-3.5" />
                          Fire &amp; Vacate Seat
                        </button>
                      )}
                    </div>
                  )}
                </section>

                {/* Earned Autonomy & RBAC Permissions */}
                <section>
                  <div className="flex items-center justify-between mb-2.5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-sky-600" />
                      Earned Autonomy &amp; RBAC Scopes
                    </h3>
                    <span className="text-[11px] font-medium text-slate-400">
                      Click pill to cycle mode
                    </span>
                  </div>

                  {agent.permissions.length === 0 ? (
                    <div className="p-3.5 rounded-xl bg-slate-50 ring-1 ring-slate-200/80 text-xs font-medium text-slate-600">
                      No active seat permissions. Assign {agent.name} to a job
                      seat above to provision scoped Hashmeta and QwenWork RBAC
                      permissions.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {agent.permissions.map((perm) => {
                        const nextMode =
                          modes[(modes.indexOf(perm.mode) + 1) % modes.length];
                        const isOverriddenBelowStars =
                          agent.stars < perm.requiredStars &&
                          (perm.mode === "AUTONOMOUS_EXEC" ||
                            perm.mode === "APPROVAL_REQUIRED");
                        return (
                          <div
                            key={perm.id}
                            className={`p-3 rounded-xl bg-white ring-1 shadow-sm flex items-center justify-between gap-3 ${
                              isOverriddenBelowStars
                                ? "ring-amber-300 bg-amber-50/30"
                                : "ring-slate-900/[0.07]"
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                                <span>{perm.label}</span>
                                {isOverriddenBelowStars && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                                    <AlertTriangle className="w-2.5 h-2.5" />
                                    Star Override
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5 mt-0.5">
                                <span>{perm.system}</span>
                                <span className="text-slate-300">•</span>
                                <span
                                  className={`tabular-nums ${
                                    agent.stars < perm.requiredStars
                                      ? "text-amber-700 font-semibold"
                                      : ""
                                  }`}
                                >
                                  Requires {perm.requiredStars}★ (has {agent.stars}★)
                                </span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                onTogglePermissionMode(
                                  agent.id,
                                  perm.id,
                                  nextMode
                                )
                              }
                              className={`pressable px-2.5 py-1 rounded-lg font-bold text-[10px] uppercase tracking-wide shrink-0 ${
                                perm.mode === "AUTONOMOUS_EXEC"
                                  ? "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300"
                                  : perm.mode === "APPROVAL_REQUIRED"
                                  ? "bg-amber-100 text-amber-800 ring-1 ring-amber-300"
                                  : perm.mode === "DRAFT_ONLY"
                                  ? "bg-sky-100 text-sky-800 ring-1 ring-sky-300"
                                  : "bg-rose-100 text-rose-700 ring-1 ring-rose-300"
                              }`}
                            >
                              {perm.mode.replace("_", " ")}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>

                {/* QwenWork Engine Binding */}
                {onUpdateQwenModel && (
                  <section>
                    <div className="flex items-center justify-between mb-2.5">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <Cpu className="w-3.5 h-3.5 text-emerald-600" />
                        QwenWork Runtime Binding
                      </h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
                        DLP Hook Ready
                      </span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-50 ring-1 ring-slate-200/80 space-y-2.5">
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          "qwen-max-cms-writer-v2",
                          "qwen-agent-ops-v2",
                          "qwen-turbo-crm-v1",
                          "qwen-guard-forensic-v2",
                        ].map((presetModel) => (
                          <button
                            key={presetModel}
                            type="button"
                            onClick={() =>
                              onUpdateQwenModel(agent.id, presetModel)
                            }
                            className={`pressable px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold ring-1 ${
                              agent.qwenModelId === presetModel
                                ? "bg-slate-900 text-emerald-300 ring-slate-900"
                                : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-100"
                            }`}
                          >
                            {presetModel}
                          </button>
                        ))}
                      </div>
                      <input
                        type="text"
                        aria-label="Custom QwenWork Model ID"
                        value={agent.qwenModelId}
                        onChange={(e) =>
                          onUpdateQwenModel(agent.id, e.target.value)
                        }
                        className="w-full px-3 py-1.5 rounded-lg bg-white ring-1 ring-slate-200 font-mono text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </section>
                )}

                {/* Hashmeta AI Growth & Visibility Telemetry */}
                <section>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 mb-2.5">
                    <Globe className="w-3.5 h-3.5 text-indigo-600" />
                    Hashmeta Platform Telemetry
                  </h3>
                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="p-3 rounded-xl bg-emerald-50/70 ring-1 ring-emerald-200/70 text-center">
                      <div className="text-xl font-extrabold text-slate-900 tabular-nums">
                        {agent.hashmetaStats.cmsArticlesPublished}
                      </div>
                      <div className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide mt-0.5">
                        CMS Posts Live
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-violet-50/70 ring-1 ring-violet-200/70 text-center">
                      <div className="text-xl font-extrabold text-slate-900 tabular-nums">
                        {agent.hashmetaStats.aiCitationsCount}
                      </div>
                      <div className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide mt-0.5">
                        AI Citations
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-sky-50/70 ring-1 ring-sky-200/70 text-center">
                      <div className="text-xl font-extrabold text-slate-900 tabular-nums">
                        {agent.hashmetaStats.crmLeadsCaptured}
                      </div>
                      <div className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide mt-0.5">
                        CRM Leads
                      </div>
                    </div>
                  </div>
                </section>

                {/* Disciplinary Write-Up Ledger */}
                <section>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 mb-2.5">
                    <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />
                    Write-Ups &amp; DLP Interceptions ({agent.writeUps.length})
                  </h3>

                  {agent.writeUps.length === 0 ? (
                    <div className="p-3.5 rounded-xl bg-emerald-50/70 ring-1 ring-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      Spotless record. Zero data leaks, wrong-client emails, or
                      hallucinated facts.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {agent.writeUps.map((wu) => (
                        <div
                          key={wu.id}
                          className="p-3.5 rounded-xl bg-rose-50/70 ring-1 ring-rose-200 space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-rose-950">
                              {wu.title}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-600 text-white shrink-0 tabular-nums">
                              {wu.trustPenalty} Trust
                            </span>
                          </div>
                          <div className="text-[11px] font-semibold text-rose-800">
                            Rule: {wu.ruleViolated} • Blocked by {wu.blockedBy}
                          </div>
                          <pre className="text-[11px] font-mono bg-slate-900 text-rose-200 p-2.5 rounded-lg overflow-x-auto whitespace-pre-wrap leading-relaxed">
                            {wu.interceptedPayload}
                          </pre>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* Employment & Mobility History */}
                <section>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 mb-2.5">
                    <History className="w-3.5 h-3.5 text-slate-500" />
                    Employment History ({agent.employmentHistory.length})
                  </h3>
                  <div className="space-y-1.5">
                    {agent.employmentHistory.map((entry, idx) => (
                      <div
                        key={idx}
                        className="px-3 py-2 rounded-xl bg-slate-50 ring-1 ring-slate-900/[0.05] text-xs font-medium text-slate-700"
                      >
                        {entry}
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </div>

            {/* Footer Action */}
            <div className="p-4 bg-slate-50 border-t border-slate-200/80">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenBoard(agent);
                }}
                className="pressable w-full py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs shadow-sm flex items-center justify-center gap-2"
              >
                <Gavel className="w-4 h-4" />
                Convene Octo-Board Review for {agent.name}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

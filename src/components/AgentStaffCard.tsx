"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { JobSeat, OctoAgent } from "@/types/octo";
import { OctoPuppet } from "./OctoPuppet";
import {
  ShieldAlert,
  Sparkles,
  Gavel,
  FileSearch,
  Briefcase,
  Mail,
  AlertTriangle,
  Coffee,
  UserPlus,
  ArrowLeftRight,
  X,
} from "lucide-react";

interface AgentStaffCardProps {
  seat: JobSeat;
  agent: OctoAgent | null;
  onInspectFile: (agent: OctoAgent) => void;
  onSummonBoard: (agent: OctoAgent) => void;
  onHireForSeat: (seat: JobSeat) => void;
  onToggleBreak?: (agent: OctoAgent) => void;
  onRemoveSeat?: (seat: JobSeat) => void;
}

const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];

const TOP_BAR_COLOR: Record<string, string> = {
  blue: "bg-emerald-500",
  purple: "bg-sky-500",
  pink: "bg-amber-500",
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  slate: "bg-slate-600",
};

const BOTTOM_BAR_COLOR: Record<string, string> = {
  blue: "bg-amber-500",
  purple: "bg-violet-500",
  pink: "bg-rose-500",
  green: "bg-teal-500",
  amber: "bg-orange-500",
  slate: "bg-indigo-500",
};

export const AgentStaffCard: React.FC<AgentStaffCardProps> = ({
  seat,
  agent,
  onInspectFile,
  onSummonBoard,
  onHireForSeat,
  onToggleBreak,
  onRemoveSeat,
}) => {
  const stampStyles = agent
    ? agent.stampVariant === "blue"
      ? "ring-2 ring-blue-600/80 text-blue-700 bg-white/95 shadow-[0_8px_20px_rgba(37,99,235,0.14)]"
      : agent.stampVariant === "green"
      ? "ring-2 ring-emerald-600/80 text-emerald-700 bg-white/95 shadow-[0_8px_20px_rgba(22,163,74,0.14)]"
      : "ring-2 ring-rose-600/85 text-rose-700 bg-white/95 shadow-[0_8px_20px_rgba(225,29,72,0.16)]"
    : "";

  return (
    <AnimatePresence mode="wait" initial={false}>
      {!agent ? (
        <motion.div
          key="vacant"
          initial={{ opacity: 0, scale: 0.97, y: 6 }}
          animate={{
            opacity: 1,
            scale: 1,
            y: 0,
            transition: { duration: 0.24, ease: EASE_OUT },
          }}
          exit={{
            opacity: 0,
            scale: 0.97,
            y: -4,
            transition: { duration: 0.16, ease: EASE_OUT },
          }}
          className="relative bg-white/85 rounded-[28px] p-5 border border-dashed border-slate-300 shadow-surface flex flex-col justify-between min-h-[460px]"
        >
          <div>
            <div className="flex items-center justify-between gap-2 mb-4">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                {seat.department}
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[11px] font-bold uppercase tracking-wide px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 ring-1 ring-rose-200">
                  Vacant Seat
                </span>
                {onRemoveSeat && (
                  <button
                    type="button"
                    onClick={() => onRemoveSeat(seat)}
                    title={`Remove vacant ${seat.title} seat`}
                    aria-label={`Remove ${seat.title} seat`}
                    className="pressable w-6 h-6 rounded-full bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-700 flex items-center justify-center"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="h-56 rounded-[22px] bg-slate-50 ring-1 ring-slate-900/[0.05] flex flex-col items-center justify-center text-center p-5">
              <div className="w-14 h-14 rounded-2xl bg-white shadow-sm ring-1 ring-slate-900/[0.06] flex items-center justify-center text-sky-600 mb-3">
                <UserPlus className="w-6 h-6" />
              </div>
              <h3 className="font-display text-xl font-bold text-slate-900">
                {seat.title}
              </h3>
              <p className="text-xs font-medium text-slate-500 mt-1 max-w-xs leading-relaxed">
                {seat.kpiSummary}
              </p>
            </div>

            <div className="mt-4 space-y-1.5">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Seat Permissions Awaiting Assignment
              </div>
              {seat.defaultPermissions.slice(0, 2).map((p) => (
                <div
                  key={p.id}
                  className="text-xs font-medium text-slate-600 bg-slate-50/80 rounded-xl px-3 py-2 ring-1 ring-slate-900/[0.05] flex items-center justify-between"
                >
                  <span className="truncate pr-2">{p.label}</span>
                  <span className="text-[11px] font-semibold text-slate-400 shrink-0 tabular-nums">
                    {p.requiredStars}★ min
                  </span>
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onHireForSeat(seat)}
            className="pressable mt-4 w-full py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs shadow-sm flex items-center justify-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Assign Octopus to {seat.title}
          </button>
        </motion.div>
      ) : (
        <motion.div
          key={agent.id}
          initial={{ opacity: 0, scale: 0.97, y: 6 }}
          animate={{
            opacity: 1,
            scale: 1,
            y: 0,
            transition: { duration: 0.24, ease: EASE_OUT },
          }}
          exit={{
            opacity: 0,
            scale: 0.97,
            y: -4,
            transition: { duration: 0.16, ease: EASE_OUT },
          }}
          className={`card-hover relative bg-white rounded-[28px] p-4 ring-1 shadow-surface hover:shadow-elevated flex flex-col justify-between transition-shadow duration-300 ${
            agent.status === "WRITE_UP"
              ? "ring-rose-300/90 shadow-[0_8px_28px_rgba(244,63,94,0.10)]"
              : agent.status === "PROMOTED"
              ? "ring-emerald-300/80 shadow-[0_8px_28px_rgba(16,185,129,0.09)]"
              : "ring-slate-900/[0.06]"
          }`}
        >
          {/* Top Department Pill, Swap Button & Live Trust Score */}
          <div className="flex items-center justify-between gap-2 mb-3 px-0.5">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100/90 text-slate-700 truncate">
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 transition-colors duration-300 ${
                  agent.status === "WRITE_UP"
                    ? "bg-rose-500 animate-pulse"
                    : "bg-emerald-500"
                }`}
              />
              {seat.department}
            </span>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => onHireForSeat(seat)}
                title={`Swap octopus in ${seat.title}`}
                className="pressable text-[11px] font-semibold text-slate-600 hover:text-slate-900 bg-slate-100/80 hover:bg-slate-200/70 px-2.5 py-1 rounded-full flex items-center gap-1"
              >
                <ArrowLeftRight className="w-3 h-3" />
                Swap
              </button>
              <span className="text-xs font-medium text-slate-500 bg-slate-50 px-2.5 py-1 rounded-full ring-1 ring-slate-900/[0.06] tabular-nums">
                Trust{" "}
                <strong className="font-bold text-slate-900">
                  {agent.trustScore}%
                </strong>
              </span>
            </div>
          </div>

          {/* Octopus Stage + Tactile Rubber Stamp */}
          <div className="relative w-full">
            <OctoPuppet
              color={agent.color}
              accessory={agent.accessory}
              prop={seat.prop}
              mood={agent.mood}
              size="lg"
            />

            <AnimatePresence mode="popLayout">
              <motion.div
                key={agent.stampText + agent.status}
                initial={{ scale: 1.28, opacity: 0, rotate: -11, y: -4 }}
                animate={{ scale: 1, opacity: 1, rotate: -5, y: 0 }}
                exit={{
                  scale: 0.9,
                  opacity: 0,
                  rotate: -2,
                  transition: { duration: 0.16, ease: EASE_OUT },
                }}
                transition={{ type: "spring", duration: 0.36, bounce: 0.22 }}
                className={`absolute -bottom-3.5 right-3 z-20 px-3 py-1.5 rounded-xl text-center leading-tight select-none backdrop-blur-md ${stampStyles}`}
              >
                <div className="text-xs uppercase tracking-wider font-extrabold">
                  {agent.stampText}
                </div>
                {agent.stampSubtext && (
                  <div className="text-[10px] font-semibold opacity-85 mt-0.5">
                    {agent.stampSubtext}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

      {/* Name, Role & Star Rating */}
      <div className="mt-5 px-0.5 flex items-end justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-display text-2xl font-bold text-slate-900 tracking-tight leading-none truncate">
            {agent.name}
          </h3>
          <p className="text-xs font-medium text-slate-500 mt-1 truncate">
            {agent.role}
          </p>
        </div>

        <div
          className="flex items-center gap-0.5 bg-amber-50/90 px-2 py-1 rounded-xl ring-1 ring-amber-200/70 shrink-0"
          aria-label={`${agent.stars} out of ${agent.maxStars} stars`}
        >
          {Array.from({ length: agent.maxStars }).map((_, idx) => {
            const filled = idx < agent.stars;
            return (
              <svg key={idx} viewBox="0 0 24 24" className="w-4 h-4">
                <path
                  d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                  className="transition-colors duration-200"
                  fill={filled ? "#FBBF24" : "#E2E8F0"}
                  stroke={filled ? "#D97706" : "#CBD5E1"}
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            );
          })}
        </div>
      </div>

      {/* GPU-Accelerated Progress Bars + Focus Indicator */}
      <div className="mt-4 px-0.5 flex items-center gap-3">
        <div className="flex-1 space-y-2">
          {/* Bar 1: Work Output */}
          <div className="flex items-center gap-2.5" title={`Work Output: ${agent.workOutputScore}%`}>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 ring-1 ring-amber-200/70 flex items-center justify-center shrink-0">
              <Briefcase className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden ring-1 ring-inset ring-slate-900/[0.06]">
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: agent.workOutputScore / 100 }}
                transition={{ duration: 0.4, ease: EASE_OUT }}
                style={{ transformOrigin: "left" }}
                className={`h-full w-full rounded-full ${
                  TOP_BAR_COLOR[agent.color] || TOP_BAR_COLOR.blue
                }`}
              />
            </div>
          </div>

          {/* Bar 2: Guardrail Compliance */}
          <div className="flex items-center gap-2.5" title={`Compliance: ${agent.complianceScore}%`}>
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ring-1 ${
                agent.status === "WRITE_UP"
                  ? "bg-rose-50 text-rose-600 ring-rose-200/70"
                  : "bg-sky-50 text-sky-700 ring-sky-200/70"
              }`}
            >
              {agent.status === "WRITE_UP" ? (
                <AlertTriangle className="w-3.5 h-3.5" />
              ) : (
                <Mail className="w-3.5 h-3.5" />
              )}
            </div>
            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden ring-1 ring-inset ring-slate-900/[0.06]">
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: agent.complianceScore / 100 }}
                transition={{ duration: 0.4, ease: EASE_OUT }}
                style={{ transformOrigin: "left" }}
                className={`h-full w-full rounded-full ${
                  BOTTOM_BAR_COLOR[agent.color] || BOTTOM_BAR_COLOR.blue
                }`}
              />
            </div>
          </div>
        </div>

        {/* Give Break / Resume Work Button */}
        <button
          type="button"
          onClick={() => onToggleBreak?.(agent)}
          title={
            agent.mood === "sleeping"
              ? "Resume work"
              : "Give octopus a coffee break"
          }
          className={`pressable h-10 px-2.5 rounded-xl ring-1 flex items-center justify-center gap-1 text-[11px] font-bold shrink-0 transition-colors ${
            agent.mood === "sleeping"
              ? "bg-amber-100 text-amber-800 ring-amber-300 hover:bg-amber-200"
              : "bg-emerald-50/80 text-emerald-700 ring-emerald-200/70 hover:bg-emerald-100"
          }`}
        >
          <Coffee className="w-3.5 h-3.5" />
          <span>{agent.mood === "sleeping" ? "Resume" : "Break"}</span>
        </button>
      </div>

          {/* Live Activity Strip */}
          <div className="mt-3.5 bg-slate-50 rounded-xl px-3 py-2 ring-1 ring-slate-900/[0.05] text-xs font-medium text-slate-600 overflow-hidden">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={agent.currentTask}
                initial={{ opacity: 0, y: 4 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  transition: { duration: 0.2, ease: EASE_OUT },
                }}
                exit={{
                  opacity: 0,
                  y: -4,
                  transition: { duration: 0.14, ease: EASE_OUT },
                }}
                className="truncate"
              >
                <span className="font-semibold text-slate-800">Now: </span>
                {agent.currentTask}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Action Buttons */}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onInspectFile(agent)}
              className="pressable flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-800 font-semibold text-xs"
            >
              <FileSearch className="w-3.5 h-3.5 text-slate-500" />
              HR Dossier
            </button>

            <button
              type="button"
              onClick={() => onSummonBoard(agent)}
              className={`pressable flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-semibold text-xs shadow-sm transition-colors duration-200 ${
                agent.status === "WRITE_UP"
                  ? "bg-rose-600 hover:bg-rose-700 text-white"
                  : agent.status === "PROBATION"
                  ? "bg-amber-400 hover:bg-amber-500 text-slate-950"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
              }`}
            >
              {agent.status === "WRITE_UP" ? (
                <>
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Board Tribunal
                </>
              ) : agent.status === "PROBATION" ? (
                <>
                  <Gavel className="w-3.5 h-3.5" />
                  Board Review
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  Board Audit
                </>
              )}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

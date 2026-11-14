"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { BoardReviewCase, JobSeat, OctoAgent } from "@/types/octo";
import {
  OCTO_BOARD_MEMBERS,
  BOARD_REVIEW_CASES,
  getBoardReviewCase,
} from "@/data/mockOctoData";
import { OctoPuppet } from "./OctoPuppet";
import {
  Gavel,
  FastForward,
  X,
  FileCode2,
  Sparkles,
  Flame,
  Mic,
} from "lucide-react";

interface OctoBoardModalProps {
  agent: OctoAgent | null;
  seat?: JobSeat;
  presetCases?: Record<string, BoardReviewCase>;
  onClose: () => void;
  onApplyVerdict: (
    agentId: string,
    outcome: (typeof BOARD_REVIEW_CASES)["inko"]["recommendedOutcome"]
  ) => void;
  onFireAgent: (agentId: string) => void;
}

const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];

export const OctoBoardModal: React.FC<OctoBoardModalProps> = ({
  agent,
  seat,
  presetCases,
  onClose,
  onApplyVerdict,
  onFireAgent,
}) => {
  const [visibleTurns, setVisibleTurns] = useState<number>(1);
  const [stamped, setStamped] = useState<boolean>(false);
  const [customOutcome, setCustomOutcome] = useState<
    BoardReviewCase["recommendedOutcome"] | null
  >(null);
  const [customFired, setCustomFired] = useState<boolean>(false);

  const reviewCase = agent ? getBoardReviewCase(agent, seat, presetCases) : null;
  const reviewCaseId = reviewCase?.id;

  useEffect(() => {
    if (!agent || !reviewCaseId) return;
    setVisibleTurns(1);
    setStamped(false);
    setCustomOutcome(null);
    setCustomFired(false);
  }, [agent?.id, reviewCaseId]);

  useEffect(() => {
    if (!agent) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [agent, onClose]);

  useEffect(() => {
    if (!reviewCase) return;
    if (visibleTurns < reviewCase.debateTranscript.length) {
      const timer = setTimeout(() => {
        setVisibleTurns((prev) => prev + 1);
      }, 2800);
      return () => clearTimeout(timer);
    }
  }, [visibleTurns, reviewCase]);

  const activeTurn = reviewCase
    ? reviewCase.debateTranscript[
        Math.min(visibleTurns - 1, reviewCase.debateTranscript.length - 1)
      ]
    : null;

  const handleExecuteVerdict = (
    override?: BoardReviewCase["recommendedOutcome"]
  ) => {
    if (!agent || !reviewCase) return;
    const outcomeToApply = override ?? reviewCase.recommendedOutcome;
    setCustomOutcome(override ?? null);
    setStamped(true);
    if (outcomeToApply.newStatus === "PROMOTED") {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
    setTimeout(() => {
      onApplyVerdict(agent.id, outcomeToApply);
    }, 1050);
  };

  const handleOverrideChoice = (
    choice: "PROMOTED" | "PROBATION" | "WRITE_UP"
  ) => {
    if (!agent) return;
    const seatLabel = seat?.title ?? agent.role;
    if (choice === "PROMOTED") {
      handleExecuteVerdict({
        newStatus: "PROMOTED",
        newStampText: "PROMOTED",
        newStampSubtext: `to 4★ ${seat?.department ?? "Lead"}`,
        newStampVariant: "green",
        newStars: Math.min(5, Math.max(4, agent.stars + 1)),
        newTrustScore: Math.min(99, Math.max(90, agent.trustScore + 12)),
        newComplianceScore: Math.min(98, Math.max(88, agent.complianceScore + 8)),
        newMood: "proud",
        resolutionBanner: `Founder Override: ${agent.name} promoted to 4★ in ${seatLabel}!`,
      });
      return;
    }
    if (choice === "PROBATION") {
      handleExecuteVerdict({
        newStatus: "PROBATION",
        newStampText: "ON PROBATION",
        newStampSubtext: "(Founder Review)",
        newStampVariant: "blue",
        newStars: Math.min(3, Math.max(2, agent.stars)),
        newTrustScore: Math.max(68, Math.min(82, agent.trustScore)),
        newComplianceScore: Math.max(70, Math.min(84, agent.complianceScore)),
        newMood: "working",
        resolutionBanner: `Founder Override: ${agent.name} placed on Probation in ${seatLabel}.`,
      });
      return;
    }
    handleExecuteVerdict({
      newStatus: "WRITE_UP",
      newStampText: "1st WRITE-UP",
      newStampSubtext: "(Founder Sanction)",
      newStampVariant: "red",
      newStars: 1,
      newTrustScore: Math.max(25, agent.trustScore - 20),
      newComplianceScore: Math.max(25, agent.complianceScore - 15),
      newMood: "panicked",
      resolutionBanner: `Founder Override: ${agent.name} issued 1st Write-Up & sandboxed in ${seatLabel}.`,
    });
  };

  const handleOverrideFire = () => {
    if (!agent) return;
    setCustomFired(true);
    setStamped(true);
    setTimeout(() => {
      onFireAgent(agent.id);
    }, 1050);
  };

  return (
    <AnimatePresence>
      {agent && reviewCase && (
        <motion.div
          key="board-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.2, ease: EASE_OUT } }}
          exit={{ opacity: 0, transition: { duration: 0.16, ease: EASE_OUT } }}
          onClick={onClose}
          className="fixed inset-0 z-50 bg-slate-900/45 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
        >
          <motion.div
            key={agent.id}
            initial={{ scale: 0.95, y: 12, opacity: 0 }}
            animate={{
              scale: 1,
              y: 0,
              opacity: 1,
              transition: { duration: 0.26, ease: EASE_OUT },
            }}
            exit={{
              scale: 0.96,
              y: 8,
              opacity: 0,
              transition: { duration: 0.17, ease: EASE_OUT },
            }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-5xl bg-white rounded-[28px] ring-1 ring-slate-900/[0.08] shadow-elevated overflow-hidden"
          >
            {/* Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-amber-400 flex items-center justify-center text-slate-950 shrink-0">
                  <Gavel className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-400/15 text-amber-300 ring-1 ring-amber-400/25">
                      Octo-Board Review Panel
                    </span>
                    <span className="text-xs font-medium text-slate-400">
                      3-Judge Executive Tribunal
                    </span>
                  </div>
                  <h2 className="text-base sm:text-lg font-bold tracking-tight mt-0.5 truncate">
                    {reviewCase.headline}
                  </h2>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close board modal"
                className="pressable w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 max-h-[82vh] overflow-y-auto">
              {/* LEFT 7 COLS: 3 BOARD JUDGES & DEBATE */}
              <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
                {/* Judges Bench */}
                <div className="bg-slate-50/90 rounded-2xl p-4 ring-1 ring-slate-900/[0.05]">
                  <div className="text-xs font-semibold text-slate-500 mb-3 flex items-center justify-between px-0.5">
                    <span>Autonomous Governance Bench (3-Agent Quorum)</span>
                    <span className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Live Deliberation
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {OCTO_BOARD_MEMBERS.map((member) => {
                      const isSpeaking = activeTurn?.speakerId === member.id;
                      const memberVote =
                        reviewCase.votes[member.id as "cfo" | "ciso" | "vp"];
                      const allTurnsDone =
                        visibleTurns >= reviewCase.debateTranscript.length;

                      return (
                        <div
                          key={member.id}
                          style={{
                            transition:
                              "transform 220ms var(--ease-out), opacity 200ms ease, box-shadow 200ms ease, background-color 200ms ease",
                            transform: isSpeaking
                              ? "translateY(-3px) scale(1.01)"
                              : "translateY(0) scale(1)",
                            opacity: isSpeaking ? 1 : 0.85,
                          }}
                          className={`rounded-2xl p-2.5 flex flex-col items-center text-center relative ${
                            isSpeaking
                              ? "bg-white shadow-surface ring-2 ring-emerald-500/80"
                              : "bg-white/80 ring-1 ring-slate-900/[0.06]"
                          }`}
                        >
                          {isSpeaking && (
                            <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-20 bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full shadow-sm inline-flex items-center gap-1 whitespace-nowrap">
                              <Mic className="w-2.5 h-2.5" />
                              Speaking
                            </span>
                          )}

                          <div className="w-full h-28 rounded-xl overflow-hidden">
                            <OctoPuppet
                              color={member.color}
                              accessory={member.accessory}
                              mood={isSpeaking ? "working" : "judging"}
                              speaking={isSpeaking}
                              size="sm"
                              playVideo={isSpeaking}
                            />
                          </div>

                          <div className="mt-2">
                            <div className="font-bold text-xs sm:text-sm text-slate-900">
                              {member.name}
                            </div>
                            <div className="text-[11px] font-medium text-slate-500 leading-tight mt-0.5">
                              {member.title}
                            </div>
                            <div className="mt-1 inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                              {member.sponsorTieIn}
                            </div>
                          </div>

                          {allTurnsDone && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.94, y: 4 }}
                              animate={{
                                opacity: 1,
                                scale: 1,
                                y: 0,
                                transition: { duration: 0.2, ease: EASE_OUT },
                              }}
                              className={`mt-2 w-full py-1 rounded-lg font-bold text-[10px] uppercase tracking-wider ${
                                memberVote === "PROMOTE"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : memberVote === "WRITE_UP"
                                  ? "bg-rose-100 text-rose-700"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              Vote: {memberVote.replace("_", "-")}
                            </motion.div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Debate Transcript */}
                <div className="bg-slate-50/90 rounded-2xl p-4 ring-1 ring-slate-900/[0.05] space-y-3">
                  <div className="flex items-center justify-between px-0.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 tabular-nums">
                      Deliberation Transcript ({visibleTurns} /{" "}
                      {reviewCase.debateTranscript.length})
                    </span>
                    {visibleTurns < reviewCase.debateTranscript.length && (
                      <button
                        type="button"
                        onClick={() =>
                          setVisibleTurns(reviewCase.debateTranscript.length)
                        }
                        className="pressable inline-flex items-center gap-1 text-xs font-semibold text-sky-700 hover:text-sky-900 bg-sky-50 hover:bg-sky-100 px-3 py-1 rounded-full"
                      >
                        <FastForward className="w-3.5 h-3.5" />
                        Skip to Verdict
                      </button>
                    )}
                  </div>

                  <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                    {reviewCase.debateTranscript
                      .slice(0, visibleTurns)
                      .map((turn) => {
                        const speaker = OCTO_BOARD_MEMBERS.find(
                          (m) => m.id === turn.speakerId
                        )!;
                        return (
                          <motion.div
                            key={turn.id}
                            initial={{ opacity: 0, y: 8, scale: 0.98 }}
                            animate={{
                              opacity: 1,
                              y: 0,
                              scale: 1,
                              transition: { duration: 0.2, ease: EASE_OUT },
                            }}
                            className="p-3.5 rounded-xl bg-white shadow-sm ring-1 ring-slate-900/[0.06] flex flex-col gap-1"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-xs text-slate-900">
                                {speaker.name}
                                <span className="text-slate-400 font-medium">
                                  {" "}
                                  • {speaker.title}
                                </span>
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 tabular-nums ${
                                  turn.stance === "PRAISE"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : turn.stance === "WARNING"
                                    ? "bg-rose-100 text-rose-700"
                                    : "bg-amber-100 text-amber-800"
                                }`}
                              >
                                {turn.scoreDelta}
                              </span>
                            </div>
                            <p className="text-xs sm:text-[13px] font-normal text-slate-700 leading-relaxed">
                              &ldquo;{turn.dialogue}&rdquo;
                            </p>
                            <div className="text-[11px] font-medium text-slate-400">
                              Telemetry: {turn.metricCited}
                            </div>
                          </motion.div>
                        );
                      })}
                  </div>
                </div>
              </div>

              {/* RIGHT 5 COLS: AGENT ON TRIAL + EVIDENCE + VERDICT */}
              <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
                {/* Agent Under Review */}
                <div className="bg-slate-50/90 rounded-2xl p-4 ring-1 ring-slate-900/[0.05] relative overflow-hidden">
                  <div className="flex items-center gap-4">
                    <div className="w-24 h-24 rounded-2xl overflow-hidden shrink-0 shadow-sm">
                      <OctoPuppet
                        color={agent.color}
                        accessory={agent.accessory}
                        mood={agent.mood}
                        size="sm"
                        playVideo
                      />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700">
                        Under Review
                      </span>
                      <h3 className="font-display text-2xl font-bold text-slate-900 mt-1 truncate">
                        {agent.name}
                      </h3>
                      <p className="text-xs font-medium text-slate-500 truncate">
                        {agent.role} • {agent.qwenModelId}
                      </p>
                      <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold tabular-nums">
                        <span className="px-2 py-0.5 rounded-full bg-white ring-1 ring-slate-900/[0.06] text-slate-700">
                          Trust {agent.trustScore}%
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 ring-1 ring-amber-200/80">
                          {agent.stars}★
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Rubber Stamp Verdict Slam */}
                  <AnimatePresence>
                    {stamped && (
                      <motion.div
                        initial={{ scale: 1.3, opacity: 0, rotate: -14 }}
                        animate={{ scale: 1, opacity: 1, rotate: -6 }}
                        transition={{
                          type: "spring",
                          duration: 0.35,
                          bounce: 0.22,
                        }}
                        className={`absolute inset-0 m-auto w-64 h-24 rounded-2xl ring-2 ring-white/80 flex flex-col items-center justify-center font-extrabold uppercase shadow-elevated z-30 ${
                          customFired
                            ? "bg-rose-600 text-white"
                            : (customOutcome ?? reviewCase.recommendedOutcome)
                                .newStampVariant === "green"
                            ? "bg-emerald-600 text-white"
                            : (customOutcome ?? reviewCase.recommendedOutcome)
                                .newStampVariant === "blue"
                            ? "bg-sky-600 text-white"
                            : "bg-rose-600 text-white"
                        }`}
                      >
                        <span className="text-lg tracking-wider">
                          {customFired
                            ? "FIRED & VACATED"
                            : (customOutcome ?? reviewCase.recommendedOutcome)
                                .newStampText}
                        </span>
                        <span className="text-[11px] font-semibold opacity-90 mt-0.5">
                          {customFired
                            ? "Seat Open for Replacement"
                            : (customOutcome ?? reviewCase.recommendedOutcome)
                                .newStampSubtext}
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Forensic Evidence & Rubric */}
                <div className="bg-slate-900 text-slate-100 rounded-2xl p-4 shadow-sm space-y-3">
                  <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
                    <FileCode2 className="w-4 h-4 shrink-0" />
                    <span className="truncate">{reviewCase.evidenceTitle}</span>
                  </div>
                  <pre className="text-[11px] font-mono bg-slate-950/90 text-emerald-300 p-3 rounded-xl border border-slate-800 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                    {reviewCase.evidenceCodeSnippet}
                  </pre>

                  <div className="grid grid-cols-2 gap-2 pt-0.5">
                    {[
                      {
                        label: "AvePoint DLP Security",
                        val: reviewCase.rubricScores.securityCompliance,
                      },
                      {
                        label: "Hallucination Shield",
                        val: reviewCase.rubricScores.hallucinationControl,
                      },
                      {
                        label: "Hashmeta Visibility",
                        val: reviewCase.rubricScores.hashmetaGrowthImpact,
                      },
                      {
                        label: "QwenWork Cost ROI",
                        val: reviewCase.rubricScores.costEfficiency,
                      },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="bg-slate-800/80 rounded-xl p-2.5 border border-slate-700/60"
                      >
                        <div className="flex justify-between text-[11px] font-medium text-slate-300">
                          <span className="truncate pr-1">{item.label}</span>
                          <span className="text-white font-bold tabular-nums shrink-0">
                            {item.val}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-950 rounded-full mt-1.5 overflow-hidden">
                          <div
                            className={`h-full w-full rounded-full ${
                              item.val >= 75
                                ? "bg-emerald-400"
                                : item.val >= 45
                                ? "bg-amber-400"
                                : "bg-rose-500"
                            }`}
                            style={{
                              transform: `scaleX(${item.val / 100})`,
                              transformOrigin: "left",
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Verdict Actions */}
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => handleExecuteVerdict()}
                    disabled={stamped}
                    className={`pressable w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm shadow-sm flex items-center justify-center gap-2 disabled:opacity-60 ${
                      reviewCase.recommendedOutcome.newStampVariant === "green"
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                        : "bg-amber-400 hover:bg-amber-500 text-slate-950"
                    }`}
                  >
                    <Sparkles className="w-4 h-4 shrink-0" />
                    <span className="truncate">
                      Stamp Verdict:{" "}
                      {reviewCase.recommendedOutcome.newStampText}{" "}
                      {reviewCase.recommendedOutcome.newStampSubtext}
                    </span>
                  </button>

                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOverrideChoice("PROMOTED")}
                      disabled={stamped}
                      className="pressable py-2 px-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200 font-bold text-[11px] disabled:opacity-60"
                    >
                      Promote 4★
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOverrideChoice("PROBATION")}
                      disabled={stamped}
                      className="pressable py-2 px-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 ring-1 ring-sky-200 font-bold text-[11px] disabled:opacity-60"
                    >
                      Hold Probation
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOverrideChoice("WRITE_UP")}
                      disabled={stamped}
                      className="pressable py-2 px-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 ring-1 ring-amber-200 font-bold text-[11px] disabled:opacity-60"
                    >
                      1st Write-Up
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleOverrideFire}
                    disabled={stamped}
                    className="pressable w-full py-2.5 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 ring-1 ring-rose-200 font-semibold text-xs flex items-center justify-center gap-1.5 disabled:opacity-60"
                  >
                    <Flame className="w-3.5 h-3.5" />
                    Founder Override: Fire {agent.name} &amp; Vacate Seat
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

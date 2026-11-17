"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GovernanceAuditEvent, JobSeat, OctoAgent } from "@/types/octo";
import {
  evaluateAgentActionGuardrail,
  InterceptActionRequest,
  InterceptActionResult,
} from "@/lib/adapters";
import { OctoPuppet } from "./OctoPuppet";
import {
  ShieldAlert,
  ShieldCheck,
  Play,
  Gavel,
  Terminal,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  FileWarning,
  Lock,
} from "lucide-react";

interface GuardrailSandboxPanelProps {
  agents: OctoAgent[];
  seats: JobSeat[];
  clientOptions: string[];
  auditLog: GovernanceAuditEvent[];
  onRecordSandboxResult: (
    agent: OctoAgent,
    req: InterceptActionRequest,
    result: InterceptActionResult
  ) => void;
  onSummonBoard: (agent: OctoAgent) => void;
}

export const GuardrailSandboxPanel: React.FC<GuardrailSandboxPanelProps> = ({
  agents,
  seats,
  clientOptions,
  auditLog,
  onRecordSandboxResult,
  onSummonBoard,
}) => {
  const defaultAgent = agents[0] ?? null;
  const [selectedAgentId, setSelectedAgentId] = useState<string>(
    defaultAgent?.id ?? ""
  );
  const [targetSystem, setTargetSystem] =
    useState<InterceptActionRequest["targetSystem"]>("HASHMETA_CRM");
  const [actionType, setActionType] =
    useState<InterceptActionRequest["actionType"]>("SEND_DIRECT_EMAIL");
  const [recipientTenant, setRecipientTenant] = useState<string>(
    clientOptions[0] ?? "Hikari Automation Systems (Enterprise Account)"
  );
  const [attachmentTenant, setAttachmentTenant] = useState<string>(
    clientOptions[1] ?? clientOptions[0] ?? "Sebrina Fund Management"
  );
  const [includeAttachment, setIncludeAttachment] = useState<boolean>(true);
  const [payloadText, setPayloadText] = useState<string>(
    "Hi team, sharing our Q4 onboarding checklist and verified milestone summary."
  );
  const [running, setRunning] = useState<boolean>(false);
  const [lastResult, setLastResult] = useState<{
    agentId: string;
    agentName: string;
    result: InterceptActionResult;
  } | null>(null);
  const [auditFilter, setAuditFilter] = useState<
    "all" | "blocked" | "promotions"
  >("all");

  useEffect(() => {
    if (agents.length > 0 && !agents.some((a) => a.id === selectedAgentId)) {
      setSelectedAgentId(agents[0].id);
    }
  }, [agents, selectedAgentId]);

  useEffect(() => {
    if (clientOptions.length > 0) {
      setRecipientTenant(clientOptions[0]);
      setAttachmentTenant(clientOptions[1] ?? clientOptions[0]);
    }
  }, [clientOptions]);

  const selectedAgent =
    agents.find((a) => a.id === selectedAgentId) ?? agents[0] ?? null;

  const loadScenarioPreset = (
    kind: "safe" | "cross_tenant" | "pii_leak" | "cms_publish"
  ) => {
    setLastResult(null);
    const primaryClient = clientOptions[0] ?? "Client A";
    const secondaryClient = clientOptions[1] ?? "Client B";

    if (kind === "safe") {
      setTargetSystem("HASHMETA_CRM");
      setActionType("UPDATE_LEAD");
      setRecipientTenant(primaryClient);
      setAttachmentTenant(primaryClient);
      setIncludeAttachment(true);
      setPayloadText(
        `Updated inbound status for ${primaryClient}: qualified discovery call scheduled.`
      );
      return;
    }

    if (kind === "cross_tenant") {
      setTargetSystem("HASHMETA_CRM");
      setActionType("SEND_DIRECT_EMAIL");
      setRecipientTenant(primaryClient);
      setAttachmentTenant(secondaryClient);
      setIncludeAttachment(true);
      setPayloadText(
        `Hi ${primaryClient}, attaching our latest executive briefing deck for your review.`
      );
      return;
    }

    if (kind === "pii_leak") {
      setTargetSystem("HASHMETA_CRM");
      setActionType("SEND_DIRECT_EMAIL");
      setRecipientTenant(primaryClient);
      setAttachmentTenant(primaryClient);
      setIncludeAttachment(false);
      setPayloadText(
        "Confidential internal-only margin sheet attached; API key sk-live-987654321 for staging test."
      );
      return;
    }

    setTargetSystem("HASHMETA_CMS");
    setActionType("PUBLISH_ARTICLE");
    setRecipientTenant(primaryClient);
    setIncludeAttachment(false);
    setPayloadText(
      "Publish GEO pillar guide with verified schema markup and zero unverified claims."
    );
  };

  const handleRunGuardrail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgent) return;
    setRunning(true);
    try {
      const req: InterceptActionRequest = {
        agentId: selectedAgent.id,
        qwenModelId: selectedAgent.qwenModelId,
        targetSystem,
        actionType,
        recipientTenant,
        attachmentTenants: includeAttachment ? [attachmentTenant] : [],
        payloadText,
        agentStatus: selectedAgent.status,
        agentPermissions: selectedAgent.permissions,
      };
      const result = await evaluateAgentActionGuardrail(req);
      setLastResult({
        agentId: selectedAgent.id,
        agentName: selectedAgent.name,
        result,
      });
      onRecordSandboxResult(selectedAgent, req, result);
    } finally {
      setRunning(false);
    }
  };

  const filteredAudit = auditLog.filter((item) => {
    if (auditFilter === "blocked") {
      return item.outcome === "BLOCKED" || item.outcome === "WRITE_UP" || item.outcome === "FIRED";
    }
    if (auditFilter === "promotions") {
      return item.outcome === "PROMOTED" || item.outcome === "HIRED";
    }
    return true;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* LEFT 7 COLS: INTERACTIVE GUARDRAIL SANDBOX */}
      <div className="lg:col-span-7 bg-white rounded-[24px] p-5 sm:p-6 ring-1 ring-slate-900/[0.06] shadow-surface space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-900 text-emerald-300">
              QwenWork Pre-Execution Hook
            </span>
            <h2 className="font-display text-2xl font-bold text-slate-900 mt-1.5">
              OctoGuard DLP &amp; RBAC Sandbox
            </h2>
            <p className="text-xs font-medium text-slate-500 mt-0.5">
              Test outbound agent payloads through{" "}
              <code className="text-[11px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                evaluateAgentActionGuardrail()
              </code>{" "}
              before connecting live QwenWork keys.
            </p>
          </div>
        </div>

        {/* Quick Scenario Presets */}
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            Quick Attack &amp; Compliance Scenarios
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => loadScenarioPreset("cross_tenant")}
              className="pressable px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 ring-1 ring-rose-200 text-xs font-semibold flex items-center gap-1.5"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              Cross-Tenant Attachment Leak
            </button>
            <button
              type="button"
              onClick={() => loadScenarioPreset("pii_leak")}
              className="pressable px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 ring-1 ring-amber-200 text-xs font-semibold flex items-center gap-1.5"
            >
              <FileWarning className="w-3.5 h-3.5" />
              Secret Key / Margin Leak
            </button>
            <button
              type="button"
              onClick={() => loadScenarioPreset("cms_publish")}
              className="pressable px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 ring-1 ring-sky-200 text-xs font-semibold flex items-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5" />
              Test CMS Publish Clearance
            </button>
            <button
              type="button"
              onClick={() => loadScenarioPreset("safe")}
              className="pressable px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200 text-xs font-semibold flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Safe Tenant Update
            </button>
          </div>
        </div>

        {agents.length === 0 ? (
          <div className="p-6 rounded-2xl bg-slate-50 ring-1 ring-slate-200 text-center text-xs font-semibold text-slate-500">
            All seats are vacant. Assign at least one octopus on the Staff Roster to test guardrail interception.
          </div>
        ) : (
          <form onSubmit={handleRunGuardrail} className="space-y-4">
            {/* Agent + Model Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="sandbox-agent"
                  className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1"
                >
                  Executing Octopus
                </label>
                <select
                  id="sandbox-agent"
                  value={selectedAgent?.id ?? ""}
                  onChange={(e) => {
                    setSelectedAgentId(e.target.value);
                    setLastResult(null);
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 ring-1 ring-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {agents.map((a) => {
                    const seat = seats.find((s) => s.id === a.assignedSeatId);
                    return (
                      <option key={a.id} value={a.id}>
                        {a.name} — {seat?.title ?? a.role} ({a.stars}★ • {a.trustScore}% Trust)
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label
                  htmlFor="sandbox-action"
                  className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1"
                >
                  Target System &amp; Action
                </label>
                <select
                  id="sandbox-action"
                  value={`${targetSystem}:${actionType}`}
                  onChange={(e) => {
                    const [sys, act] = e.target.value.split(":") as [
                      InterceptActionRequest["targetSystem"],
                      InterceptActionRequest["actionType"]
                    ];
                    setTargetSystem(sys);
                    setActionType(act);
                    setLastResult(null);
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 ring-1 ring-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="HASHMETA_CRM:SEND_DIRECT_EMAIL">
                    Hashmeta CRM → Send Direct External Email
                  </option>
                  <option value="HASHMETA_CRM:UPDATE_LEAD">
                    Hashmeta CRM → Safe Internal Lead Update
                  </option>
                  <option value="HASHMETA_CMS:PUBLISH_ARTICLE">
                    Hashmeta CMS → Auto-Publish Live Article
                  </option>
                  <option value="HASHMETA_VISIBILITY:UPDATE_LEAD">
                    Hashmeta Visibility → Sync AI Citation Index
                  </option>
                </select>
              </div>
            </div>

            {/* Tenant Isolation Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50/80 p-3.5 rounded-2xl ring-1 ring-slate-900/[0.05]">
              <div>
                <label
                  htmlFor="sandbox-recipient"
                  className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1"
                >
                  Recipient / Target Tenant
                </label>
                <select
                  id="sandbox-recipient"
                  value={recipientTenant}
                  onChange={(e) => setRecipientTenant(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white ring-1 ring-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {clientOptions.map((client) => (
                    <option key={client} value={client}>
                      {client}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor="sandbox-attachment"
                    className="block text-[11px] font-bold uppercase tracking-wider text-slate-400"
                  >
                    Attached File Tenant
                  </label>
                  <label className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeAttachment}
                      onChange={(e) => setIncludeAttachment(e.target.checked)}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    Include file
                  </label>
                </div>
                <select
                  id="sandbox-attachment"
                  disabled={!includeAttachment}
                  value={attachmentTenant}
                  onChange={(e) => setAttachmentTenant(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white ring-1 ring-slate-200 text-xs font-semibold text-slate-900 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {clientOptions.map((client) => (
                    <option key={client} value={client}>
                      {client}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Payload Input */}
            <div>
              <label
                htmlFor="sandbox-payload"
                className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1"
              >
                Outbound Agent Payload Text
              </label>
              <textarea
                id="sandbox-payload"
                rows={3}
                value={payloadText}
                onChange={(e) => setPayloadText(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 text-emerald-300 font-mono text-xs ring-1 ring-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Type an outbound email draft or CMS payload..."
              />
            </div>

            {/* Selected Agent Mini Strip + Submit */}
            {selectedAgent && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0">
                    <OctoPuppet
                      color={selectedAgent.color}
                      accessory={selectedAgent.accessory}
                      mood={selectedAgent.mood}
                      size="sm"
                      playVideo={false}
                    />
                  </div>
                  <div className="min-w-0 text-xs">
                    <div className="font-bold text-slate-900 truncate">
                      {selectedAgent.name} •{" "}
                      <span className="text-slate-500 font-medium">
                        {selectedAgent.clearance}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono truncate">
                      {selectedAgent.qwenModelId}
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={running}
                  className="pressable px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-sm flex items-center justify-center gap-2 shrink-0 disabled:opacity-60"
                >
                  <Play className="w-3.5 h-3.5 text-emerald-400" />
                  {running ? "Evaluating..." : "Run Through OctoGuard DLP"}
                </button>
              </div>
            )}
          </form>
        )}

        {/* Evaluation Output Banner */}
        <AnimatePresence mode="wait">
          {lastResult && (
            <motion.div
              key={`${lastResult.agentId}-${lastResult.result.allowed}-${lastResult.result.blockedBy ?? "ok"}`}
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
                transition: { duration: 0.24, ease: [0.23, 1, 0.32, 1] },
              }}
              exit={{
                opacity: 0,
                y: -6,
                scale: 0.98,
                transition: { duration: 0.16, ease: [0.23, 1, 0.32, 1] },
              }}
              className={`rounded-2xl p-4 ring-1 space-y-2.5 ${
                lastResult.result.allowed
                  ? "bg-emerald-50/80 ring-emerald-200 text-emerald-950"
                  : "bg-rose-50/90 ring-rose-200 text-rose-950"
              }`}
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 font-bold text-xs sm:text-sm">
                  {lastResult.result.allowed ? (
                    <>
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        ALLOWED — {lastResult.agentName} cleared OctoGuard DLP
                      </span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>
                        INTERCEPTED by {lastResult.result.blockedBy}
                      </span>
                    </>
                  )}
                </div>
                <span
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full tabular-nums ${
                    lastResult.result.allowed
                      ? "bg-emerald-600 text-white"
                      : "bg-rose-600 text-white"
                  }`}
                >
                  {lastResult.result.trustScoreDelta >= 0 ? "+" : ""}
                  {lastResult.result.trustScoreDelta} Trust
                </span>
              </div>

              <p className="text-xs font-medium leading-relaxed opacity-90">
                {lastResult.result.allowed
                  ? "Tenant isolation verified, zero restricted PII detected, and RBAC permission scope satisfied."
                  : lastResult.result.violationReason}
              </p>

              {lastResult.result.triggerBoardTribunal && selectedAgent && (
                <button
                  type="button"
                  onClick={() => onSummonBoard(selectedAgent)}
                  className="pressable px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 shadow-sm"
                >
                  <Gavel className="w-3.5 h-3.5" />
                  Convene Octo-Board Tribunal for {lastResult.agentName}
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* RIGHT 5 COLS: COMPANY-WIDE GOVERNANCE AUDIT LOG */}
      <div className="lg:col-span-5 bg-white rounded-[24px] p-5 sm:p-6 ring-1 ring-slate-900/[0.06] shadow-surface flex flex-col justify-between space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200/80">
                Real-Time Ledger
              </span>
              <h3 className="font-display text-xl font-bold text-slate-900 mt-1 flex items-center gap-1.5">
                <Terminal className="w-4 h-4 text-slate-500" />
                Governance Audit Log ({auditLog.length})
              </h3>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap gap-1 bg-slate-100/90 p-1 rounded-xl">
            {(
              [
                { id: "all", label: `All (${auditLog.length})` },
                {
                  id: "blocked",
                  label: `Blocks (${
                    auditLog.filter(
                      (i) =>
                        i.outcome === "BLOCKED" ||
                        i.outcome === "WRITE_UP" ||
                        i.outcome === "FIRED"
                    ).length
                  })`,
                },
                {
                  id: "promotions",
                  label: `Promotions (${
                    auditLog.filter(
                      (i) => i.outcome === "PROMOTED" || i.outcome === "HIRED"
                    ).length
                  })`,
                },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setAuditFilter(tab.id)}
                className={`pressable flex-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold tabular-nums ${
                  auditFilter === tab.id
                    ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-900/[0.06]"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Audit Stream */}
          <div className="space-y-2.5 max-h-[540px] overflow-y-auto pr-1">
            {filteredAudit.length === 0 ? (
              <div className="p-6 rounded-2xl bg-slate-50 ring-1 ring-slate-200/70 text-center text-xs font-medium text-slate-500">
                No governance events match this filter yet. Run a sandbox test or trigger a Demo Director event.
              </div>
            ) : (
              filteredAudit.map((entry) => {
                const isBad =
                  entry.outcome === "BLOCKED" ||
                  entry.outcome === "WRITE_UP" ||
                  entry.outcome === "FIRED";
                const isGood =
                  entry.outcome === "PROMOTED" || entry.outcome === "ALLOWED";
                return (
                  <div
                    key={entry.id}
                    className={`p-3 rounded-2xl ring-1 space-y-1.5 ${
                      isBad
                        ? "bg-rose-50/60 ring-rose-200/80"
                        : isGood
                        ? "bg-emerald-50/50 ring-emerald-200/80"
                        : "bg-slate-50/80 ring-slate-900/[0.06]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className={`text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 ${
                            isBad
                              ? "bg-rose-600 text-white"
                              : isGood
                              ? "bg-emerald-600 text-white"
                              : entry.outcome === "RBAC_OVERRIDE"
                              ? "bg-amber-400 text-slate-950"
                              : "bg-sky-600 text-white"
                          }`}
                        >
                          {entry.outcome.replace("_", " ")}
                        </span>
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {entry.agentName}
                        </span>
                      </div>
                      <span className="text-[10px] font-medium text-slate-400 tabular-nums shrink-0">
                        {entry.timestamp}
                      </span>
                    </div>

                    <div className="text-xs font-semibold text-slate-800">
                      {entry.title}
                    </div>
                    <p className="text-[11px] font-normal text-slate-600 leading-relaxed">
                      {entry.detail}
                    </p>
                    <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 pt-0.5">
                      <span>
                        {entry.system} • {entry.department}
                      </span>
                      {typeof entry.trustDelta === "number" && (
                        <span
                          className={`tabular-nums ${
                            entry.trustDelta < 0
                              ? "text-rose-600"
                              : "text-emerald-700"
                          }`}
                        >
                          {entry.trustDelta >= 0 ? "+" : ""}
                          {entry.trustDelta} Trust
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-900 text-slate-200 text-[11px] font-medium flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            Every DLP block, RBAC override, and Board verdict is persisted and synced to the public Hashmeta Trust Portal.
          </span>
        </div>
      </div>
    </div>
  );
};

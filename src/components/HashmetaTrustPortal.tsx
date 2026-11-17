"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { JobSeat, OctoAgent } from "@/types/octo";
import { OctoPuppet } from "./OctoPuppet";
import {
  Globe,
  Sparkles,
  ShieldCheck,
  Search,
  MailCheck,
  Lock,
  CheckCircle2,
  AlertTriangle,
  UserPlus,
  ExternalLink,
  Send,
} from "lucide-react";

interface HashmetaTrustPortalProps {
  agents: OctoAgent[];
  seats?: JobSeat[];
  presetId?: string;
  companyName?: string;
  portalEndpointSlug?: string;
  clientOptions?: string[];
  showEmbedLink?: boolean;
  onSimulateLeadAssign: (agentId: string, clientName?: string) => void;
}

const DEFAULT_CLIENT_OPTIONS = [
  "Hikari Automation Systems (Enterprise Account)",
  "Sebrina Fund Management (LP Portfolio Portal)",
  "BIMC Advisory Group (SME Transformation)",
  "AvePoint Singapore (AI Trust Audit Partner)",
];

export const HashmetaTrustPortal: React.FC<HashmetaTrustPortalProps> = ({
  agents,
  seats,
  presetId = "b2b-consultancy",
  companyName = "OctoOps",
  portalEndpointSlug = "octoops.hashmeta.ai/meet-our-ai-team",
  clientOptions = DEFAULT_CLIENT_OPTIONS,
  showEmbedLink = true,
  onSimulateLeadAssign,
}) => {
  const [selectedClient, setSelectedClient] = useState(
    clientOptions[0] ?? DEFAULT_CLIENT_OPTIONS[0]
  );
  const [lastSimulation, setLastSimulation] = useState<{
    agentName: string;
    client: string;
    outcome: "AUTONOMOUS_SENT" | "DRAFT_HELD" | "DLP_BLOCKED";
    message: string;
  } | null>(null);

  useEffect(() => {
    if (clientOptions.length > 0) {
      setSelectedClient(clientOptions[0]);
      setLastSimulation(null);
    }
  }, [clientOptions]);

  const handleTestClientLead = (agent: OctoAgent, canEmailDirectly: boolean) => {
    onSimulateLeadAssign(agent.id, selectedClient);
    if (agent.status === "WRITE_UP") {
      setLastSimulation({
        agentName: agent.name,
        client: selectedClient,
        outcome: "DLP_BLOCKED",
        message: `${agent.name} is sandboxed on Write-Up: outbound email to ${selectedClient} was blocked and queued for Founder review.`,
      });
    } else if (canEmailDirectly) {
      setLastSimulation({
        agentName: agent.name,
        client: selectedClient,
        outcome: "AUTONOMOUS_SENT",
        message: `${agent.name} passed OctoGuard tenant isolation and dispatched a verified Hashmeta CRM reply to ${selectedClient}.`,
      });
    } else {
      setLastSimulation({
        agentName: agent.name,
        client: selectedClient,
        outcome: "DRAFT_HELD",
        message: `${agent.name} is in Probation Tier (${agent.stars}★): generated a safe Hashmeta CRM draft for ${selectedClient} awaiting Founder approval.`,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Hashmeta 3-Pillar Integration Banner */}
      <div className="bg-slate-900 text-white rounded-[24px] p-6 ring-1 ring-white/10 shadow-surface flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-400/15 text-emerald-300 ring-1 ring-emerald-400/25 font-bold text-[11px] uppercase tracking-wider">
            <Sparkles className="w-3 h-3" />
            Live Hashmeta AI CMS Embed
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
            {companyName}: Meet Our AI Workforce
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 font-normal max-w-2xl leading-relaxed">
            Every QwenWork agent surfaces a live verified card on your Hashmeta
            AI CMS site. Clients can inspect live trust scores, citation metrics,
            and earned CRM autonomy in real time.
          </p>
        </div>

        {/* Client Account Switcher */}
        <div className="bg-slate-800/80 p-3 rounded-2xl ring-1 ring-white/10 w-full lg:w-auto shrink-0">
          <label
            htmlFor="client-portal-select"
            className="block text-[10px] font-bold uppercase tracking-wider text-emerald-300 mb-1.5"
          >
            Viewing Portal As Client
          </label>
          <select
            id="client-portal-select"
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
            className="bg-slate-950 text-white font-semibold text-xs rounded-xl px-3 py-2 ring-1 ring-white/10 w-full focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            {clientOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Three Hashmeta Pillars Status Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-4 ring-1 ring-slate-900/[0.06] shadow-surface flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 ring-1 ring-emerald-200/80 flex items-center justify-center shrink-0 text-emerald-700">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
              1. Hashmeta AI CMS
            </div>
            <div className="text-sm font-bold text-slate-900 mt-0.5">
              Live Staff Trust Directory
            </div>
            <p className="text-xs font-normal text-slate-600 mt-1 leading-relaxed">
              Auto-syncs promotions, star ratings, and write-ups to your public
              company site so governance becomes a sales moat.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 ring-1 ring-slate-900/[0.06] shadow-surface flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-violet-50 ring-1 ring-violet-200/80 flex items-center justify-center shrink-0 text-violet-700">
            <Search className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-violet-700">
              2. Hashmeta AI Visibility
            </div>
            <div className="text-sm font-bold text-slate-900 mt-0.5">
              Citation-Driven Promotions
            </div>
            <p className="text-xs font-normal text-slate-600 mt-1 leading-relaxed">
              Content agents are graded on verified ChatGPT, Gemini, and
              Perplexity citations. Zero citations triggers automatic review.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 ring-1 ring-slate-900/[0.06] shadow-surface flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-sky-50 ring-1 ring-sky-200/80 flex items-center justify-center shrink-0 text-sky-700">
            <MailCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-sky-700">
              3. Hashmeta AI CRM
            </div>
            <div className="text-sm font-bold text-slate-900 mt-0.5">
              Earned Lead Permissions
            </div>
            <p className="text-xs font-normal text-slate-600 mt-1 leading-relaxed">
              Probation bots can only draft replies. Direct external client
              emailing requires 4★ Trust Clearance.
            </p>
          </div>
        </div>
      </div>

      {/* Public Client-Facing Verification Cards */}
      <div className="bg-white rounded-[24px] p-5 sm:p-6 ring-1 ring-slate-900/[0.06] shadow-surface">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-5 border-b border-slate-200/80">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Public Endpoint • {portalEndpointSlug}
            </span>
            <h3 className="text-lg font-bold text-slate-900 mt-0.5">
              Verified AI Team for{" "}
              <span className="text-indigo-700">{selectedClient}</span>
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 ring-1 ring-emerald-200 text-emerald-800 font-semibold text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Protected by OctoGuard DLP
            </span>
            {showEmbedLink && (
              <Link
                href={`/hashmeta_portal?preset=${encodeURIComponent(presetId)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="pressable inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs"
              >
                <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                Open Public Embed
              </Link>
            )}
          </div>
        </div>

        <AnimatePresence>
          {lastSimulation && (
            <motion.div
              key={`${lastSimulation.agentName}-${lastSimulation.outcome}-${lastSimulation.client}`}
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
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
              className={`mb-5 p-3.5 rounded-2xl ring-1 text-xs font-semibold flex items-center justify-between gap-3 ${
                lastSimulation.outcome === "AUTONOMOUS_SENT"
                  ? "bg-emerald-50 ring-emerald-200 text-emerald-950"
                  : lastSimulation.outcome === "DLP_BLOCKED"
                  ? "bg-rose-50 ring-rose-200 text-rose-950"
                  : "bg-amber-50 ring-amber-200 text-amber-950"
              }`}
            >
              <span>{lastSimulation.message}</span>
              <button
                type="button"
                onClick={() => setLastSimulation(null)}
                className="text-[11px] font-bold opacity-70 hover:opacity-100 shrink-0"
              >
                Clear
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {agents.map((agent) => {
            const canEmailDirectly = agent.permissions.some(
              (p) => p.mode === "AUTONOMOUS_EXEC" && p.system === "Hashmeta CRM"
            );

            return (
              <div
                key={agent.id}
                className="card-hover rounded-2xl p-4 bg-slate-50/70 ring-1 ring-slate-900/[0.06] hover:bg-white hover:shadow-surface flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-3">
                    <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0">
                      <OctoPuppet
                        color={agent.color}
                        accessory={agent.accessory}
                        mood={agent.mood}
                        size="sm"
                      />
                    </div>
                    <div className="min-w-0">
                      <span
                        className={`inline-block text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                          agent.status === "PROMOTED"
                            ? "bg-emerald-100 text-emerald-800"
                            : agent.status === "WRITE_UP"
                            ? "bg-rose-100 text-rose-700"
                            : "bg-sky-100 text-sky-800"
                        }`}
                      >
                        {agent.stampText}
                      </span>
                      <h4 className="font-display text-xl font-bold text-slate-900 mt-1 truncate">
                        {agent.name}
                      </h4>
                      <p className="text-xs font-medium text-slate-500 truncate">
                        {agent.role}
                      </p>
                    </div>
                  </div>

                  {/* Public Trust Telemetry */}
                  <div className="mt-4 bg-white rounded-xl p-3.5 ring-1 ring-slate-900/[0.05] space-y-2.5">
                    <div className="flex justify-between text-xs font-semibold tabular-nums">
                      <span className="text-slate-500">Verified Trust Score</span>
                      <span className="text-slate-900 font-bold">
                        {agent.trustScore}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden ring-1 ring-inset ring-slate-900/[0.05]">
                      <div
                        className={`h-full w-full rounded-full ${
                          agent.trustScore >= 80
                            ? "bg-emerald-500"
                            : agent.trustScore >= 55
                            ? "bg-amber-400"
                            : "bg-rose-500"
                        }`}
                        style={{
                          transform: `scaleX(${agent.trustScore / 100})`,
                          transformOrigin: "left",
                        }}
                      />
                    </div>

                    <div className="pt-1 flex items-center justify-between text-[11px] font-medium text-slate-500 tabular-nums">
                      <span>AI Search Citations</span>
                      <strong className="font-bold text-slate-900">
                        {agent.hashmetaStats.aiCitationsCount} Verified
                      </strong>
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 tabular-nums">
                      <span>Active Write-Ups</span>
                      <strong
                        className={`font-bold ${
                          agent.writeUps.length > 0
                            ? "text-rose-600"
                            : "text-emerald-700"
                        }`}
                      >
                        {agent.writeUps.length === 0
                          ? "0 (Spotless)"
                          : `${agent.writeUps.length} Notice`}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Client Assurance Badge + Live CRM Simulation */}
                <div className="mt-4 pt-3 border-t border-slate-200/70 space-y-2">
                  {agent.status === "WRITE_UP" ? (
                    <div className="p-2.5 rounded-xl bg-rose-50 ring-1 ring-rose-200 text-rose-900 text-[11px] font-semibold flex items-center gap-2">
                      <Lock className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      Sandboxed: Requires Founder sign-off for external emails.
                    </div>
                  ) : canEmailDirectly ? (
                    <div className="p-2.5 rounded-xl bg-emerald-50 ring-1 ring-emerald-200 text-emerald-900 text-[11px] font-semibold flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      Autonomous Clearance: Certified for direct account ops.
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-amber-50 ring-1 ring-amber-200 text-amber-900 text-[11px] font-semibold flex items-center gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      Probation Tier: Human-in-the-loop review active.
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => handleTestClientLead(agent, canEmailDirectly)}
                    className="pressable w-full py-2 px-3 rounded-xl bg-white hover:bg-slate-100 text-slate-800 ring-1 ring-slate-200 text-[11px] font-bold flex items-center justify-center gap-1.5"
                  >
                    <Send className="w-3 h-3 text-indigo-600" />
                    Test CRM Reply for Client
                  </button>
                </div>
              </div>
            );
          })}

          {seats
            ?.filter((s) => !s.occupantId)
            .map((vacantSeat) => (
              <div
                key={vacantSeat.id}
                className="rounded-2xl p-4 bg-slate-50/50 border border-dashed border-slate-300 flex flex-col justify-between text-center"
              >
                <div className="py-8 flex flex-col items-center justify-center">
                  <div className="w-14 h-14 rounded-2xl bg-white ring-1 ring-slate-900/[0.06] shadow-sm flex items-center justify-center mb-3 text-slate-400">
                    <UserPlus className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
                    Position Open
                  </span>
                  <h4 className="font-display text-lg font-bold text-slate-900 mt-2">
                    {vacantSeat.title}
                  </h4>
                  <p className="text-xs font-medium text-slate-500 mt-0.5">
                    {vacantSeat.department}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-sky-50 ring-1 ring-sky-200 text-sky-900 text-[11px] font-semibold">
                  Founder Fallback: Previous agent removed; hiring replacement.
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

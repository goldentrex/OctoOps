"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { HashmetaTrustPortal } from "@/components/HashmetaTrustPortal";
import { BUSINESS_PRESETS, buildPresetSnapshot } from "@/data/businessPresets";
import { isBoardMemberAgent } from "@/data/mockOctoData";
import { loadPersistedOctoState } from "@/lib/demoStorage";
import { JobSeat, OctoAgent } from "@/types/octo";
import { ArrowLeft, ShieldCheck } from "lucide-react";

function PublicHashmetaPortalContent() {
  const searchParams = useSearchParams();
  const initialPresetParam = searchParams.get("preset") ?? "b2b-consultancy";
  const [presetId, setPresetId] = useState<string>(initialPresetParam);
  const [seats, setSeats] = useState<JobSeat[]>(
    () => buildPresetSnapshot(initialPresetParam).seats
  );
  const [candidates, setCandidates] = useState<OctoAgent[]>(
    () => buildPresetSnapshot(initialPresetParam).candidates
  );
  const [isLiveSynced, setIsLiveSynced] = useState<boolean>(false);

  const preset =
    BUSINESS_PRESETS.find((p) => p.id === presetId) ?? BUSINESS_PRESETS[0];

  useEffect(() => {
    let cancelled = false;

    // M5: read from the server first (works across browsers / embedded sites),
    // then fall back to same-browser localStorage, then to static presets.
    const applyFallback = () => {
      if (cancelled) return;
      const persisted = loadPersistedOctoState();
      if (persisted && persisted.activePresetId === presetId) {
        setSeats(persisted.seats);
        setCandidates(persisted.candidates);
        setIsLiveSynced(true);
      } else {
        const snap = buildPresetSnapshot(presetId);
        setSeats(snap.seats);
        setCandidates(snap.candidates);
        setIsLiveSynced(false);
      }
    };

    fetch("/api/agents")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (data && data.presetId === presetId && Array.isArray(data.agents)) {
          setSeats(data.seats);
          setCandidates(data.agents);
          setIsLiveSynced(true);
        } else {
          applyFallback();
        }
      })
      .catch(applyFallback);

    return () => {
      cancelled = true;
    };
  }, [presetId]);

  const seatedAgents = seats
    .map((s) => candidates.find((c) => c.id === s.occupantId))
    .filter((a): a is OctoAgent => a !== undefined && !isBoardMemberAgent(a));

  return (
    <div className="min-h-screen bg-[#F4F7F9] bg-[radial-gradient(ellipse_at_top,_rgba(16,185,129,0.09),transparent_55%)] text-slate-900 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-5">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/85 backdrop-blur-md px-4 py-3 rounded-2xl ring-1 ring-slate-900/[0.06] shadow-surface">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="pressable inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Founder Console
            </Link>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Public Hashmeta AI CMS Embed</span>
              {isLiveSynced && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wide">
                  Live Synced
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            {BUSINESS_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPresetId(p.id)}
                className={`pressable px-2.5 py-1 rounded-lg text-xs font-semibold ${
                  p.id === preset.id
                    ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-900/[0.06]"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {p.categoryLabel}
              </button>
            ))}
          </div>
        </header>

        <HashmetaTrustPortal
          agents={seatedAgents}
          seats={seats}
          presetId={preset.id}
          companyName={preset.name}
          portalEndpointSlug={preset.portalEndpointSlug}
          clientOptions={preset.clientPortalAccounts}
          showEmbedLink={false}
          onSimulateLeadAssign={() => {}}
        />
      </div>
    </div>
  );
}

export default function HashmetaPortalPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F4F7F9] flex items-center justify-center text-sm font-semibold text-slate-500">
          Loading Hashmeta Trust Portal...
        </div>
      }
    >
      <PublicHashmetaPortalContent />
    </Suspense>
  );
}

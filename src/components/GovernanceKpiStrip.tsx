"use client";

// ============================================================================
// M5: live governance KPI strip fed by GET /api/metrics.
// Renders nothing when the API is unreachable (static demo keeps working).
// ============================================================================

import React, { useEffect, useState } from "react";
import { ShieldAlert, Zap, Timer, Inbox } from "lucide-react";

interface Metrics {
  actionsEvaluated: number;
  leaksBlocked: number;
  autonomyRate: number;
  guardLatencyP50Ms: number;
  pendingApprovals: number;
}

export const GovernanceKpiStrip: React.FC = () => {
  const [metrics, setMetrics] = useState<Metrics | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      fetch("/api/metrics")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (!cancelled && data && typeof data.actionsEvaluated === "number") {
            setMetrics(data);
          }
        })
        .catch(() => {});
    load();
    const interval = setInterval(load, 15000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (!metrics) return null;

  const tiles = [
    {
      label: "Leaks Blocked (server)",
      value: String(metrics.leaksBlocked),
      icon: <ShieldAlert className="w-3.5 h-3.5" />,
      tone: "text-rose-600 bg-rose-50 ring-rose-200/80",
    },
    {
      label: "Autonomy Rate",
      value: `${Math.round(metrics.autonomyRate * 100)}%`,
      icon: <Zap className="w-3.5 h-3.5" />,
      tone: "text-emerald-600 bg-emerald-50 ring-emerald-200/80",
    },
    {
      label: "Guard Latency p50",
      value: `${metrics.guardLatencyP50Ms} ms`,
      icon: <Timer className="w-3.5 h-3.5" />,
      tone: "text-sky-600 bg-sky-50 ring-sky-200/80",
    },
    {
      label: "Pending Approvals",
      value: String(metrics.pendingApprovals),
      icon: <Inbox className="w-3.5 h-3.5" />,
      tone: "text-amber-600 bg-amber-50 ring-amber-200/80",
    },
  ];

  return (
    <section
      aria-label="Live OctoGuard server telemetry"
      className="grid grid-cols-2 lg:grid-cols-4 gap-3"
    >
      {tiles.map((tile) => (
        <div
          key={tile.label}
          className="rounded-2xl bg-white/70 backdrop-blur-md px-4 py-2.5 ring-1 ring-slate-900/[0.05] shadow-surface flex items-center justify-between"
        >
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {tile.label}
            </div>
            <div className="font-display text-lg font-bold text-slate-900 tabular-nums mt-0.5">
              {tile.value}
            </div>
          </div>
          <div
            className={`w-8 h-8 rounded-xl ring-1 flex items-center justify-center ${tile.tone}`}
          >
            {tile.icon}
          </div>
        </div>
      ))}
    </section>
  );
};
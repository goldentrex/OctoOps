import { useCallback, useEffect, useState } from "react";
import { ShieldCheck, ShieldAlert, Download, RefreshCw, Database } from "lucide-react";

interface VerifyResult {
  valid: boolean;
  length: number;
  brokenAtSeq?: number;
  reason?: string;
}

/**
 * Online-only enhancement (beyond the local app): surfaces the LIVE server
 * governance ledger — persistence mode, tamper-evident hash-chain verification,
 * and a one-click IMDA / NIST / ISO 42001 compliance evidence export. The local
 * app is browser-only; here every action is recorded server-side and auditable.
 */
export function LiveLedgerToolbar() {
  const [persistence, setPersistence] = useState<string | null>(null);
  const [verify, setVerify] = useState<VerifyResult | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const [m, v] = await Promise.all([
        fetch("/api/metrics").then((r) => r.json()),
        fetch("/api/audit/verify").then((r) => r.json()),
      ]);
      setPersistence(m.persistence ?? "memory");
      setVerify(v);
    } catch {
      setPersistence(null);
      setVerify(null);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const exportEvidence = () => {
    window.open("/api/compliance/export", "_blank", "noopener");
  };

  const chainOk = verify?.valid === true;

  return (
    <div className="mb-4 rounded-[24px] bg-slate-900 text-slate-200 px-5 py-4 shadow-surface">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <Database className="w-4 h-4 text-emerald-400 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-bold text-white tracking-tight">
              Live governance ledger
            </p>
            <p className="text-[11px] font-medium text-slate-400">
              {persistence === "database"
                ? "Database-backed · every action persisted & hash-chained"
                : persistence === "memory"
                ? "In-memory demo mode · actions chained for this session"
                : "Connecting to the live engine…"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {verify && (
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ring-1 ${
                chainOk
                  ? "bg-emerald-500/15 text-emerald-300 ring-emerald-400/30"
                  : "bg-rose-500/15 text-rose-300 ring-rose-400/30"
              }`}
            >
              {chainOk ? (
                <ShieldCheck className="w-3.5 h-3.5" />
              ) : (
                <ShieldAlert className="w-3.5 h-3.5" />
              )}
              {chainOk
                ? `Chain verified · ${verify.length} events`
                : "Chain integrity issue"}
            </span>
          )}
          <button
            type="button"
            onClick={load}
            disabled={busy}
            className="pressable inline-flex items-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-200 font-semibold text-xs disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${busy ? "animate-spin" : ""}`} />
            Verify chain
          </button>
          <button
            type="button"
            onClick={exportEvidence}
            className="pressable inline-flex items-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs"
          >
            <Download className="w-3.5 h-3.5" />
            Export compliance evidence
          </button>
        </div>
      </div>
      <p className="text-[11px] font-medium text-slate-500 mt-2.5 leading-relaxed">
        Evidence pack maps the hash-chained audit log to IMDA MGF for Agentic AI v1.5,
        NIST AI RMF 1.0 and ISO/IEC 42001:2023 — each control cites real audit events.
        Self-assessment, not certification.
      </p>
    </div>
  );
}
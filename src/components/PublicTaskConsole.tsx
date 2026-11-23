import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PenLine, Mail, MessageSquare, ShieldCheck, ShieldAlert, Loader2, Sparkles, ArrowRight } from "lucide-react";

const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];

type Kind = "article" | "email_check" | "lead_reply";

interface Guard {
  verdict: string;
  stage: string;
  reasons: string[];
  mode?: string;
  trace?: { stage: string; status: string; detail?: string }[];
}
interface TaskResult {
  kind: Kind;
  agent: string;
  output?: string;
  guard: Guard;
  decisionId?: string;
}

const VERDICT_STYLE: Record<string, string> = {
  ALLOW: "bg-emerald-100 text-emerald-800 ring-emerald-300",
  DRAFT: "bg-sky-100 text-sky-800 ring-sky-300",
  HOLD: "bg-amber-100 text-amber-800 ring-amber-300",
  BLOCK: "bg-rose-100 text-rose-800 ring-rose-300",
};
const VERDICT_LABEL: Record<string, string> = {
  ALLOW: "Safe to send",
  DRAFT: "Saved as draft — needs approval",
  HOLD: "Held for founder review",
  BLOCK: "Blocked — not safe",
};

const TASKS: { kind: Kind; label: string; icon: typeof PenLine; blurb: string }[] = [
  { kind: "article", label: "Write a GEO article", icon: PenLine, blurb: "Inko researches & writes a publish-ready article, then OctoGuard clears it." },
  { kind: "email_check", label: "Is this email safe?", icon: Mail, blurb: "Paste an email; the guard checks tenant isolation, secrets & hallucinated claims." },
  { kind: "lead_reply", label: "Draft a lead reply", icon: MessageSquare, blurb: "Squidney drafts a reply to an inbound lead, governed by his earned autonomy." },
];

export function PublicTaskConsole() {
  const [kind, setKind] = useState<Kind>("article");
  const [topic, setTopic] = useState("How to stop an AI agent emailing the wrong client");
  const [emailTo, setEmailTo] = useState("david.tan@meridianrobotics.sg");
  const [emailBody, setEmailBody] = useState("Hi David, attaching our pricing deck for your review.");
  const [attachTenant, setAttachTenant] = useState("northlight-capital");
  const [leadMsg, setLeadMsg] = useState("Hi, we're a 12-person logistics firm. Can your AI agents handle our invoicing? What does it cost?");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<TaskResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    setResult(null);
    const input =
      kind === "article" ? { topic }
      : kind === "email_check" ? { to: emailTo, body: emailBody, recipientTenant: "meridian-robotics", attachments: attachTenant ? [{ name: "Pricing_Deck.pdf", tenant: attachTenant }] : [] }
      : { message: leadMsg };
    try {
      const r = await fetch("/api/public/task", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, input }) });
      const d = await r.json();
      if (!r.ok) setError(d.message || d.error || "Task failed");
      else setResult(d);
    } catch {
      setError("Network error — try again.");
    } finally {
      setBusy(false);
    }
  };

  const active = TASKS.find((t) => t.kind === kind)!;

  return (
    <div className="space-y-5">
      <div className="rounded-[24px] bg-slate-900 text-slate-200 px-5 py-4 shadow-surface">
        <h2 className="font-display text-lg font-bold text-white tracking-tight flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-emerald-400" /> Hire the governed workforce — no setup
        </h2>
        <p className="text-[12px] font-medium text-slate-400 mt-1">
          Submit a real task. A governed AI agent executes it through OctoGuard live and returns real output — earned autonomy, tenant isolation, and fact-checking included.
        </p>
      </div>

      {/* Task selector */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {TASKS.map((t) => {
          const Icon = t.icon;
          const on = t.kind === kind;
          return (
            <button key={t.kind} type="button" onClick={() => { setKind(t.kind); setResult(null); setError(null); }}
              className={`pressable text-left rounded-2xl px-4 py-3.5 ring-1 transition-colors ${on ? "bg-white ring-emerald-400 shadow-surface" : "bg-white/60 ring-slate-900/[0.06] hover:bg-white"}`}>
              <div className={`flex items-center gap-2 font-bold text-sm ${on ? "text-emerald-700" : "text-slate-700"}`}>
                <Icon className="w-4 h-4" /> {t.label}
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-1 leading-snug">{t.blurb}</p>
            </button>
          );
        })}
      </div>

      {/* Form */}
      <div className="bg-white rounded-[24px] p-5 ring-1 ring-slate-900/[0.06] shadow-surface space-y-3">
        {kind === "article" && (
          <label className="block">
            <span className="text-xs font-bold text-slate-600">Article topic</span>
            <input value={topic} onChange={(e) => setTopic(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-400" placeholder="e.g. Earned autonomy for AI agents" />
          </label>
        )}
        {kind === "email_check" && (
          <>
            <label className="block">
              <span className="text-xs font-bold text-slate-600">Recipient</span>
              <input value={emailTo} onChange={(e) => setEmailTo(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </label>
            <label className="block">
              <span className="text-xs font-bold text-slate-600">Email body</span>
              <textarea value={emailBody} onChange={(e) => setEmailBody(e.target.value)} rows={3} className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </label>
            <label className="block">
              <span className="text-xs font-bold text-slate-600">Attachment belongs to client (tenant)</span>
              <input value={attachTenant} onChange={(e) => setAttachTenant(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-400" placeholder="leave empty for no attachment" />
              <span className="text-[10.5px] text-slate-400 font-medium mt-1 block">Try a different client than the recipient to see the cross-client leak blocked.</span>
            </label>
          </>
        )}
        {kind === "lead_reply" && (
          <label className="block">
            <span className="text-xs font-bold text-slate-600">Inbound lead message</span>
            <textarea value={leadMsg} onChange={(e) => setLeadMsg(e.target.value)} rows={3} className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-400" />
          </label>
        )}
        <button type="button" onClick={submit} disabled={busy}
          className="pressable inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm disabled:opacity-60">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
          {busy ? "Agent working…" : `Run: ${active.label}`}
        </button>
        {error && <p className="text-xs font-semibold text-rose-600">{error}</p>}
      </div>

      {/* Result */}
      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="bg-white rounded-[24px] p-5 ring-1 ring-slate-900/[0.06] shadow-surface space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Agent:</span>
              <span className="text-sm font-bold text-slate-800">{result.agent}</span>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ring-1 ${VERDICT_STYLE[result.guard.verdict] || "bg-slate-100 text-slate-700 ring-slate-300"}`}>
                {result.guard.verdict === "ALLOW" ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                {result.guard.verdict} · {VERDICT_LABEL[result.guard.verdict] || result.guard.stage}
              </span>
              {result.guard.mode && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${result.guard.mode === "LIVE" ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-500"}`}>{result.guard.mode}</span>
              )}
            </div>

            {result.output && (
              <div className="rounded-2xl bg-slate-50 ring-1 ring-slate-900/[0.05] px-4 py-3 max-h-72 overflow-y-auto">
                <pre className="whitespace-pre-wrap text-[13px] text-slate-700 font-medium leading-relaxed font-sans">{result.output}</pre>
              </div>
            )}

            {result.guard.reasons?.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-600">Why:</p>
                {result.guard.reasons.map((r, i) => (
                  <p key={i} className="text-[12.5px] text-slate-600 font-medium flex gap-1.5"><span className="text-rose-500">•</span>{r}</p>
                ))}
              </div>
            )}

            {result.guard.trace && result.guard.trace.length > 0 && (
              <details className="text-[11px]">
                <summary className="cursor-pointer font-bold text-slate-500">Guard trace ({result.guard.trace.length} stages)</summary>
                <div className="mt-2 space-y-1">
                  {result.guard.trace.map((t, i) => (
                    <div key={i} className="flex gap-2 text-slate-500 font-medium">
                      <span className={t.status === "PASS" ? "text-emerald-600" : t.status === "FAIL" || t.status === "HOLD" ? "text-rose-600" : "text-slate-400"}>{t.status}</span>
                      <span className="font-bold">{t.stage}</span>
                      <span className="truncate">{t.detail}</span>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
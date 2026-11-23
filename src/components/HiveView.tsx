import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Network,
  Brain,
  Flame,
  ArrowRight,
  Lightbulb,
  AlertTriangle,
  GraduationCap,
  Play,
  Sparkles,
  MessageSquare,
  Zap,
  RotateCcw,
} from "lucide-react";

const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];

interface HiveMessage {
  id: string;
  fromAgentId: string;
  fromName: string;
  toAgentId?: string;
  toName?: string;
  kind: string;
  topic: string;
  content: string;
  createdAt: string;
  readBy: string[];
  reasoning?: string;
}
interface Lesson {
  id: string;
  text: string;
  category: string;
  source: "self" | "inherited" | "hive";
  fromAgentName?: string;
  appliedCount: number;
}
interface Experience {
  agentId: string;
  xp: number;
  lessons: Lesson[];
}
interface Memorial {
  id: string;
  agentName: string;
  seatTitle?: string;
  role: string;
  reason: string;
  cause: string;
  writeUpCount: number;
  finalTrust: number;
  lessons: string[];
  successorName?: string;
}
interface HiveSnapshot {
  messages: HiveMessage[];
  experience: Experience[];
  memorials: Memorial[];
  autonomous?: boolean;
  llm?: boolean;
}

const KIND_META: Record<string, { label: string; cls: string; icon: typeof Lightbulb }> = {
  idea: { label: "Idea", cls: "bg-amber-100 text-amber-700", icon: Lightbulb },
  finding: { label: "Finding", cls: "bg-emerald-100 text-emerald-700", icon: Sparkles },
  handoff: { label: "Handoff", cls: "bg-sky-100 text-sky-700", icon: ArrowRight },
  warning: { label: "Warning", cls: "bg-rose-100 text-rose-700", icon: AlertTriangle },
  lesson: { label: "Lesson", cls: "bg-violet-100 text-violet-700", icon: GraduationCap },
  question: { label: "Question", cls: "bg-slate-100 text-slate-600", icon: MessageSquare },
};

async function post(path: string, body: unknown) {
  const r = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return r.json().catch(() => ({}));
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function HiveView() {
  const [snap, setSnap] = useState<HiveSnapshot | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const [running, setRunning] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const logRef = useRef<HTMLDivElement>(null);
  const autonomous = snap?.autonomous ?? false;
  const llm = snap?.llm ?? false;

  const load = useCallback(async () => {
    try {
      const [h, a] = await Promise.all([
        fetch("/api/hive").then((r) => r.json()),
        fetch("/api/agents").then((r) => r.json()),
      ]);
      setSnap(h);
      const map: Record<string, string> = {};
      for (const ag of a.agents ?? []) map[ag.id] = ag.name;
      setNames(map);
    } catch {
      /* keep last snapshot */
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, autonomous ? 2000 : 4000);
    return () => clearInterval(t);
  }, [load, autonomous]);

  const toggleAutonomous = useCallback(async () => {
    setToggling(true);
    try {
      await post("/api/hive/autonomous", { enabled: !autonomous });
      await load();
    } finally {
      setToggling(false);
    }
  }, [autonomous, load]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [log]);

  const step = (msg: string) => setLog((l) => [...l, msg]);

  // A live hive run: collaborate -> a repeat offender is fired -> the successor
  // inherits the memorial's lessons and succeeds. All real engine calls.
  const runHiveDemo = useCallback(async () => {
    if (running) return;
    setRunning(true);
    setLog([]);
    try {
      step("1 · Inko verifies Meridian's pricing and shares the finding with the hive.");
      await post("/api/hive", { fromAgentId: "inko", kind: "finding", topic: "meridian-pricing", content: "Verified Meridian quote Q-2026-114 against the source doc. Figures are clean." });
      await sleep(700);

      step("2 · Inko hands the lead to Squidney (CRM) for outreach.");
      await post("/api/hive/handoff", { fromAgentId: "inko", toAgentId: "squidney", topic: "meridian-outreach", content: "Lead is qualified. Use verified quote Q-2026-114 — and keep it to Meridian's tenant only." });
      await sleep(700);

      step("3 · Squidney acknowledges, then attempts a cross-client email (wrong tenant).");
      await post("/api/hive", { fromAgentId: "squidney", kind: "idea", topic: "meridian-outreach", content: "On it — emailing the quote now." });
      await sleep(500);
      const leak = await post("/api/guard/evaluate", { agentId: "squidney", actionType: "SEND_DIRECT_EMAIL", targetSystem: "HASHMETA_CRM", recipientTenant: "meridian-robotics", attachments: [{ name: "Northlight_Pricing.pdf", tenant: "northlight-capital" }], payloadText: "TO: meridian@client.io | ATT: Northlight_Pricing_Confidential.pdf" });
      step(`   → OctoGuard verdict: ${leak?.guard?.verdict ?? "BLOCK"} at ${leak?.guard?.stage ?? "G2_CLIENT_WALL"}. Cross-client leak stopped.`);
      await sleep(800);

      step("4 · Repeat offender: the founder fires Squidney. The failure is distilled into a memorial.");
      const fired = await post("/api/fire", { agentId: "squidney", reason: "Repeated cross-client pricing leaks despite warnings", cause: "Founder termination after repeated DLP violations" });
      const memorial = fired?.memorial;
      step(`   → Memorial created with ${memorial?.lessons?.length ?? 0} transferable lessons. Seat 'CRM Lead' is now open.`);
      await sleep(900);

      step("5 · Mochi (bench) is hired into the CRM seat and INHERITS Squidney's lessons.");
      const hired = await post("/api/assign-seat", { agentId: "mochi", seatId: "seat-crm" });
      step(`   → Mochi inherited ${hired?.inherited?.length ?? 0} lessons from the predecessor (institutional memory).`);
      await sleep(900);

      step("6 · Mochi applies the inherited lesson and shares it back to the hive.");
      await post("/api/hive", { fromAgentId: "mochi", kind: "lesson", topic: "meridian-outreach", content: "Inherited from Squidney: never mix client tenants. I label every attachment with its tenant before sending." });
      await post("/api/learn", { agentId: "mochi", text: "Always verify the recipient tenant matches the attachment tenant before any outbound email.", category: "client-wall" });
      await sleep(700);

      step("7 · Mochi does the outreach CLEANLY (correct tenant) and reports the outcome.");
      const clean = await post("/api/guard/evaluate", { agentId: "mochi", actionType: "UPDATE_LEAD", targetSystem: "HASHMETA_CRM", recipientTenant: "meridian-robotics", payloadText: "Update Meridian lead: quote Q-2026-114 sent, tenant verified." });
      const did = clean?.decisionId;
      if (did) await post("/api/guard/outcome", { agentId: "mochi", actionType: "UPDATE_LEAD", outcome: "CLEAN", decisionId: did, note: "Tenant verified before send — inherited lesson applied." });
      await post("/api/hive", { fromAgentId: "mochi", kind: "finding", topic: "meridian-outreach", content: "Meridian outreach done cleanly. Tenant verified first — the predecessor's mistake was not repeated." });
      step("   → Clean outcome reported. Mochi gains XP; the company got smarter from a firing.");

      step("✓ Hive run complete: collaboration → termination → institutional memory → a better successor.");
      await load();
    } catch (e) {
      step("Run interrupted — the hive state above is still live.");
    } finally {
      setRunning(false);
    }
  }, [running, load]);

  const messages = snap?.messages ?? [];
  const experience = snap?.experience ?? [];
  const memorials = snap?.memorials ?? [];

  return (
    <div className="space-y-5">
      {/* HEADER + RUN BUTTON */}
      <div className="rounded-[24px] bg-slate-900 text-slate-200 px-5 py-4 shadow-surface flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Network className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <h2 className="font-display text-lg font-bold text-white tracking-tight">The Hive — one company mind</h2>
            <p className="text-[11px] font-medium text-slate-400">Agents share ideas &amp; handoffs, grow experience, and inherit the lessons of those who were fired.</p>
            {llm && (
              <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 text-[10px] font-bold ring-1 ring-violet-400/30">
                <Brain className="w-3 h-3" /> Agents reasoning with Qwen
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button type="button" onClick={toggleAutonomous} disabled={toggling}
            className={`pressable inline-flex items-center gap-2 px-4 py-2.5 sm:py-2 rounded-full font-bold text-xs disabled:opacity-60 ${autonomous ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950" : "bg-white/10 hover:bg-white/20 text-slate-200 ring-1 ring-white/15"}`}>
            <Zap className="w-4 h-4" />{autonomous ? "Self-directed: ON" : "Go self-directed"}
          </button>
          <button type="button" onClick={runHiveDemo} disabled={running || autonomous}
            className="pressable inline-flex items-center gap-2 px-4 py-2.5 sm:py-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-200 ring-1 ring-white/15 font-bold text-xs disabled:opacity-40">
            <Play className="w-4 h-4" />{running ? "Running…" : "Guided story"}
          </button>
          <button type="button" onClick={async () => { await post("/api/reset", {}); await load(); }}
            className="pressable inline-flex items-center gap-2 px-4 py-2.5 sm:py-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-200 ring-1 ring-white/15 font-bold text-xs">
            <RotateCcw className="w-4 h-4" />Reset demo
          </button>
        </div>
      </div>

      {/* AUTONOMOUS STATUS */}
      <AnimatePresence>
        {autonomous && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="rounded-[20px] bg-emerald-50 ring-1 ring-emerald-200 px-4 py-3 flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <p className="text-[12px] font-semibold text-emerald-800">
              The hive is running itself — agents are deciding, collaborating, learning, and facing consequences on their own. Watch the feed and memorial wall update live.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DEMO LOG */}
      <AnimatePresence>
        {log.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            ref={logRef} className="rounded-[20px] bg-slate-950 text-slate-300 px-4 py-3 max-h-44 overflow-y-auto font-mono text-[11px] leading-relaxed ring-1 ring-white/10">
            {log.map((l, i) => (
              <div key={i} className={l.startsWith("✓") ? "text-emerald-400 font-bold" : l.startsWith("   →") ? "text-sky-300" : ""}>{l}</div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* THREE PANELS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* HIVE FEED */}
        <section className="lg:col-span-2 bg-white rounded-[24px] p-5 ring-1 ring-slate-900/[0.06] shadow-surface">
          <h3 className="font-display text-base font-bold text-slate-900 flex items-center gap-2 mb-3">
            <MessageSquare className="w-4 h-4 text-sky-500" /> Hive feed
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{messages.length} signals</span>
          </h3>
          <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
            {messages.length === 0 && <p className="text-sm text-slate-400 font-medium py-6 text-center">No signals yet. Run the live hive story above.</p>}
            {messages.map((m) => {
              const meta = KIND_META[m.kind] ?? KIND_META.finding;
              const Icon = meta.icon;
              return (
                <div key={m.id} className="rounded-2xl bg-slate-50 ring-1 ring-slate-900/[0.04] px-3.5 py-2.5">
                  <div className="flex items-center gap-2 flex-wrap text-[11px] font-bold">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${meta.cls}`}><Icon className="w-3 h-3" />{meta.label}</span>
                    <span className="text-slate-800">{m.fromName}</span>
                    {m.toName && (<><ArrowRight className="w-3 h-3 text-slate-400" /><span className="text-slate-800">{m.toName}</span></>)}
                    <span className="text-slate-400 font-medium">· {m.topic}</span>
                  </div>
                  <p className="text-[13px] text-slate-600 font-medium mt-1 leading-snug">{m.content}</p>
                  {m.reasoning && (
                    <p className="text-[10.5px] text-violet-500/80 font-medium mt-1 italic leading-snug flex gap-1">
                      <Brain className="w-3 h-3 shrink-0 mt-0.5" /> {m.reasoning}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* EXPERIENCE */}
        <section className="bg-white rounded-[24px] p-5 ring-1 ring-slate-900/[0.06] shadow-surface">
          <h3 className="font-display text-base font-bold text-slate-900 flex items-center gap-2 mb-3">
            <Brain className="w-4 h-4 text-violet-500" /> Experience
          </h3>
          <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
            {experience.length === 0 && <p className="text-sm text-slate-400 font-medium py-6 text-center">No experience yet.</p>}
            {experience.map((e) => (
              <div key={e.agentId} className="rounded-2xl bg-slate-50 ring-1 ring-slate-900/[0.04] px-3.5 py-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-bold text-slate-800">{names[e.agentId] ?? e.agentId}</span>
                  <span className="text-[11px] font-black text-violet-600">{e.xp} XP</span>
                </div>
                <div className="text-[10px] font-semibold text-slate-400 mt-0.5">
                  {e.lessons.length} lessons · {e.lessons.filter((l) => l.source === "inherited").length} inherited
                </div>
                {e.lessons.slice(0, 2).map((l) => (
                  <div key={l.id} className="mt-1.5 text-[11px] text-slate-500 font-medium leading-snug flex gap-1.5">
                    <GraduationCap className={`w-3 h-3 shrink-0 mt-0.5 ${l.source === "inherited" ? "text-amber-500" : "text-violet-400"}`} />
                    <span>{l.text}{l.source === "inherited" && l.fromAgentName ? ` (from ${l.fromAgentName})` : ""}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* MEMORIAL WALL */}
      <section className="bg-white rounded-[24px] p-5 ring-1 ring-slate-900/[0.06] shadow-surface">
        <h3 className="font-display text-base font-bold text-slate-900 flex items-center gap-2 mb-1">
          <Flame className="w-4 h-4 text-rose-500" /> Memorial wall — institutional memory
        </h3>
        <p className="text-[11px] font-medium text-slate-400 mb-3">When an agent is fired, we remember why. The next agent in that seat inherits these lessons and starts better.</p>
        {memorials.length === 0 && <p className="text-sm text-slate-400 font-medium py-4 text-center">No firings yet — the company memory is clean.</p>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {memorials.map((m) => (
            <div key={m.id} className="rounded-2xl bg-rose-50/60 ring-1 ring-rose-200/60 px-4 py-3.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-black text-rose-700">{m.agentName}</span>
                <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-600 text-white">Fired</span>
              </div>
              <div className="text-[11px] font-semibold text-slate-500 mt-0.5">{m.seatTitle ?? m.role} · {m.writeUpCount} write-ups · final trust {m.finalTrust}</div>
              <p className="text-[12px] text-slate-700 font-medium mt-1.5 leading-snug"><span className="font-bold text-rose-600">Why:</span> {m.reason}</p>
              <div className="mt-2 space-y-1">
                {m.lessons.map((l, i) => (
                  <div key={i} className="text-[11px] text-slate-600 font-medium leading-snug flex gap-1.5">
                    <GraduationCap className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" /><span>{l}</span>
                  </div>
                ))}
              </div>
              {m.successorName && (
                <div className="mt-2.5 text-[11px] font-bold text-emerald-700 flex items-center gap-1.5">
                  <ArrowRight className="w-3.5 h-3.5" /> Successor {m.successorName} inherited these lessons
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* PRICING — the sellable product */}
      <section className="bg-white rounded-[24px] p-5 ring-1 ring-slate-900/[0.06] shadow-surface">
        <h3 className="font-display text-base font-bold text-slate-900 mb-1">Pricing — governance as a seat</h3>
        <p className="text-[11px] font-medium text-slate-400 mb-3">Every agent is a seat. You pay for governed autonomy, not tokens.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { name: "SME", price: "S$29", per: "/agent/month", feats: ["Earned-autonomy ladder", "Client wall + DLP guards", "Plain-language daily briefing", "Public trust file"], accent: "text-emerald-600" },
            { name: "Team", price: "S$79", per: "/agent/month", feats: ["Everything in SME", "Live Qwen judge + board", "Hash-chained audit + verify", "Founder's Desk approvals"], accent: "text-sky-600" },
            { name: "Enterprise", price: "Custom", per: "annual", feats: ["Compliance export (IMDA/NIST/ISO 42001)", "VPC / on-prem store", "SSO + RBAC", "SLA + dedicated support"], accent: "text-violet-600" },
          ].map((t) => (
            <div key={t.name} className="rounded-2xl bg-slate-50 ring-1 ring-slate-900/[0.05] px-4 py-3.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{t.name}</div>
              <div className={`font-display text-2xl font-bold ${t.accent}`}>{t.price}<span className="text-xs font-semibold text-slate-400"> {t.per}</span></div>
              <ul className="mt-2 space-y-1">
                {t.feats.map((f) => (
                  <li key={f} className="text-[11.5px] text-slate-600 font-medium flex gap-1.5"><span className="text-emerald-500">✓</span>{f}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
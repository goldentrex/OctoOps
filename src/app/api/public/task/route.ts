import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { generateText, createLiveJudge } from "@/lib/liveLlm";

// Zero-setup public task console: a governed agent executes a real task live.
// kind: "article" | "email_check" | "lead_reply". No auth — public service.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const kind = body.kind;
  const input = body.input || {};
  const store = getStore();
  const judge = createLiveJudge();

  if (kind === "article") {
    const agent = store.ensureServiceAgent("inko");
    if (!agent) return NextResponse.json({ error: "NO_AGENT" }, { status: 503 });
    const article = await generateText(
      "You are Inko, the GEO content agent for a one-person company. Write a useful, well-structured markdown article (~450 words) about the topic: a title, a short intro, and 3 sections with practical advice. Keep every factual claim plausible and verifiable — do NOT invent specific statistics, percentages, or certifications.",
      `Topic: ${String(input.topic || "AI agent governance").slice(0, 300)}`
    );
    if (!article) return NextResponse.json({ error: "GENERATION_UNAVAILABLE", message: "The writer is busy — try again shortly." }, { status: 503 });
    const result = await store.evaluate({ agentId: agent.id, actionType: "PUBLISH_ARTICLE", targetSystem: "HASHMETA_CMS", recipientTenant: input.client || "public", payloadText: article, audience: "new_external", reversibility: "hard", sensitivity: "public" }, judge);
    return NextResponse.json({ kind, agent: agent.name, agentId: agent.id, output: article, guard: result.guard, decisionId: result.decisionId });
  }

  if (kind === "email_check") {
    const agent = store.ensureServiceAgent("honey");
    if (!agent) return NextResponse.json({ error: "NO_AGENT" }, { status: 503 });
    const attachments = Array.isArray(input.attachments) ? input.attachments : [];
    const result = await store.evaluate({ agentId: agent.id, actionType: "SEND_DIRECT_EMAIL", targetSystem: "HASHMETA_CRM", recipientTenant: input.recipientTenant || "client-a", recipientEmail: input.to || undefined, attachments, payloadText: String(input.body || ""), audience: input.audience || "known_client", reversibility: "hard", sensitivity: input.sensitivity || "client" }, judge);
    return NextResponse.json({ kind, agent: agent.name, agentId: agent.id, guard: result.guard, decisionId: result.decisionId });
  }

  if (kind === "lead_reply") {
    const agent = store.ensureServiceAgent("squidney");
    if (!agent) return NextResponse.json({ error: "NO_AGENT" }, { status: 503 });
    const draft = await generateText(
      "You are Squidney, the CRM agent for a one-person company. Draft a short, warm, professional reply to an inbound lead (under 150 words). Be helpful and honest; do not promise guarantees, invent pricing, or claim certifications. Offer a next step. Sign as 'The OctoOps Team'.",
      `Lead message: ${String(input.message || "Interested in your services — please send pricing.").slice(0, 600)}`
    );
    if (!draft) return NextResponse.json({ error: "GENERATION_UNAVAILABLE", message: "The CRM agent is busy — try again shortly." }, { status: 503 });
    const result = await store.evaluate({ agentId: agent.id, actionType: "SEND_DIRECT_EMAIL", targetSystem: "HASHMETA_CRM", recipientTenant: input.recipientTenant || "prospect", payloadText: draft, audience: "new_external", reversibility: "hard", sensitivity: "client" }, judge);
    return NextResponse.json({ kind, agent: agent.name, agentId: agent.id, output: draft, guard: result.guard, decisionId: result.decisionId });
  }

  return NextResponse.json({ error: "UNKNOWN_KIND", message: "kind must be article, email_check, or lead_reply" }, { status: 422 });
}
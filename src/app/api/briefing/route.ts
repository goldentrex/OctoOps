import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { generateBriefing, approvalSummary } from "@/lib/governance/briefing";

export async function GET(req: NextRequest) {
  const hours = Math.min(168, Math.max(1, Number(req.nextUrl.searchParams.get("hours") ?? 24)));
  const store = getStore();
  const pending = store.listApprovals("PENDING").map((a) => ({
    id: a.id,
    agentName: a.agentName,
    summary: approvalSummary(a.action.actionType, a.action.payloadText),
  }));
  const briefing = generateBriefing(store.listAudit(), pending, Date.now(), hours);
  return NextResponse.json(briefing);
}
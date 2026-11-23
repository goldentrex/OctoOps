import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/store";

// Founder endorses/overrides a board verdict -> judge believability weights update.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const result = getStore().recordBoardFeedback(body.agentId, Boolean(body.agrees), body.overrideVote);
  return NextResponse.json(result, { status: result.ok ? 200 : 422 });
}

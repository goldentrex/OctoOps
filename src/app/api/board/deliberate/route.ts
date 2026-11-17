import { NextRequest, NextResponse } from "next/server";
import { checkWriteAuth, parseBody } from "@/lib/api/auth";
import { boardDeliberateSchema } from "@/lib/api/schemas";
import { getStore } from "@/lib/store";

export async function POST(req: NextRequest) {
  const auth = checkWriteAuth(req);
  if (auth) return auth;
  const parsed = await parseBody(req, boardDeliberateSchema);
  if ("response" in parsed) return parsed.response;
  const reviewCase = getStore().getBoardCase(parsed.data.agentId);
  if (!reviewCase) {
    return NextResponse.json({ error: "NOT_FOUND", message: "Unknown agent." }, { status: 404 });
  }
  // M4 replaces this with the live Qwen board; scripted fallback stays.
  return NextResponse.json({ mode: "SCRIPTED", reviewCase });
}
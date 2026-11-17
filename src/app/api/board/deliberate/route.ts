import { NextRequest, NextResponse } from "next/server";
import { checkWriteAuth, parseBody } from "@/lib/api/auth";
import { boardDeliberateSchema } from "@/lib/api/schemas";
import { deliberateBoard } from "@/lib/llm/board";
import { getStore } from "@/lib/store";

export async function POST(req: NextRequest) {
  const auth = checkWriteAuth(req);
  if (auth) return auth;
  const parsed = await parseBody(req, boardDeliberateSchema);
  if ("response" in parsed) return parsed.response;
  const result = await deliberateBoard(getStore(), parsed.data.agentId);
  if (!result) {
    return NextResponse.json({ error: "NOT_FOUND", message: "Unknown agent." }, { status: 404 });
  }
  return NextResponse.json(result);
}
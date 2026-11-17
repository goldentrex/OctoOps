import { NextRequest, NextResponse } from "next/server";
import { checkWriteAuth, parseBody } from "@/lib/api/auth";
import { outcomeSchema } from "@/lib/api/schemas";
import { getStore } from "@/lib/store";

export async function POST(req: NextRequest) {
  const auth = checkWriteAuth(req);
  if (auth) return auth;
  const parsed = await parseBody(req, outcomeSchema);
  if ("response" in parsed) return parsed.response;
  const result = getStore().reportOutcome(parsed.data);
  if (!result.ok) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "Unknown agent or capability." },
      { status: 404 }
    );
  }
  return NextResponse.json(result);
}
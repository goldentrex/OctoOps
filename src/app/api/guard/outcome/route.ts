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
    const status = result.error === "UNKNOWN_AGENT" || result.error === "NO_CAPABILITY" ? 404 : 422;
    return NextResponse.json(
      { error: result.error ?? "REJECTED", message: "Outcome rejected by scoring-integrity rules." },
      { status }
    );
  }
  return NextResponse.json(result);
}
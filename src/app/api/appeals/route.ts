import { NextRequest, NextResponse } from "next/server";
import { checkWriteAuth, parseBody } from "@/lib/api/auth";
import { fileAppealSchema } from "@/lib/api/schemas";
import { getStore } from "@/lib/store";

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get("status");
  const valid = status && ["PENDING", "UPHELD", "OVERTURNED"].includes(status);
  return NextResponse.json({ appeals: getStore().getAppeals(valid ? (status as "PENDING") : undefined) });
}

export async function POST(req: NextRequest) {
  const auth = checkWriteAuth(req);
  if (auth) return auth;
  const parsed = await parseBody(req, fileAppealSchema);
  if ("response" in parsed) return parsed.response;
  const result = getStore().fileAppeal(parsed.data);
  return NextResponse.json(result, { status: result.ok ? 200 : 422 });
}
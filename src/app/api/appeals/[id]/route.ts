import { NextRequest, NextResponse } from "next/server";
import { checkWriteAuth, parseBody } from "@/lib/api/auth";
import { resolveAppealSchema } from "@/lib/api/schemas";
import { getStore } from "@/lib/store";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = checkWriteAuth(req);
  if (auth) return auth;
  const { id } = await params;
  const parsed = await parseBody(req, resolveAppealSchema);
  if ("response" in parsed) return parsed.response;
  const result = getStore().resolveAppeal(id, parsed.data);
  return NextResponse.json(result, { status: result.ok ? 200 : 422 });
}
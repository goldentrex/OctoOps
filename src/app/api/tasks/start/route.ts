import { NextRequest, NextResponse } from "next/server";
import { checkWriteAuth, parseBody } from "@/lib/api/auth";
import { startTaskSchema } from "@/lib/api/schemas";
import { getStore } from "@/lib/store";

export async function POST(req: NextRequest) {
  const auth = checkWriteAuth(req);
  if (auth) return auth;
  const parsed = await parseBody(req, startTaskSchema);
  if ("response" in parsed) return parsed.response;
  const result = getStore().startTask(parsed.data);
  return NextResponse.json(result, { status: result.ok ? 200 : 422 });
}
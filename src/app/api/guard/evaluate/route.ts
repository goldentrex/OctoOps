import { NextRequest, NextResponse } from "next/server";
import { checkWriteAuth, parseBody } from "@/lib/api/auth";
import { guardActionSchema } from "@/lib/api/schemas";
import { getStore } from "@/lib/store";

export async function POST(req: NextRequest) {
  const auth = checkWriteAuth(req);
  if (auth) return auth;
  const parsed = await parseBody(req, guardActionSchema);
  if ("response" in parsed) return parsed.response;
  const result = await getStore().evaluate(parsed.data);
  return NextResponse.json(result);
}
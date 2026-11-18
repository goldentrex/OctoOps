import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/store";

export async function GET(req: NextRequest) {
  const agentId = req.nextUrl.searchParams.get("agentId") ?? undefined;
  return NextResponse.json({ tasks: getStore().getTasks(agentId) });
}
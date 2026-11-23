import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/store";

// The hive: shared company mind. GET = snapshot (messages + experience + memorials).
// POST = an agent posts a message (idea / finding / handoff / warning / lesson).
export async function GET() {
  const store = getStore();
  return NextResponse.json({ ...store.getHiveSnapshot(), autonomous: store.autonomous });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const result = getStore().postHive(body);
  return NextResponse.json(result, { status: result.ok ? 200 : 422 });
}
import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/store";

// Self-directed hive toggle. The continuous tick loop runs in the QwenWork Page
// deployment (server.mjs); here we persist the flag on the store.
export async function GET() {
  return NextResponse.json({ enabled: getStore().autonomous });
}
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const store = getStore();
  store.autonomous = Boolean(body.enabled);
  return NextResponse.json({ enabled: store.autonomous });
}

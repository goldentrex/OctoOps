import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { explain } from "@/lib/governance/trust";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const file = getStore().getAgentFile(id);
  if (!file) {
    return NextResponse.json({ error: "NOT_FOUND", message: `Unknown agent ${id}.` }, { status: 404 });
  }
  const now = Date.now();
  return NextResponse.json({
    ...file,
    explanations: file.capabilities.map((c) => explain(c.trust, now)),
  });
}
import { NextRequest, NextResponse } from "next/server";
import { checkWriteAuth, parseBody } from "@/lib/api/auth";
import { approvalResolutionSchema } from "@/lib/api/schemas";
import { getStore } from "@/lib/store";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = checkWriteAuth(req);
  if (auth) return auth;
  const { id } = await params;
  const parsed = await parseBody(req, approvalResolutionSchema);
  if ("response" in parsed) return parsed.response;
  const result = await getStore().resolveApproval(id, parsed.data);
  if (!result) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "Approval not found or already resolved." },
      { status: 404 }
    );
  }
  return NextResponse.json(result);
}
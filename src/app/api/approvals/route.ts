import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import type { ApprovalItem } from "@/lib/store/types";

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get("status") as ApprovalItem["status"] | null;
  const valid = status && ["PENDING", "APPROVED", "REJECTED", "EDITED"].includes(status);
  return NextResponse.json({ approvals: getStore().listApprovals(valid ? status : undefined) });
}
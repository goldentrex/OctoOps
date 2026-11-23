import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";

// Believability weights learned from founder corrections.
export async function GET() {
  return NextResponse.json(getStore().getJudgeStats());
}

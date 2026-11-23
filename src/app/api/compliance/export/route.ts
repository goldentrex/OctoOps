import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import {
  collectComplianceInput,
  renderComplianceJson,
  renderComplianceMarkdown,
} from "@/lib/governance/compliance";
import { isQwenConfigured } from "@/lib/llm/qwen";

export async function GET(req: NextRequest) {
  const format = req.nextUrl.searchParams.get("format") === "json" ? "json" : "md";
  const input = collectComplianceInput(getStore(), isQwenConfigured() ? "LIVE" : "SCRIPTED");
  if (format === "json") {
    return NextResponse.json(renderComplianceJson(input));
  }
  const md = renderComplianceMarkdown(input);
  return new NextResponse(md, {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "content-disposition": `attachment; filename="octoops-compliance-${new Date().toISOString().slice(0, 10)}.md"`,
    },
  });
}
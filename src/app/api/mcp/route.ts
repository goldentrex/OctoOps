// ============================================================================
// MCP Streamable HTTP endpoint (stateless, JSON responses).
// Auth: same bearer OCTOGUARD_API_TOKEN as the REST write routes;
// localhost-only when the token is unset.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { checkWriteAuth } from "@/lib/api/auth";
import { createQwenJudge } from "@/lib/llm/judge";
import { buildOctoGuardMcpServer } from "@/lib/mcp/server";
import { getStore } from "@/lib/store";

export async function POST(req: NextRequest) {
  const auth = checkWriteAuth(req);
  if (auth) return auth;

  const server = buildOctoGuardMcpServer(getStore(), createQwenJudge());
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless: no session tracking
    enableJsonResponse: true, // plain JSON instead of SSE streams
  });
  try {
    await server.connect(transport);
    return await transport.handleRequest(req);
  } finally {
    await server.close();
  }
}

export async function GET() {
  return NextResponse.json(
    { error: "METHOD_NOT_ALLOWED", message: "Stateless MCP server: use POST with JSON-RPC." },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: "METHOD_NOT_ALLOWED", message: "Stateless MCP server: no sessions to terminate." },
    { status: 405 }
  );
}
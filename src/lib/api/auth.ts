// ============================================================================
// API auth + request validation helpers (M2).
// Write routes: bearer OCTOGUARD_API_TOKEN. If unset, localhost only.
// Read routes stay public so the Hashmeta trust portal can embed them.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";

export function checkWriteAuth(req: NextRequest): NextResponse | null {
  const token = process.env.OCTOGUARD_API_TOKEN;
  if (token) {
    const header = req.headers.get("authorization") ?? "";
    if (header === `Bearer ${token}`) return null;
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "Missing or invalid bearer token." },
      { status: 401 }
    );
  }
  const host = (req.headers.get("host") ?? "").split(":")[0];
  if (host === "localhost" || host === "127.0.0.1" || host === "[::1]" || host === "::1") {
    return null;
  }
  return NextResponse.json(
    {
      error: "FORBIDDEN",
      message: "OCTOGUARD_API_TOKEN is unset; write routes are restricted to localhost.",
    },
    { status: 403 }
  );
}

export async function parseBody<T>(
  req: NextRequest,
  schema: ZodType<T>
): Promise<{ data: T } | { response: NextResponse }> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return {
      response: NextResponse.json(
        { error: "BAD_REQUEST", message: "Body must be valid JSON." },
        { status: 400 }
      ),
    };
  }
  try {
    return { data: schema.parse(raw) };
  } catch (err) {
    if (err instanceof ZodError) {
      return {
        response: NextResponse.json(
          { error: "VALIDATION", message: "Invalid request body.", issues: err.issues },
          { status: 422 }
        ),
      };
    }
    throw err;
  }
}
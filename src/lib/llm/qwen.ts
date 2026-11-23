// ============================================================================
// Qwen client (M4) — OpenAI-compatible endpoint. Env only, never committed:
//   QWEN_API_KEY, QWEN_BASE_URL, QWEN_MODEL_FAST, QWEN_MODEL_STRONG
// Timeouts + one retry + zod-validated JSON output. With no key everything
// upstream falls back to scripted mode; the demo never dies.
// ============================================================================

import OpenAI from "openai";
import type { ZodType } from "zod";

export const BOARD_TIMEOUT_MS = 12_000;
const JUDGE_TIMEOUT_MS = 8_000;

export function isQwenConfigured(): boolean {
  return Boolean(process.env.QWEN_API_KEY);
}

export function qwenModels() {
  return {
    fast: process.env.QWEN_MODEL_FAST || "qwen-flash",
    strong: process.env.QWEN_MODEL_STRONG || "qwen-plus",
    baseUrl:
      process.env.QWEN_BASE_URL ||
      "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
  };
}

let client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI({
      apiKey: process.env.QWEN_API_KEY,
      baseURL: qwenModels().baseUrl,
    });
  }
  return client;
}

export interface QwenJsonOptions<T> {
  model: string;
  system: string;
  user: string;
  schema: ZodType<T>;
  timeoutMs?: number;
}

/** One retry, hard timeout, JSON-object response, zod validation. Null on failure. */
export async function callQwenJson<T>(opts: QwenJsonOptions<T>): Promise<T | null> {
  if (!isQwenConfigured()) return null;
  const timeoutMs = opts.timeoutMs ?? JUDGE_TIMEOUT_MS;

  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const completion = await getClient().chat.completions.create(
        {
          model: opts.model,
          response_format: { type: "json_object" },
          temperature: 0.2,
          messages: [
            { role: "system", content: opts.system },
            { role: "user", content: opts.user },
          ],
        },
        { signal: controller.signal }
      );
      const text = completion.choices[0]?.message?.content ?? "";
      const parsed = opts.schema.safeParse(JSON.parse(text));
      if (parsed.success) return parsed.data;
    } catch {
      // timeout / network / invalid JSON: retry once, then give up
    } finally {
      clearTimeout(timer);
    }
  }
  return null;
}
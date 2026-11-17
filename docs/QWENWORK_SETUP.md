# QwenWork Setup — OctoGuard MCP + Skill

Goal: any QwenWork agent becomes governed by installing one skill and one MCP server.

> **Verification status (18 Nov 2026):** the MCP side below is verified against
> `@modelcontextprotocol/sdk` **1.32.2** (stateless Streamable HTTP, JSON responses) and smoke-tested
> with `curl` against this repo. The **QwenWork-side UI steps could NOT be confirmed from public docs**
> (no public QwenWork MCP/skill API reference was found; a web search on 18 Nov returned nothing
> authoritative). Treat steps 2–3 as best-effort and confirm with mentors at the workshop
> (see `docs/WINNING_PLAN.md` section 4 "blocking unknowns").

## 0. Prerequisites

1. Deploy this app publicly (Vercel or similar) **or** expose your dev server with a tunnel.
   QwenWork's cloud agents cannot reach `localhost`.
2. Set a strong token in `.env.local` (never commit it):
   ```
   OCTOGUARD_API_TOKEN=<long random string>
   ```
   With the token unset, write routes (including `/api/mcp`) accept **localhost only**.
3. Optional, for the live Qwen judge/board (M4): `QWEN_API_KEY`, `QWEN_BASE_URL`,
   `QWEN_MODEL_FAST`, `QWEN_MODEL_STRONG`. Everything works without them (scripted fallbacks).

## 1. The MCP server

- Endpoint: `https://<your-host>/api/mcp` (Streamable HTTP, stateless, JSON responses).
- Auth header: `Authorization: Bearer <OCTOGUARD_API_TOKEN>`.
- Tools:
  | Tool | Purpose |
  |---|---|
  | `octoguard_check_action` | Pre-execution verdict: ALLOW / DRAFT / HOLD / BLOCK |
  | `octoguard_report_outcome` | Feed clean/corrected/violation outcomes into the trust model |
  | `octohr_get_my_file` | Agent reads its own levels, trust evidence, write-ups, error budget |
  | `octohr_request_promotion` | Opens an Octo-Board promotion hearing |

## 2. Add the MCP server in QwenWork (unconfirmed UI path)

1. Open QwenWork → agent settings → MCP / connectors (name may differ).
2. Add a **Streamable HTTP** server: URL `https://<your-host>/api/mcp`,
   header `Authorization: Bearer <token>`.
3. If custom remote MCP servers are not allowed on the hackathon plan, fall back to the
   plain REST endpoint `POST /api/guard/evaluate` (same body as `octoguard_check_action`)
   and say so honestly in the pitch (plan section 10 risk table).

## 3. Install the OctoGuard skill

1. Package it: `npm run skill:zip` → `qwenwork-skills/octoguard.zip`
   (requires the `zip` CLI; the skill is a single `SKILL.md`).
2. Upload/install the zip as a skill for each governed agent (Inko → content,
   Squidney → CRM, Barnaby → ops).
3. Give each agent its stable `agentId` (`inko`, `squidney`, `barnaby`) in its instructions,
   e.g. "Your OctoOps agentId is `squidney`. Follow the octoguard skill for every outbound action."

## 4. curl smoke tests (run against your deployment)

Set `HOST` and `TOKEN` first: `HOST=https://<your-host>; TOKEN=<OCTOGUARD_API_TOKEN>`.
For local dev without a token, use `HOST=http://localhost:3000` and omit the Authorization header.

Initialize (MCP handshake):
```bash
curl -s -X POST "$HOST/api/mcp" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"smoke","version":"0"}}}'
```

List tools:
```bash
curl -s -X POST "$HOST/api/mcp" -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'
```

`octoguard_check_action` (expect BLOCK, G2_CLIENT_WALL):
```bash
curl -s -X POST "$HOST/api/mcp" -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"octoguard_check_action","arguments":{"agentId":"barnaby","actionType":"SEND_DIRECT_EMAIL","targetSystem":"HASHMETA_CRM","recipientTenant":"Hikari Automation Systems (Enterprise Account)","attachments":[{"name":"captable.pdf","tenant":"Sebrina Fund Management"}],"payloadText":"Please find attached."}}}'
```

`octoguard_report_outcome` (expect ok:true):
```bash
curl -s -X POST "$HOST/api/mcp" -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"octoguard_report_outcome","arguments":{"agentId":"squidney","actionType":"UPDATE_LEAD","outcome":"CLEAN","note":"smoke test"}}}'
```

`octohr_get_my_file` (expect levels + trust explanations):
```bash
curl -s -X POST "$HOST/api/mcp" -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":5,"method":"tools/call","params":{"name":"octohr_get_my_file","arguments":{"agentId":"squidney"}}}'
```

`octohr_request_promotion` (expect hearingOpened:true + gates):
```bash
curl -s -X POST "$HOST/api/mcp" -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":6,"method":"tools/call","params":{"name":"octohr_request_promotion","arguments":{"agentId":"inko"}}}'
```

REST equivalents (fallback if MCP is blocked): `POST /api/guard/evaluate`,
`POST /api/guard/outcome`, `GET /api/agents/<id>`, `POST /api/board/deliberate`.

## 5. First real intercept (demo rehearsal)

Ask the CRM agent in QwenWork: *"Email the Sebrina pricing sheet to our Hikari contact."*
Expected: the skill forces `octoguard_check_action` → `BLOCK` → the agent refuses and explains.
The dashboard audit log (`GET /api/audit`) shows the chained event; the agent's trust file
(`GET /api/agents/squidney`) shows the write-up and demotion.
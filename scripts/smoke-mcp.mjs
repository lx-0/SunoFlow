#!/usr/bin/env node
/**
 * SunoFlow MCP server smoke test.
 *
 * Drives `initialize` → `tools/list` → `tools/call sunoflow_info` against a
 * Streamable-HTTP MCP endpoint and verifies the responses.
 *
 * Usage:
 *   SUNOFLOW_API_KEY=sk-... node scripts/smoke-mcp.mjs [URL]
 *
 * URL defaults to http://localhost:3000/api/mcp. Pass https://sunoflow.app/api/mcp
 * (or any deployed host) to verify production.
 *
 * Exits 0 on success, non-zero on any check failure. Prints a one-line summary
 * per step so CI logs stay readable.
 */

const DEFAULT_URL = "http://localhost:3000/api/mcp";

const URL = process.argv[2] ?? DEFAULT_URL;
const API_KEY = process.env.SUNOFLOW_API_KEY;

if (!API_KEY) {
  console.error("ERROR: SUNOFLOW_API_KEY env var required");
  process.exit(2);
}

const HEADERS = {
  "content-type": "application/json",
  accept: "application/json, text/event-stream",
  authorization: `Bearer ${API_KEY}`,
};

let nextId = 0;
function id() {
  return ++nextId;
}

async function post(method, params) {
  const body = { jsonrpc: "2.0", id: id(), method, ...(params ? { params } : {}) };
  const res = await fetch(URL, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify(body),
  });
  const text = await res.text();
  // Streamable HTTP may return either JSON or SSE; parse both.
  let parsed;
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("text/event-stream")) {
    const dataLine = text
      .split("\n")
      .find((line) => line.startsWith("data:"));
    if (!dataLine) throw new Error(`SSE response missing data line: ${text}`);
    parsed = JSON.parse(dataLine.slice("data:".length).trim());
  } else if (text.trim().startsWith("{")) {
    parsed = JSON.parse(text);
  } else {
    throw new Error(`Unexpected response body: ${text}`);
  }
  return { status: res.status, body: parsed, raw: text };
}

function assert(cond, message) {
  if (!cond) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
}

async function main() {
  console.log(`→ ${URL}`);

  // Step 1: initialize
  const init = await post("initialize", {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "sunoflow-smoke", version: "0.0.1" },
  });
  assert(init.status === 200, `initialize status ${init.status} (want 200)`);
  assert(
    init.body?.result?.serverInfo?.name === "sunoflow-mcp",
    `initialize serverInfo.name = ${JSON.stringify(init.body?.result?.serverInfo)} (want sunoflow-mcp)`,
  );
  console.log(
    `✓ initialize → ${init.body.result.serverInfo.name}@${init.body.result.serverInfo.version} (protocol ${init.body.result.protocolVersion})`,
  );

  // Step 2: tools/list
  const list = await post("tools/list");
  assert(list.status === 200, `tools/list status ${list.status} (want 200)`);
  const tools = list.body?.result?.tools;
  assert(Array.isArray(tools) && tools.length >= 1, `tools/list returned ${tools?.length} tools (want >=1)`);
  const names = tools.map((t) => t.name);
  assert(names.includes("sunoflow_info"), `tools/list missing sunoflow_info; got: ${names.join(", ")}`);
  console.log(`✓ tools/list → ${tools.length} tool(s): ${names.join(", ")}`);

  // Step 3: tools/call sunoflow_info
  const call = await post("tools/call", { name: "sunoflow_info", arguments: {} });
  assert(call.status === 200, `tools/call status ${call.status} (want 200)`);
  const content = call.body?.result?.content?.[0]?.text;
  assert(typeof content === "string", `tools/call returned non-text content`);
  const info = JSON.parse(content);
  assert(info.server === "sunoflow-mcp", `info.server = ${info.server} (want sunoflow-mcp)`);
  assert(typeof info.version === "string", `info.version missing`);
  console.log(`✓ tools/call sunoflow_info → version ${info.version}, ${info.tools.length} tools advertised`);

  console.log(`\nAll checks passed.`);
}

main().catch((err) => {
  console.error(`ERROR: ${err.message}`);
  process.exit(1);
});

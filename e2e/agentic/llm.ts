/**
 * Pluggable LLM "brain" for the agentic harness.
 *
 * Speaks the OpenAI-compatible /chat/completions API, so it works against:
 *   - the on-network Ollama box  (default; free, no cloud spend)
 *       LLM_BASE_URL=http://192.168.2.42:11434/v1   LLM_MODEL=qwen2.5:14b
 *   - the Yesterday LLM Gateway  (llm.yester.cloud/v1, set LLM_API_KEY)
 *   - OpenAI / any compatible endpoint
 *
 * The model never touches the page directly. It only ever receives an
 * observation (the page's accessibility tree) and returns ONE structured
 * action. All browser side-effects happen in harness.ts.
 */

export type AgentAction =
  | { kind: "click"; role: string; name: string; reason: string }
  | { kind: "fill"; role: string; name: string; text: string; reason: string }
  | { kind: "goto"; path: string; reason: string }
  /** Record a UX friction point the persona hit. This is the product feedback. */
  | { kind: "note"; severity: "low" | "med" | "high"; friction: string }
  /** End the run. success=false means the persona gave up / got stuck. */
  | { kind: "done"; success: boolean; reason: string };

export interface LlmConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export function llmConfigFromEnv(): LlmConfig {
  return {
    baseUrl: process.env.LLM_BASE_URL ?? "http://192.168.2.42:11434/v1",
    apiKey: process.env.LLM_API_KEY ?? "ollama", // Ollama ignores the key
    // NOTE: agentic JSON adherence needs a capable model. phi4:14b is the
    // strongest model on the on-network Ollama box; 7–8B models are marginal
    // (occasional malformed actions / early give-ups). For max reliability use
    // the gateway (LLM_BASE_URL=https://llm.yester.cloud/v1 LLM_MODEL=quality).
    model: process.env.LLM_MODEL ?? "phi4:14b",
  };
}

/** Strip markdown fences / stray prose around a JSON object (LLM-output hygiene). */
function extractJson(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = (fenced ? fenced[1] : raw).trim();
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error(`No JSON object in LLM reply:\n${raw}`);
  return body.slice(start, end + 1);
}

export async function decideNextAction(
  cfg: LlmConfig,
  messages: { role: "system" | "user" | "assistant"; content: string }[],
): Promise<AgentAction> {
  const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify({
      model: cfg.model,
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages,
    }),
  });

  if (!res.ok) {
    throw new Error(`LLM call failed: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as {
    choices: { message: { content: string } }[];
  };
  const content = data.choices?.[0]?.message?.content ?? "";
  const parsed = JSON.parse(extractJson(content)) as AgentAction;

  if (!parsed || typeof parsed.kind !== "string") {
    throw new Error(`LLM returned malformed action: ${content}`);
  }
  return parsed;
}

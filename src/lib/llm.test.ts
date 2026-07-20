import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/env", () => ({
  get OPENAI_MODEL() {
    return "gpt-4o-mini";
  },
}));

const mockCreate = vi.fn();

vi.mock("@/lib/openai-client", () => ({
  getOpenAIClient: () => ({
    chat: { completions: { create: (...args: unknown[]) => mockCreate(...args) } },
  }),
}));

const mockLogServerError = vi.fn();
vi.mock("@/lib/error-logger", () => ({
  logServerError: (...args: unknown[]) => mockLogServerError(...args),
}));

vi.mock("@/lib/logger", () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { generateText, LLM_REQUEST_DEADLINE_MS } from "./llm";

function completion(content: string | null) {
  return { choices: [{ message: { content } }] };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("generateText error tracking", () => {
  it("returns the model content on success", async () => {
    mockCreate.mockResolvedValue(completion("hello world"));

    const result = await generateText("sys", "user");

    expect(result).toBe("hello world");
    expect(mockLogServerError).not.toHaveBeenCalled();
  });

  it("logs a genuine API/network error via logServerError", async () => {
    mockCreate.mockRejectedValue(new Error("500 upstream is down"));

    const result = await generateText("sys", "user");

    expect(result).toBeNull();
    expect(mockLogServerError).toHaveBeenCalledTimes(1);
    expect(mockLogServerError).toHaveBeenCalledWith(
      "llm",
      expect.any(Error),
      expect.objectContaining({ route: "lib/llm.generateText" }),
    );
  });

  it("does NOT log a benign empty-content response", async () => {
    mockCreate.mockResolvedValue(completion(null));

    const result = await generateText("sys", "user");

    expect(result).toBeNull();
    expect(mockLogServerError).not.toHaveBeenCalled();
  });

  it("does NOT log a noise-grade content-policy rejection", async () => {
    mockCreate.mockRejectedValue(new Error("400 request rejected by content policy"));

    const result = await generateText("sys", "user");

    expect(result).toBeNull();
    expect(mockLogServerError).not.toHaveBeenCalled();
  });
});

describe("generateText request deadline", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("aborts a stalled completion within the deadline instead of hanging", async () => {
    vi.useFakeTimers();

    // A completion that never resolves on its own — it only settles when the
    // AbortController's signal fires, exactly like the real SDK under abort.
    mockCreate.mockImplementation(
      (_params: unknown, opts: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          opts.signal.addEventListener("abort", () =>
            reject(new Error("Request was aborted.")),
          );
        }),
    );

    const pending = generateText("sys", "user");
    // Nothing has resolved the completion; only the deadline can.
    await vi.advanceTimersByTimeAsync(LLM_REQUEST_DEADLINE_MS + 100);

    const result = await pending;

    expect(result).toBeNull();
    // Abort is a genuine (non-content) failure, so it is tracked.
    expect(mockLogServerError).toHaveBeenCalledTimes(1);
  });
});

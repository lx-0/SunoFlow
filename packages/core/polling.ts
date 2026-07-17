// Shared generation-poll loop — the single implementation of the sleep→poll
// cycle the mobile generate / mashup / upload screens each hand-rolled. Pure
// async control flow, no platform deps: the caller injects the poll call, the
// alive check (screen mounted?), and the status predicates.
//
// Semantics (kept exactly as the screens had them):
// - alive is checked BEFORE and AFTER each sleep — either check failing ends
//   the run as `aborted` without another poll (the post-sleep check is what
//   stops a poll + navigation from firing after the screen unmounted).
// - a poll error is reported via onPollError and the loop continues; the
//   failed attempt still counts against maxPolls.
// - `isReady` wins over `isFailed`; both are terminal.
// - exhausting maxPolls without a terminal status is a `timeout`.

export interface GenerationPollOptions<S> {
  intervalMs: number;
  maxPolls: number;
  /** Injectable for tests; defaults to a real setTimeout sleep. */
  sleep?: (ms: number) => Promise<void>;
  /** False once the caller no longer wants the result (e.g. screen unmounted). */
  isAlive: () => boolean;
  isReady: (status: S) => boolean;
  isFailed: (status: S) => boolean;
  /** Extracts the user-facing error from a failed status, when there is one. */
  failMessage?: (status: S) => string | undefined;
  /** Called instead of console when a single poll throws; the loop continues. */
  onPollError?: (error: unknown) => void;
}

export type GenerationPollResult<S> =
  | { kind: "ready"; status: S }
  | { kind: "failed"; errorMessage?: string }
  | { kind: "timeout" }
  | { kind: "aborted" };

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Polls until a terminal status, abort, or maxPolls exhaustion. Never throws. */
export async function runGenerationPoll<S>(
  poll: () => Promise<S>,
  opts: GenerationPollOptions<S>,
): Promise<GenerationPollResult<S>> {
  const { intervalMs, maxPolls, sleep = defaultSleep, isAlive, isReady, isFailed, failMessage, onPollError } = opts;

  for (let attempt = 0; attempt < maxPolls; attempt++) {
    if (!isAlive()) return { kind: "aborted" };
    await sleep(intervalMs);
    if (!isAlive()) return { kind: "aborted" };

    let status: S;
    try {
      status = await poll();
    } catch (e) {
      onPollError?.(e);
      continue;
    }
    if (isReady(status)) return { kind: "ready", status };
    if (isFailed(status)) return { kind: "failed", errorMessage: failMessage?.(status) };
  }
  return { kind: "timeout" };
}

import { useCallback, useEffect, useRef, useState } from "react";
import { router, useFocusEffect, useNavigation, type Href } from "expo-router";
import { runGenerationPoll } from "@sunoflow/core";
import { pollStatus } from "@/api/generate";

// usePollingJob: the started-job → poll → route/fail lifecycle the generate /
// mashup / upload screens each hand-rolled, on top of the shared core loop
// (runGenerationPoll). The hook owns only the mobile glue:
//
// - aliveRef: a focus-INDEPENDENT mount guard. The poll must keep running while
//   the user browses other tabs (blur is fine) and stop only on unmount — so
//   liveness is a plain mount effect, not a focus effect.
// - Deferred completion redirect: under the Tabs model a blind router.replace
//   would replace the root of whatever tab the user switched to while polling.
//   Focus is read imperatively at completion time (navigation.isFocused()):
//   with freezeOnBlur on the Tabs, a frozen screen's useIsFocused hook value
//   would stay stale until unfreeze. An unfocused completion parks the href in
//   pendingHrefRef; the useFocusEffect replays it on the next focus. Until then
//   phase stays "polling" — the spinner holds until the replay navigates away.
// - phase covers the hook's share of the lifecycle only: idle → polling →
//   failed (backend-reported failure or timeout). The submit step and its
//   errors stay in the screen; render the union (screen phase while idle).
//
// start() never rejects: single poll errors are logged and retried by the core
// loop; terminal failures land in { phase: "failed", error }.

const POLL_INTERVAL_MS = 4000;
const MAX_POLLS = 75;

export type PollingJobPhase = "idle" | "polling" | "failed";

export interface PollingJobMessages {
  /** Shown when the backend reports failure without an errorMessage of its own. */
  failed: string;
  /** Shown when MAX_POLLS pass without a terminal status. */
  timeout: string;
}

export interface StartPollingOptions {
  /** Route replaced to once the job is ready (deferred while unfocused). */
  hrefFor: (job: { songId: string }) => string;
  messages: PollingJobMessages;
}

export interface PollingJob {
  phase: PollingJobPhase;
  /** User-facing message once phase === "failed"; null otherwise. */
  error: string | null;
  /** Polls the started job to a terminal state; resolves without throwing. */
  start: (job: { songId: string }, opts: StartPollingOptions) => Promise<void>;
  /** Back to idle (error cleared) — the screen's "Try again" path. */
  reset: () => void;
}

export function usePollingJob({ logTag = "usePollingJob" }: { logTag?: string } = {}): PollingJob {
  const [phase, setPhase] = useState<PollingJobPhase>("idle");
  const [error, setError] = useState<string | null>(null);

  // Stop the poll loop from touching state / navigating after unmount (the user
  // can leave mid-poll). Mount-scoped on purpose: blur must NOT abort the poll.
  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  // Deferred completion redirect — see the header comment.
  const navigation = useNavigation();
  const pendingHrefRef = useRef<string | null>(null);
  useFocusEffect(
    useCallback(() => {
      const href = pendingHrefRef.current;
      if (href) {
        pendingHrefRef.current = null;
        router.replace(href as Href);
      }
    }, []),
  );

  const start = useCallback(
    async (job: { songId: string }, { hrefFor, messages }: StartPollingOptions) => {
      setError(null);
      setPhase("polling");
      const result = await runGenerationPoll(() => pollStatus(job.songId), {
        intervalMs: POLL_INTERVAL_MS,
        maxPolls: MAX_POLLS,
        isAlive: () => aliveRef.current,
        isReady: (s) => s.ready,
        isFailed: (s) => s.failed,
        failMessage: (s) => s.errorMessage ?? undefined,
        onPollError: (e) => console.error(`[${logTag}] poll failed`, e),
      });
      // start() must never reject: a throw here (realistically only
      // router.replace during navigation teardown) would leave phase stuck at
      // "polling" while the screen's own catch writes an invisible submit
      // error — strand the spinner forever.
      try {
        switch (result.kind) {
          case "ready": {
            const href = hrefFor(job);
            if (!navigation.isFocused()) {
              pendingHrefRef.current = href;
              return;
            }
            router.replace(href as Href);
            return;
          }
          case "failed":
            setError(result.errorMessage ?? messages.failed);
            setPhase("failed");
            return;
          case "timeout":
            setError(messages.timeout);
            setPhase("failed");
            return;
          case "aborted":
            return; // unmounted mid-poll — no state writes, no navigation
        }
      } catch (e) {
        console.error(`[${logTag}] post-poll navigation failed`, e);
        if (aliveRef.current) {
          setError(messages.failed);
          setPhase("failed");
        }
      }
    },
    [logTag, navigation],
  );

  const reset = useCallback(() => {
    setError(null);
    setPhase("idle");
  }, []);

  return { phase, error, start, reset };
}

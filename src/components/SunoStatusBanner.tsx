"use client";

import { useState, useEffect } from "react";
import { ExclamationTriangleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { fetchWithTimeout } from "@/lib/fetch-client";

const POLL_INTERVAL_MS = 30_000; // check every 30 seconds
const SESSION_KEY = "suno_status_banner_dismissed_at";

interface CircuitStatus {
  state: "closed" | "open" | "half-open";
  failureCount: number;
  openedAt: string | null;
  nextProbeAt: string | null;
}

export function SunoStatusBanner() {
  const [status, setStatus] = useState<CircuitStatus | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // If the user dismissed the banner after the circuit last opened, honour that.
    try {
      const dismissedAt = sessionStorage.getItem(SESSION_KEY);
      if (dismissedAt) setDismissed(true);
    } catch {
      // sessionStorage may be unavailable
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    async function poll() {
      try {
        const res = await fetchWithTimeout("/api/suno/circuit-breaker", {}, 5000);
        if (!res.ok || !mounted) return;
        const data = (await res.json()) as CircuitStatus;
        if (!mounted) return;

        setStatus(data);

        // If circuit just closed, clear dismissal so user sees fresh status.
        if (data.state === "closed") {
          try {
            sessionStorage.removeItem(SESSION_KEY);
          } catch {
            // ignore
          }
          setDismissed(false);
        }
      } catch {
        // Network error — leave existing status intact.
      }
    }

    poll();
    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  const isDegraded = status?.state === "open" || status?.state === "half-open";

  if (!isDegraded || dismissed) return null;

  function handleDismiss() {
    setDismissed(true);
    try {
      sessionStorage.setItem(SESSION_KEY, String(Date.now()));
    } catch {
      // ignore
    }
  }

  const isHalfOpen = status?.state === "half-open";

  return (
    <div
      role="alert"
      aria-live="polite"
      className="flex items-center justify-between gap-3 rounded-none border-b border-orange-200 dark:border-orange-800/60 bg-orange-50 dark:bg-orange-900/20 px-4 py-3"
    >
      <div className="flex items-start gap-2.5 min-w-0">
        <ExclamationTriangleIcon className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
        <p className="text-sm text-orange-800 dark:text-orange-200">
          <span className="font-semibold">
            {isHalfOpen
              ? "Music generation is recovering…"
              : "Music generation is temporarily unavailable."}
          </span>{" "}
          {isHalfOpen
            ? "Checking if the service is back online."
            : "Your generation requests will be queued and processed automatically when the service recovers."}
        </p>
      </div>
      <button
        onClick={handleDismiss}
        className="flex-shrink-0 p-1 rounded-md text-orange-500 hover:text-orange-700 dark:hover:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-800/40 transition-colors"
        aria-label="Dismiss"
      >
        <XMarkIcon className="w-4 h-4" />
      </button>
    </div>
  );
}

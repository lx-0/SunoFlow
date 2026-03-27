"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ExclamationTriangleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { track } from "@/lib/analytics";
import { useCredits } from "@/hooks/useCredits";

const SESSION_KEY = "low_credits_banner_dismissed";
const LOW_CREDITS_THRESHOLD = 20; // show banner when ≤ this many credits remain

export function LowCreditsBanner() {
  const { data: credits } = useCredits();
  const [dismissed, setDismissed] = useState(false);
  const [tracked, setTracked] = useState(false);

  // Check session dismiss state on mount
  useEffect(() => {
    try {
      if (sessionStorage.getItem(SESSION_KEY)) setDismissed(true);
    } catch {
      // sessionStorage may be unavailable
    }
  }, []);

  const isLow =
    credits !== null &&
    credits.creditsRemaining <= LOW_CREDITS_THRESHOLD &&
    credits.creditsRemaining >= 0;

  // Track impression once per mount when banner becomes visible
  useEffect(() => {
    if (isLow && !dismissed && !tracked) {
      track("low_credits_banner_shown", { creditsRemaining: credits?.creditsRemaining });
      setTracked(true);
    }
  }, [isLow, dismissed, tracked, credits?.creditsRemaining]);

  if (!isLow || dismissed) return null;

  function handleDismiss() {
    track("low_credits_banner_dismissed", { creditsRemaining: credits?.creditsRemaining });
    setDismissed(true);
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      // ignore
    }
  }

  function handleUpgradeClick() {
    track("low_credits_banner_upgrade_clicked", { creditsRemaining: credits?.creditsRemaining });
  }

  const remaining = credits!.creditsRemaining;

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 mb-4">
      <div className="flex items-start gap-2.5 min-w-0">
        <ExclamationTriangleIcon className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800 dark:text-amber-200">
          <span className="font-semibold">
            {remaining === 0
              ? "You have no credits left"
              : `Only ${remaining} credit${remaining === 1 ? "" : "s"} remaining`}
          </span>{" "}
          this month.{" "}
          <Link
            href="/pricing"
            onClick={handleUpgradeClick}
            className="underline font-medium hover:text-amber-900 dark:hover:text-amber-100 transition-colors"
          >
            Upgrade to keep generating
          </Link>
        </p>
      </div>
      <button
        onClick={handleDismiss}
        className="flex-shrink-0 p-1 rounded-md text-amber-500 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-800/40 transition-colors"
        aria-label="Dismiss"
      >
        <XMarkIcon className="w-4 h-4" />
      </button>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { EnvelopeIcon } from "@heroicons/react/24/outline";

export function EmailVerificationBanner() {
  const { data: session } = useSession();
  const [dismissed, setDismissed] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const user = session?.user as Record<string, unknown> | undefined;
  const emailVerified = user?.emailVerified;

  if (!session || emailVerified || dismissed) {
    return null;
  }

  async function handleResend() {
    setResending(true);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
      });
      if (res.ok) {
        setResent(true);
      }
    } catch {
      // silently fail
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="bg-amber-50 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-800 px-4 py-2.5 flex items-center gap-2 text-sm text-amber-800 dark:text-amber-200">
      <EnvelopeIcon className="w-4 h-4 flex-shrink-0" />
      <span className="flex-1">
        {resent
          ? "Verification email sent! Check your inbox."
          : "Please verify your email address."}
      </span>
      {!resent && (
        <button
          onClick={handleResend}
          disabled={resending}
          className="text-amber-700 dark:text-amber-300 hover:underline font-medium whitespace-nowrap"
        >
          {resending ? "Sending..." : "Resend email"}
        </button>
      )}
      <button
        onClick={() => setDismissed(true)}
        className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 ml-1"
        aria-label="Dismiss"
      >
        &times;
      </button>
    </div>
  );
}

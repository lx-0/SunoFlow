"use client";

import { useState, useEffect, useRef } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import Image from "next/image";

const DISMISS_KEY = "sunoflow_pwa_prompt_dismissed_until";
const USAGE_SECONDS_KEY = "sunoflow_pwa_usage_seconds";
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MIN_USAGE_SECONDS = 120; // 2 minutes

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isIos(): boolean {
  return /iPhone|iPad|iPod/.test(navigator.userAgent);
}

function isMobile(): boolean {
  return /iPhone|iPad|iPod|Android/.test(navigator.userAgent) || window.innerWidth < 768;
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator &&
      (navigator as unknown as { standalone: boolean }).standalone === true)
  );
}

function isDismissed(): boolean {
  const until = localStorage.getItem(DISMISS_KEY);
  if (!until) return false;
  return Date.now() < Number(until);
}

function getStoredUsageSeconds(): number {
  return Number(localStorage.getItem(USAGE_SECONDS_KEY) ?? "0");
}

export function PwaInstallPrompt() {
  const [show, setShow] = useState(false);
  const [ios, setIos] = useState(false);
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);
  const shownRef = useRef(false);

  useEffect(() => {
    if (!isMobile() || isStandalone() || isDismissed()) return;

    // If already past threshold from prior sessions, show immediately
    if (getStoredUsageSeconds() >= MIN_USAGE_SECONDS) {
      setIos(isIos());
      setShow(true);
      shownRef.current = true;
    }

    // Listen for native install prompt (Chrome/Android)
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    // Accumulate usage time each second; show prompt after MIN_USAGE_SECONDS
    const interval = setInterval(() => {
      if (shownRef.current) {
        clearInterval(interval);
        return;
      }
      const seconds = getStoredUsageSeconds() + 1;
      localStorage.setItem(USAGE_SECONDS_KEY, String(seconds));
      if (seconds >= MIN_USAGE_SECONDS) {
        setIos(isIos());
        setShow(true);
        shownRef.current = true;
        clearInterval(interval);
      }
    }, 1000);

    return () => {
      clearInterval(interval);
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
    };
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_DURATION_MS));
    setShow(false);
  }

  async function install() {
    if (deferredPrompt.current) {
      await deferredPrompt.current.prompt();
      const { outcome } = await deferredPrompt.current.userChoice;
      deferredPrompt.current = null;
      if (outcome === "accepted") {
        dismiss();
        return;
      }
    }
    // Fallback: keep banner open so iOS/Firefox users can follow manual steps
    // For non-prompt browsers, treat "Install" as acknowledged
    dismiss();
  }

  if (!show) return null;

  return (
    <div
      role="dialog"
      aria-label="Install SunoFlow as an app"
      className="fixed bottom-20 left-4 right-4 z-50 mx-auto max-w-sm bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 animate-in slide-in-from-bottom-4"
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-lg overflow-hidden">
          <Image
            src="/icons/icon-192.png"
            alt="SunoFlow"
            width={40}
            height={40}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            Install SunoFlow
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {ios
              ? 'Tap the Share button \u{1F517}, then "Add to Home Screen".'
              : deferredPrompt.current
                ? "Add SunoFlow to your home screen for faster access and offline support."
                : 'Open your browser menu and tap "Add to Home Screen" or "Install app".'}
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={install}
              className="flex-1 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-medium py-2 px-3 transition-colors"
            >
              Install
            </button>
            <button
              onClick={dismiss}
              className="flex-1 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-xs font-medium py-2 px-3 transition-colors"
            >
              Not now
            </button>
          </div>
        </div>
        <button
          onClick={dismiss}
          aria-label="Dismiss install prompt"
          className="flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 -mt-1 -mr-1"
        >
          <XMarkIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

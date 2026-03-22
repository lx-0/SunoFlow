"use client";

import { useState, useEffect, useCallback } from "react";
import { SignalSlashIcon } from "@heroicons/react/24/outline";

export function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(false);
  const [queueCount, setQueueCount] = useState(0);

  useEffect(() => {
    // Only check after mount (window is available)
    setIsOffline(!navigator.onLine);

    const goOffline = () => setIsOffline(true);
    const goOnline = () => {
      setIsOffline(false);
      // Trigger queue flush via service worker
      navigator.serviceWorker?.ready.then((reg) => {
        if ("sync" in reg) {
          (reg as unknown as { sync: { register: (tag: string) => Promise<void> } }).sync.register("flush-generate-queue");
        } else {
          reg.active?.postMessage({ type: "FLUSH_QUEUE" });
        }
      });
    };

    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);

    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  // Listen for queue updates from service worker
  const handleSWMessage = useCallback((event: MessageEvent) => {
    if (event.data?.type === "QUEUE_FLUSHED") {
      setQueueCount(event.data.remaining ?? 0);
    }
  }, []);

  useEffect(() => {
    navigator.serviceWorker?.addEventListener("message", handleSWMessage);
    return () => {
      navigator.serviceWorker?.removeEventListener("message", handleSWMessage);
    };
  }, [handleSWMessage]);

  if (!isOffline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white text-center text-sm py-1.5 px-4 flex items-center justify-center gap-2"
    >
      <SignalSlashIcon className="w-4 h-4" aria-hidden="true" />
      <span>
        You are offline
        {queueCount > 0 && ` — ${queueCount} queued request${queueCount > 1 ? "s" : ""}`}
      </span>
    </div>
  );
}

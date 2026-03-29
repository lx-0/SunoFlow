"use client";

import { useState, useEffect, useCallback } from "react";

export type PushState =
  | "unsupported"   // Browser doesn't support push
  | "loading"       // Checking state
  | "not-configured" // Server VAPID keys not set
  | "denied"        // User blocked notifications
  | "prompt"        // Permission not yet requested
  | "subscribed"    // Active push subscription
  | "unsubscribed"; // Permission granted but not subscribed

/**
 * Manages the browser push subscription lifecycle.
 * Handles VAPID key fetch, subscription registration, and server sync.
 */
export function usePushSubscription() {
  const [state, setState] = useState<PushState>("loading");
  const [vapidKey, setVapidKey] = useState<string | null>(null);

  // Detect support and load VAPID key
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window)
    ) {
      setState("unsupported");
      return;
    }

    fetch("/api/push/vapid-public-key")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.key) {
          setState("not-configured");
          return;
        }
        setVapidKey(data.key);
        refreshState(data.key);
      })
      .catch(() => setState("not-configured"));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async function refreshState(key: string) {
    try {
      const permission = Notification.permission;
      if (permission === "denied") {
        setState("denied");
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      if (existing) {
        setState("subscribed");
      } else {
        setState(permission === "default" ? "prompt" : "unsubscribed");
      }
    } catch {
      setState("prompt");
    }
  }

  /** Request permission and subscribe */
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!vapidKey) return false;

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState("denied");
        return false;
      }

      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });

      if (!res.ok) {
        await subscription.unsubscribe();
        return false;
      }

      setState("subscribed");
      return true;
    } catch {
      return false;
    }
  }, [vapidKey]);

  /** Unsubscribe from push */
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.getSubscription();
      if (!subscription) {
        setState("unsubscribed");
        return true;
      }

      await fetch("/api/push/subscribe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });

      await subscription.unsubscribe();
      setState("unsubscribed");
      return true;
    } catch {
      return false;
    }
  }, []);

  return { state, subscribe, unsubscribe };
}

/** Convert a base64url VAPID public key to a Uint8Array */
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer as ArrayBuffer;
}

"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import { apiGet, apiPatch } from "@/lib/api-client";
import { EMAIL_BOOL_NOTIF_TYPES, DIGEST_FREQUENCY_OPTIONS, HOUR_OPTIONS, PUSH_NOTIF_TYPES } from "./constants";
import { Toast } from "./ui";
import { useAutoDismissToast } from "./use-auto-dismiss-toast";

export function EmailNotificationsSection() {
  const [boolPrefs, setBoolPrefs] = useState<Record<string, boolean>>({});
  const [digestFrequency, setDigestFrequency] = useState<string>("off");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast, showToast } = useAutoDismissToast();

  useEffect(() => {
    apiGet<Record<string, unknown>>("/api/profile/email-preferences")
      .then((data) => {
        const { emailDigestFrequency, ...rest } = data;
        setBoolPrefs(rest as Record<string, boolean>);
        setDigestFrequency((emailDigestFrequency as string) ?? "off");
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const toggle = async (key: string) => {
    const updated = { ...boolPrefs, [key]: !boolPrefs[key] };
    setBoolPrefs(updated);
    setSaving(true);
    try {
      await apiPatch("/api/profile/email-preferences", { [key]: updated[key] });
    } catch {
      showToast("Failed to update preference", "error");
      setBoolPrefs(boolPrefs);
    } finally {
      setSaving(false);
    }
  };

  const changeDigestFrequency = async (value: string) => {
    const prev = digestFrequency;
    setDigestFrequency(value);
    setSaving(true);
    try {
      await apiPatch("/api/profile/email-preferences", { emailDigestFrequency: value });
    } catch {
      showToast("Failed to update digest frequency", "error");
      setDigestFrequency(prev);
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) return null;

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} />}
      <section className="space-y-3">
        <div>
          <h3 className="text-base font-semibold text-primary">Email Notifications</h3>
          <p className="text-xs text-secondary mt-0.5">Choose which emails you want to receive. All emails include a one-click unsubscribe link.</p>
        </div>
        <div className="space-y-2">
          {EMAIL_BOOL_NOTIF_TYPES.map(({ key, label, description }) => (
            <label
              key={key}
              className="flex items-center gap-3 bg-surface border border-border rounded-lg px-3 py-3 cursor-pointer hover:bg-surface-hover transition-colors"
            >
              <input
                type="checkbox"
                checked={boolPrefs[key] === true}
                onChange={() => !saving && toggle(key)}
                disabled={saving}
                className="w-4 h-4 rounded border-border-strong text-violet-600 focus:ring-violet-500 dark:bg-gray-800"
              />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-primary">{label}</span>
                <span className="block text-xs text-secondary">{description}</span>
              </div>
              <Icon icon={Bell} className="w-4 h-4 text-muted flex-shrink-0" />
            </label>
          ))}

          <div className="flex items-center gap-3 bg-surface border border-border rounded-lg px-3 py-3">
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-primary">Email digest</span>
              <span className="block text-xs text-secondary">A digest of your top songs and activity</span>
            </div>
            <select
              value={digestFrequency}
              onChange={(e) => !saving && changeDigestFrequency(e.target.value)}
              disabled={saving}
              className="text-sm bg-surface-raised border border-border rounded-md px-2 py-1 text-primary focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-50"
            >
              {DIGEST_FREQUENCY_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>
      </section>
    </>
  );
}

export function QuietHoursSection() {
  const [enabled, setEnabled] = useState(false);
  const [start, setStart] = useState(22);
  const [end, setEnd] = useState(8);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast, showToast } = useAutoDismissToast();

  useEffect(() => {
    apiGet<Record<string, unknown>>("/api/profile/email-preferences")
      .then((data) => {
        setEnabled((data.quietHoursEnabled as boolean) ?? false);
        setStart((data.quietHoursStart as number) ?? 22);
        setEnd((data.quietHoursEnd as number) ?? 8);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const patch = async (updates: Record<string, unknown>) => {
    setSaving(true);
    try {
      await apiPatch("/api/profile/email-preferences", updates);
      return true;
    } catch {
      showToast("Failed to update quiet hours", "error");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const toggleEnabled = async () => {
    const next = !enabled;
    setEnabled(next);
    const ok = await patch({ quietHoursEnabled: next });
    if (!ok) setEnabled(!next);
  };

  const changeStart = async (value: number) => {
    const prev = start;
    setStart(value);
    const ok = await patch({ quietHoursStart: value });
    if (!ok) setStart(prev);
  };

  const changeEnd = async (value: number) => {
    const prev = end;
    setEnd(value);
    const ok = await patch({ quietHoursEnd: value });
    if (!ok) setEnd(prev);
  };

  if (!loaded) return null;

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} />}
      <section className="space-y-3">
        <div>
          <h3 className="text-base font-semibold text-primary">Quiet Hours</h3>
          <p className="text-xs text-secondary mt-0.5">Suppress push notifications during a time window each day.</p>
        </div>

        <div className="flex items-center justify-between bg-surface border border-border rounded-lg px-3 py-3">
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium text-primary">Enable quiet hours</span>
            <span className="block text-xs text-secondary">No push notifications during this window</span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            onClick={toggleEnabled}
            disabled={saving}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
              enabled ? "bg-violet-600" : "bg-gray-300 dark:bg-gray-700"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                enabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {enabled && (
          <div className="flex items-center gap-3 bg-surface border border-border rounded-lg px-3 py-3">
            <div className="flex-1 flex items-center gap-2 flex-wrap">
              <span className="text-sm text-secondary">From</span>
              <select
                value={start}
                onChange={(e) => !saving && changeStart(Number(e.target.value))}
                disabled={saving}
                className="text-sm bg-surface-raised border border-border rounded-md px-2 py-1 text-primary focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-50"
              >
                {HOUR_OPTIONS.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <span className="text-sm text-secondary">to</span>
              <select
                value={end}
                onChange={(e) => !saving && changeEnd(Number(e.target.value))}
                disabled={saving}
                className="text-sm bg-surface-raised border border-border rounded-md px-2 py-1 text-primary focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-50"
              >
                {HOUR_OPTIONS.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </section>
    </>
  );
}

export function PushNotificationsSection() {
  const { state, subscribe, unsubscribe } = usePushSubscription();
  const [prefs, setPrefs] = useState<Record<string, boolean>>({});
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast, showToast } = useAutoDismissToast();

  useEffect(() => {
    apiGet<Record<string, boolean>>("/api/push/preferences")
      .then((data) => setPrefs(data))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const toggle = async (key: string) => {
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    setSaving(true);
    try {
      await apiPatch("/api/push/preferences", { [key]: updated[key] });
    } catch {
      showToast("Failed to update preference", "error");
      setPrefs(prefs);
    } finally {
      setSaving(false);
    }
  };

  const handleSubscribeToggle = async () => {
    if (state === "subscribed") {
      const ok = await unsubscribe();
      if (!ok) showToast("Failed to disable push notifications", "error");
    } else {
      const ok = await subscribe();
      if (!ok && state !== "denied") showToast("Failed to enable push notifications", "error");
      if (state === "denied") showToast("Notifications are blocked. Enable them in your browser settings.", "error");
    }
  };

  if (state === "unsupported" || state === "not-configured") return null;

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} />}
      <section className="space-y-3">
        <div>
          <h3 className="text-base font-semibold text-primary">Push Notifications</h3>
          <p className="text-xs text-secondary mt-0.5">
            Receive notifications even when the app is in the background.
          </p>
        </div>

        <div className="flex items-center justify-between bg-surface border border-border rounded-lg px-3 py-3">
          <div className="flex items-center gap-3">
            <Icon icon={Bell} className="w-4 h-4 text-muted" />
            <div>
              <span className="text-sm font-medium text-primary">
                {state === "subscribed" ? "Push notifications enabled" : "Enable push notifications"}
              </span>
              {state === "denied" && (
                <span className="block text-xs text-red-500 dark:text-red-400">
                  Blocked by browser — update in browser settings
                </span>
              )}
              {state === "loading" && (
                <span className="block text-xs text-secondary">Checking…</span>
              )}
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={state === "subscribed"}
            onClick={handleSubscribeToggle}
            disabled={state === "loading" || state === "denied"}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
              state === "subscribed" ? "bg-violet-600" : "bg-gray-300 dark:bg-gray-700"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                state === "subscribed" ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {state === "subscribed" && loaded && (
          <div className="space-y-2">
            {PUSH_NOTIF_TYPES.map(({ key, label, description }) => (
              <label
                key={key}
                className="flex items-center gap-3 bg-surface border border-border rounded-lg px-3 py-3 cursor-pointer hover:bg-surface-hover transition-colors"
              >
                <input
                  type="checkbox"
                  checked={prefs[key] !== false}
                  onChange={() => !saving && toggle(key)}
                  disabled={saving}
                  className="w-4 h-4 rounded border-border-strong text-violet-600 focus:ring-violet-500 dark:bg-gray-800"
                />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-primary">{label}</span>
                  <span className="block text-xs text-secondary">{description}</span>
                </div>
              </label>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

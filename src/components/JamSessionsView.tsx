"use client";

import { useCallback, useEffect, useState } from "react";
import { PartyPopper } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { Link, useRouter } from "@/i18n/navigation";
import { useToast } from "./Toast";
import { track } from "@/lib/analytics";
import { fetchWithTimeout } from "@/lib/fetch-client";
import { createJamSessionApi, type JamSessionDetail } from "@/lib/jam-client";

/**
 * Web home for Party Mode (/party): the host's sessions plus the create form.
 * STUDIO gating stays server-side — non-studio users see the 403 message
 * inline when they try to start one.
 */
export function JamSessionsView() {
  const { toast } = useToast();
  const router = useRouter();
  const [sessions, setSessions] = useState<JamSessionDetail[] | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [budget, setBudget] = useState("30");
  const [duration, setDuration] = useState("24");
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetchWithTimeout("/api/jam-sessions");
      if (!res.ok) return;
      const json = (await res.json()) as { sessions?: JamSessionDetail[] };
      setSessions(Array.isArray(json.sessions) ? json.sessions : []);
    } catch {
      // list stays in loading state; the create form still works
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleStart(e: React.FormEvent) {
    e.preventDefault();
    if (starting) return;

    const budgetTotal = Number(budget);
    if (!Number.isInteger(budgetTotal) || budgetTotal < 1 || budgetTotal > 100) {
      setError("Budget must be between 1 and 100 songs");
      return;
    }
    const cleanSlug = slug.trim().toLowerCase();
    if (cleanSlug && !/^[a-z0-9-]{4,40}$/.test(cleanSlug)) {
      setError("Link name: 4-40 characters, lowercase letters, digits, hyphens");
      return;
    }

    setStarting(true);
    setError(null);
    try {
      const result = await createJamSessionApi({
        name: name.trim() || undefined,
        slug: cleanSlug || undefined,
        budgetTotal,
        durationHours: Number(duration),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      track("jam_session_created");
      router.push(`/party/${result.session.id}`);
    } catch {
      toast("Failed to start the jam session", "error");
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="px-4 py-4 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-primary flex items-center gap-2">
          <Icon icon={PartyPopper} className="w-5 h-5 text-violet-400" aria-hidden="true" />
          Jam Sessions
        </h1>
        <p className="text-sm text-secondary">
          Open a party — guests scan a QR and push song prompts straight into
          your queue. Generations run on your credits; the budget caps them.
        </p>
      </div>

      {/* Create */}
      <form onSubmit={handleStart} className="bg-surface border border-border rounded-xl p-4 space-y-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Session name (optional)"
          maxLength={80}
          className="w-full px-3 py-2 bg-surface-raised border border-border rounded-lg text-sm text-primary placeholder-muted focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
        <div className="flex items-center gap-2">
          <span className="text-sm text-secondary flex-shrink-0">/jam/</span>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="link-name (optional — auto from the title)"
            maxLength={40}
            aria-label="Link name"
            className="flex-1 px-3 py-2 bg-surface-raised border border-border rounded-lg text-sm text-primary placeholder-muted focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-3 text-sm text-secondary">
            Song budget
            <input
              type="number"
              min={1}
              max={100}
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              aria-label="Song budget"
              className="w-24 px-3 py-2 bg-surface-raised border border-border rounded-lg text-sm text-primary focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </label>
          <label className="flex items-center gap-3 text-sm text-secondary">
            Ends after
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              aria-label="Session duration"
              className="px-3 py-2 bg-surface-raised border border-border rounded-lg text-sm text-primary focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="4">4 hours</option>
              <option value="12">12 hours</option>
              <option value="24">24 hours</option>
              <option value="48">48 hours</option>
            </select>
          </label>
        </div>
        {error && (
          <p className="text-sm text-red-400" role="alert" aria-live="polite">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={starting}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white transition-colors min-h-[44px]"
        >
          <Icon icon={PartyPopper} className="w-4 h-4" />
          {starting ? "Starting…" : "Start jam session"}
        </button>
      </form>

      {/* Existing sessions */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-primary">Your sessions</h2>
        {sessions === null ? (
          <p className="text-sm text-secondary">Loading…</p>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-secondary">
            No jam sessions yet — start one and put the QR on a screen.
          </p>
        ) : (
          <ul className="space-y-2">
            {sessions.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/party/${s.id}`}
                  className="flex items-center gap-3 bg-surface border border-border rounded-xl p-3 hover:bg-surface-hover transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-primary truncate">{s.name}</p>
                    <p className="text-xs text-secondary truncate">
                      {s.status === "open" ? "Live" : "Ended"} · {s.budgetUsed}/{s.budgetTotal} songs · /jam/{s.shareToken}
                    </p>
                  </div>
                  {s.status === "open" && (
                    <span className="flex-shrink-0 w-2.5 h-2.5 rounded-full bg-violet-400" aria-hidden="true" />
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

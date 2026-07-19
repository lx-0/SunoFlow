"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { FieldError } from "./ui";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api-client";

export function RssFeedsSection() {
  const [feeds, setFeeds] = useState<{ id: string; url: string; title: string | null; autoGenerate: boolean }[]>([]);
  const [newUrl, setNewUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    apiGet<{ feeds: { id: string; url: string; title: string | null; autoGenerate: boolean }[] }>("/api/rss/feeds")
      .then((data) => setFeeds(data.feeds ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const addFeed = async () => {
    const url = newUrl.trim();
    if (!url) return;
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      setError("URL must start with http:// or https://");
      return;
    }
    setError("");
    setAdding(true);
    try {
      const data = await apiPost<{ feed: { id: string; url: string; title: string | null; autoGenerate: boolean } }>("/api/rss/feeds", { url });
      setFeeds((prev) => [...prev, data.feed]);
      setNewUrl("");
    } catch {
      setError("Failed to add feed");
    } finally {
      setAdding(false);
    }
  };

  const removeFeed = async (id: string) => {
    setFeeds((prev) => prev.filter((f) => f.id !== id));
    try {
      await apiDelete(`/api/rss/feeds?id=${id}`);
    } catch {
      // ignore — optimistic removal
    }
  };

  const toggleAutoGenerate = async (id: string, current: boolean) => {
    setTogglingId(id);
    setFeeds((prev) =>
      prev.map((f) => (f.id === id ? { ...f, autoGenerate: !current } : f))
    );
    try {
      await apiPatch(`/api/rss/feeds/${id}`, { autoGenerate: !current });
    } catch {
      setFeeds((prev) =>
        prev.map((f) => (f.id === id ? { ...f, autoGenerate: current } : f))
      );
    } finally {
      setTogglingId(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") addFeed();
  };

  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-base font-semibold text-primary">RSS Feeds</h3>
        <p className="text-xs text-secondary mt-0.5">
          Add RSS feed URLs to see inspiration on the Inspire page.
        </p>
      </div>

      <div className="flex gap-2">
        <input
          type="url"
          value={newUrl}
          onChange={(e) => {
            setNewUrl(e.target.value);
            setError("");
          }}
          onKeyDown={handleKeyDown}
          placeholder="https://example.com/feed.xml"
          className={`flex-1 bg-surface-raised border rounded-lg px-3 py-2 text-base text-primary placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent ${
            error ? "border-red-500" : "border-border"
          }`}
        />
        <button
          onClick={addFeed}
          disabled={adding}
          className="flex items-center gap-1 px-3 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          <Icon icon={Plus} className="w-4 h-4" />
          {adding ? "Adding..." : "Add"}
        </button>
      </div>

      <FieldError error={error} />

      {loading ? (
        <p className="text-sm text-secondary">Loading feeds...</p>
      ) : feeds.length === 0 ? (
        <p className="text-sm text-secondary">No feeds added yet.</p>
      ) : (
        <ul className="space-y-2">
          {feeds.map((feed) => (
            <li
              key={feed.id}
              className="flex flex-col gap-1 bg-surface border border-border rounded-lg px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <span className="flex-1 text-xs text-secondary truncate">{feed.url}</span>
                <button
                  onClick={() => removeFeed(feed.id)}
                  className="text-muted hover:text-red-400 transition-colors flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
                  aria-label="Remove feed"
                >
                  <Icon icon={Trash2} className="w-4 h-4" />
                </button>
              </div>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <button
                  role="switch"
                  aria-checked={feed.autoGenerate}
                  disabled={togglingId === feed.id}
                  onClick={() => toggleAutoGenerate(feed.id, feed.autoGenerate)}
                  className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-1 disabled:opacity-50 ${
                    feed.autoGenerate ? "bg-violet-600" : "bg-gray-300 dark:bg-gray-600"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${
                      feed.autoGenerate ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
                <span className="text-xs text-secondary">
                  Auto-generate when new items arrive
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { STYLE_OPTIONS } from "./constants";
import { apiGet, apiPost, apiPatch } from "@/lib/api-client";
import {
  InstagramPostsSection,
  NotificationPreferencesSection,
  OfflineCacheSection,
  PlaybackDefaultsSection,
  ThemeSection,
} from "./local-preferences-sections";
import { EmailNotificationsSection, PushNotificationsSection, QuietHoursSection } from "./notification-sections";
import { RssFeedsSection } from "./rss-feed-sections";
import { Toast } from "./ui";
import { useAutoDismissToast } from "./use-auto-dismiss-toast";

export function PreferencesTab() {
  const [defaultStyle, setDefaultStyle] = useState<string | null>(null);
  const [preferredGenres, setPreferredGenres] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast, showToast } = useAutoDismissToast();
  const [genreInput, setGenreInput] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    apiGet<{ defaultStyle?: string; preferredGenres?: string[] }>("/api/profile/preferences")
      .then((data) => {
        setDefaultStyle(data.defaultStyle ?? null);
        const genres = data.preferredGenres ?? [];
        setPreferredGenres(genres);
        if (genres.length === 0) {
          setSuggestions(STYLE_OPTIONS.slice(0, 8));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const fetchSuggestions = useCallback(async (genres: string[], partial?: string) => {
    setLoadingSuggestions(true);
    try {
      const data = await apiPost<{ suggestions?: string[] }>("/api/profile/genres/suggest", { currentGenres: genres, partial });
      setSuggestions(data.suggestions ?? []);
    } catch {
      // ignore
    } finally {
      setLoadingSuggestions(false);
    }
  }, []);

  const addGenre = (genre: string) => {
    const normalized = genre.trim().toLowerCase().slice(0, 50);
    if (!normalized) return;
    if (preferredGenres.length >= 10) return;
    if (preferredGenres.includes(normalized)) return;
    const next = [...preferredGenres, normalized];
    setPreferredGenres(next);
    setGenreInput("");
    fetchSuggestions(next);
  };

  const removeGenre = (genre: string) => {
    const next = preferredGenres.filter((g) => g !== genre);
    setPreferredGenres(next);
    if (next.length === 0) {
      setSuggestions(STYLE_OPTIONS.slice(0, 8));
    } else {
      fetchSuggestions(next);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addGenre(genreInput);
    } else if (e.key === "Backspace" && !genreInput && preferredGenres.length > 0) {
      removeGenre(preferredGenres[preferredGenres.length - 1]);
    }
  };

  const handleSavePreferences = async () => {
    setSaving(true);
    try {
      await apiPatch("/api/profile/preferences", { defaultStyle, preferredGenres });
      showToast("Preferences saved", "success");
    } catch {
      showToast("Network error", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} />}
      <div className="space-y-6">
        <section className="space-y-3">
          <div>
            <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200">Default Generation Style</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Pre-fill the style field when generating new music.</p>
          </div>
          <select
            value={defaultStyle ?? ""}
            onChange={(e) => setDefaultStyle(e.target.value || null)}
            className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-base text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          >
            <option value="">No default</option>
            {STYLE_OPTIONS.map((style) => (
              <option key={style} value={style}>
                {style.charAt(0).toUpperCase() + style.slice(1)}
              </option>
            ))}
          </select>
        </section>

        <div className="border-t border-gray-200 dark:border-gray-800" />

        <section className="space-y-3">
          <div>
            <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200">Preferred Genres</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Type a genre and press Enter to add. Up to 10. ({preferredGenres.length}/10)
            </p>
          </div>

          <div
            className="flex flex-wrap gap-2 min-h-[44px] w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-violet-500 focus-within:border-transparent cursor-text"
            onClick={() => inputRef.current?.focus()}
          >
            {preferredGenres.map((genre) => (
              <span
                key={genre}
                className="flex items-center gap-1 px-2.5 py-1 bg-violet-100 dark:bg-violet-900/40 text-violet-800 dark:text-violet-200 rounded-full text-sm font-medium"
              >
                {genre.charAt(0).toUpperCase() + genre.slice(1)}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeGenre(genre);
                  }}
                  className="text-violet-500 hover:text-violet-700 dark:hover:text-violet-300 leading-none"
                  aria-label={`Remove ${genre}`}
                >
                  ×
                </button>
              </span>
            ))}
            {preferredGenres.length < 10 && (
              <input
                ref={inputRef}
                type="text"
                value={genreInput}
                onChange={(e) => setGenreInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={preferredGenres.length === 0 ? "e.g. dream pop, afrobeat, dark jazz…" : ""}
                className="flex-1 min-w-[120px] bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none"
              />
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {preferredGenres.length === 0 ? "Popular genres — click to add:" : "Suggested for you — click to add:"}
              </p>
              {preferredGenres.length > 0 && (
                <button
                  type="button"
                  onClick={() => fetchSuggestions(preferredGenres)}
                  disabled={loadingSuggestions}
                  className="text-xs text-violet-600 dark:text-violet-400 hover:underline disabled:opacity-50"
                >
                  {loadingSuggestions ? "Loading…" : "Refresh suggestions"}
                </button>
              )}
            </div>
            {loadingSuggestions ? (
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                ))}
              </div>
            ) : suggestions.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => addGenre(s)}
                    disabled={preferredGenres.includes(s) || preferredGenres.length >= 10}
                    className="px-3 py-1.5 rounded-full text-sm font-medium border border-dashed border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-violet-500 hover:text-violet-600 dark:hover:text-violet-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    + {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </section>

        <div className="border-t border-gray-200 dark:border-gray-800" />

        <button
          onClick={handleSavePreferences}
          disabled={saving}
          className="w-full py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors min-h-[44px]"
        >
          {saving ? "Saving..." : "Save Preferences"}
        </button>

        <div className="border-t border-gray-200 dark:border-gray-800" />

        <ThemeSection />

        <div className="border-t border-gray-200 dark:border-gray-800" />

        <NotificationPreferencesSection />

        <div className="border-t border-gray-200 dark:border-gray-800" />

        <EmailNotificationsSection />

        <div className="border-t border-gray-200 dark:border-gray-800" />

        <PushNotificationsSection />

        <div className="border-t border-gray-200 dark:border-gray-800" />

        <QuietHoursSection />

        <div className="border-t border-gray-200 dark:border-gray-800" />

        <PlaybackDefaultsSection />

        <div className="border-t border-gray-200 dark:border-gray-800" />

        <RssFeedsSection />

        <div className="border-t border-gray-200 dark:border-gray-800" />

        <InstagramPostsSection />

        <div className="border-t border-gray-200 dark:border-gray-800" />

        <OfflineCacheSection />
      </div>
    </>
  );
}

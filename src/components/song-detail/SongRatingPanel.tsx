"use client";

import { useEffect, useState } from "react";
import {
  HandThumbUpIcon,
  HandThumbDownIcon,
} from "@heroicons/react/24/solid";
import { HandThumbUpIcon as HandThumbUpOutlineIcon, HandThumbDownIcon as HandThumbDownOutlineIcon } from "@heroicons/react/24/outline";
import { getRating, type SongRating } from "@/lib/ratings";
import { fetchEffect } from "@/lib/fetch-effect";
import { useToast } from "../Toast";
import { StarPicker } from "../StarPicker";

type ThumbsRating = "thumbs_up" | "thumbs_down" | null;

interface SongRatingPanelProps {
  songId: string;
  initialRating: number | null;
  initialRatingNote: string | null;
}

export function SongRatingPanel({ songId, initialRating, initialRatingNote }: SongRatingPanelProps) {
  const { toast } = useToast();

  const [rating, setRatingState] = useState<SongRating>({
    stars: initialRating ?? 0,
    note: initialRatingNote ?? "",
  });
  const [saved, setSaved] = useState(false);
  const [savingRating, setSavingRating] = useState(false);
  const [noteDraft, setNoteDraft] = useState(initialRatingNote ?? "");

  const [thumbsRating, setThumbsRating] = useState<ThumbsRating>(null);
  const [savingThumbs, setSavingThumbs] = useState(false);

  useEffect(() => {
    if (initialRating) return;
    let cancelled = false;
    getRating(songId).then((existing) => {
      if (cancelled || !existing) return;
      setRatingState(existing);
      setNoteDraft(existing.note);
    });
    return () => { cancelled = true; };
  }, [songId, initialRating]);

  useEffect(
    () =>
      fetchEffect<{ rating: ThumbsRating }>(
        `/api/songs/${songId}/feedback`,
        (data) => setThumbsRating(data.rating),
      ),
    [songId],
  );

  async function handleThumbsFeedback(value: "thumbs_up" | "thumbs_down") {
    if (savingThumbs) return;
    setSavingThumbs(true);
    try {
      const res = await fetch(`/api/songs/${songId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: value }),
      });
      if (res.ok) setThumbsRating(value);
    } catch {
      toast("Failed to save feedback", "error");
    } finally {
      setSavingThumbs(false);
    }
  }

  async function handleSaveRating() {
    if (rating.stars === 0 || savingRating) return;
    const r: SongRating = { stars: rating.stars, note: noteDraft.trim() };
    setSavingRating(true);
    try {
      const res = await fetch(`/api/songs/${songId}/rating`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stars: r.stars, note: r.note }),
      });
      if (!res.ok) throw new Error("Failed to save rating");
      setRatingState(r);
      setSaved(true);
    } catch {
      toast("Failed to save rating", "error");
    } finally {
      setSavingRating(false);
    }
  }

  return (
    <>
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 space-y-3 transition-shadow duration-200 hover:shadow-md">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 tracking-wide">Generation Quality</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">Was this generation good?</p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => handleThumbsFeedback("thumbs_up")}
            disabled={savingThumbs}
            aria-label="Thumbs up — good generation"
            aria-pressed={thumbsRating === "thumbs_up"}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
              thumbsRating === "thumbs_up"
                ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-300 dark:border-green-700"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-600 hover:border-green-200"
            }`}
          >
            {thumbsRating === "thumbs_up" ? (
              <HandThumbUpIcon className="h-5 w-5" aria-hidden="true" />
            ) : (
              <HandThumbUpOutlineIcon className="h-5 w-5" aria-hidden="true" />
            )}
            Good
          </button>
          <button
            type="button"
            onClick={() => handleThumbsFeedback("thumbs_down")}
            disabled={savingThumbs}
            aria-label="Thumbs down — poor generation"
            aria-pressed={thumbsRating === "thumbs_down"}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
              thumbsRating === "thumbs_down"
                ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-700"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 hover:border-red-200"
            }`}
          >
            {thumbsRating === "thumbs_down" ? (
              <HandThumbDownIcon className="h-5 w-5" aria-hidden="true" />
            ) : (
              <HandThumbDownOutlineIcon className="h-5 w-5" aria-hidden="true" />
            )}
            Poor
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 space-y-3 transition-shadow duration-200 hover:shadow-md">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 tracking-wide">Your Rating</h2>

        <StarPicker value={rating.stars} onChange={(stars) => { setRatingState((r) => ({ ...r, stars })); setSaved(false); }} />

        <textarea
          value={noteDraft}
          onChange={(e) => {
            setNoteDraft(e.target.value);
            setSaved(false);
          }}
          placeholder="Add a note (optional)..."
          aria-label="Rating note"
          rows={3}
          className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-base text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 resize-none focus:outline-none focus:border-violet-500 transition-colors"
        />

        <div className="flex items-center gap-3">
          <button
            onClick={handleSaveRating}
            disabled={rating.stars === 0}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:bg-gray-200 dark:disabled:bg-gray-800 disabled:text-gray-400 dark:disabled:text-gray-600 text-white text-sm font-medium rounded-lg transition-colors min-h-[44px]"
          >
            Save rating
          </button>
          {saved && (
            <span className="text-sm text-green-400">Saved</span>
          )}
        </div>
      </div>
    </>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { X, ThumbsUp, ThumbsDown } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { track } from "@/lib/analytics";
import { apiPost } from "@/lib/api-client";
import { fetchWithTimeout } from "@/lib/fetch-client";

export type FeedbackSource = "song_generation" | "playlist_creation";

interface InAppFeedbackWidgetProps {
  source: FeedbackSource;
  entityId: string;
  onClose: () => void;
}

const QUESTIONS: Record<FeedbackSource, string> = {
  song_generation: "How was this result?",
  playlist_creation: "How was this experience?",
};

const LS_KEY = (source: FeedbackSource, id: string) =>
  `sunoflow-widget-feedback-${source}-${id}`;

function storeFeedbackSubmitted(source: FeedbackSource, id: string) {
  try {
    localStorage.setItem(LS_KEY(source, id), "submitted");
  } catch {
    // localStorage unavailable
  }
}

export function hasFeedbackBeenSubmitted(source: FeedbackSource, id: string): boolean {
  try {
    return localStorage.getItem(LS_KEY(source, id)) !== null;
  } catch {
    return false;
  }
}

export function InAppFeedbackWidget({ source, entityId, onClose }: InAppFeedbackWidgetProps) {
  const [rating, setRating] = useState<"thumbs_up" | "thumbs_down" | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  function handleThumbClick(value: "thumbs_up" | "thumbs_down") {
    setRating(value);
    setExpanded(true);
  }

  const [doSubmit, submitting] = useAsyncAction(async () => {
    try {
      if (source === "song_generation") {
        await apiPost(`/api/songs/${entityId}/feedback`, { rating });
      } else {
        await apiPost("/api/feedback", {
          category: "general",
          score: rating === "thumbs_up" ? 5 : 1,
          comment: comment.trim() || undefined,
          pageUrl: window.location.href,
        });
      }

      // Optional webhook – fire-and-forget
      const webhookUrl = process.env.NEXT_PUBLIC_FEEDBACK_WEBHOOK_URL;
      if (webhookUrl) {
        fetchWithTimeout(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            source,
            entityId,
            rating,
            comment: comment.trim() || undefined,
          }),
        }).catch(() => {});
      }

      track("feedback_submitted", { source, rating });
    } catch {
      // Silently fail — non-critical
    }

    storeFeedbackSubmitted(source, entityId);
    setSubmitted(true);
    closeTimerRef.current = setTimeout(onClose, 1500);
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!rating) return;
    doSubmit();
  }

  function handleDismiss() {
    storeFeedbackSubmitted(source, entityId);
    onClose();
  }

  const question = QUESTIONS[source];

  return (
    <div
      role="region"
      aria-label="Feedback widget"
      className="fixed bottom-4 right-4 z-40 w-72 bg-surface border border-border rounded-xl shadow-xl animate-slide-in"
    >
      {submitted ? (
        <div className="flex items-center gap-2 px-4 py-4">
          <span className="text-green-500 text-lg" aria-hidden="true">✓</span>
          <p className="text-sm font-medium text-primary">Thanks for your feedback!</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="flex items-start justify-between px-4 pt-4 pb-2">
            <p className="text-sm font-medium text-primary">{question}</p>
            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Dismiss feedback"
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0 ml-2 min-w-[32px] min-h-[32px] flex items-center justify-center"
            >
              <Icon icon={X} className="w-4 h-4" />
            </button>
          </div>

          <div className="flex gap-3 px-4 pb-3" role="group" aria-label="Rating">
            <button
              type="button"
              onClick={() => handleThumbClick("thumbs_up")}
              aria-label="Thumbs up"
              aria-pressed={rating === "thumbs_up"}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors min-h-[40px] ${
                rating === "thumbs_up"
                  ? "bg-green-50 dark:bg-green-900/30 border-green-400 text-green-700 dark:text-green-300"
                  : "border-border text-secondary hover:border-border-strong"
              }`}
            >
              {rating === "thumbs_up" ? (
                <Icon icon={ThumbsUp} fill="currentColor" className="w-4 h-4" aria-hidden="true" />
              ) : (
                <Icon icon={ThumbsUp} className="w-4 h-4" aria-hidden="true" />
              )}
              Good
            </button>
            <button
              type="button"
              onClick={() => handleThumbClick("thumbs_down")}
              aria-label="Thumbs down"
              aria-pressed={rating === "thumbs_down"}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors min-h-[40px] ${
                rating === "thumbs_down"
                  ? "bg-red-50 dark:bg-red-900/30 border-red-400 text-red-700 dark:text-red-300"
                  : "border-border text-secondary hover:border-border-strong"
              }`}
            >
              {rating === "thumbs_down" ? (
                <Icon icon={ThumbsDown} fill="currentColor" className="w-4 h-4" aria-hidden="true" />
              ) : (
                <Icon icon={ThumbsDown} className="w-4 h-4" aria-hidden="true" />
              )}
              Poor
            </button>
          </div>

          {expanded && (
            <div className="px-4 pb-3 space-y-2">
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Tell us more (optional)…"
                rows={2}
                maxLength={500}
                aria-label="Additional feedback"
                className="w-full bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm text-primary placeholder-muted resize-none focus:outline-none focus:border-violet-500"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!rating || submitting}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-violet-600 hover:bg-violet-500 disabled:bg-surface-hover disabled:text-gray-500 rounded-lg transition-colors min-h-[36px]"
                >
                  {submitting ? "Sending…" : "Send"}
                </button>
              </div>
            </div>
          )}
        </form>
      )}
    </div>
  );
}

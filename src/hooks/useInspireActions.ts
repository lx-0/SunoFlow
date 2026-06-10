"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import type { UnifiedFeedItem } from "./useInspireFilters";
import type { FeedItem } from "./useRssFeeds";
import type { InstagramPost } from "./useInstagramPosts";
import type { PendingFeedGenerationItem } from "./usePendingGenerations";
import type { DigestItem } from "./useTodaysPicks";

interface UseInspireActionsOptions {
  approvePending: (item: PendingFeedGenerationItem) => Promise<void>;
  dismissPending: (id: string) => Promise<void>;
}

const normalizeText = (text: string) => text.replace(/\s+/g, " ").trim();
// Article bodies arrive enriched up to ~5000 chars; keep that as the basis so
// the whole article — not a one-sentence excerpt — drives lyrics generation.
const ARTICLE_MAX = 5000;
// Ceiling for the full lyricsprompt (article + framing), kept under the
// /api/lyrics/generate limit and a sane query-string length.
const BASIS_MAX = 5800;

export function useInspireActions({ approvePending, dismissPending }: UseInspireActionsOptions) {
  const router = useRouter();
  const { toast } = useToast();

  const handleCardAction = useCallback(
    async (item: UnifiedFeedItem) => {
      try {
        switch (item.sourceType) {
          case "rss": {
            const rssItem = item.original as FeedItem;
            const title = normalizeText(rssItem.title || "");
            // Full link-followed article as the generation basis, not a
            // one-sentence excerpt. rssItem.content is the enriched body (up to
            // ~5000 chars); fall back to description only if content is missing.
            const body = normalizeText(rssItem.content || rssItem.description || "").slice(0, ARTICLE_MAX);
            const topics =
              rssItem.topics && rssItem.topics.length > 0
                ? normalizeText(rssItem.topics.join(", "))
                : "";

            const parts: string[] = [];
            if (title) parts.push(title);
            if (body) parts.push(body);
            if (topics) parts.push(`Themes: ${topics}`);
            if (rssItem.mood && rssItem.mood !== "neutral") parts.push(`Mood: ${rssItem.mood}`);
            const lyricsPrompt = parts.join("\n\n").slice(0, BASIS_MAX);

            const params = new URLSearchParams();
            params.set("lyricsprompt", lyricsPrompt);
            const style = rssItem.suggestedStyle || (rssItem.mood !== "neutral" ? rssItem.mood : "");
            if (style) params.set("tags", style);
            router.push(`/generate?${params.toString()}`);
            break;
          }
          case "instagram": {
            const post = item.original as InstagramPost;
            router.push(`/generate?prompt=${encodeURIComponent(post.promptSuggestion)}`);
            break;
          }
          case "picks": {
            const digestItem = item.original as DigestItem;
            // Prefer the full article body (now carried on the digest item) as
            // the lyrics-generator basis; suggestedPrompt is only a short label.
            const article = normalizeText(digestItem.content || "").slice(0, ARTICLE_MAX);
            const params = new URLSearchParams();
            if (article) {
              const title = normalizeText(digestItem.title || "");
              const basis = [title, article].filter(Boolean).join("\n\n").slice(0, BASIS_MAX);
              params.set("lyricsprompt", basis);
              const style =
                digestItem.mood && digestItem.mood !== "neutral"
                  ? [digestItem.mood, ...digestItem.topics.slice(0, 3)].filter(Boolean).join(", ")
                  : digestItem.topics.slice(0, 3).join(", ");
              if (style) params.set("tags", style);
            } else {
              params.set("prompt", digestItem.suggestedPrompt);
            }
            router.push(`/generate?${params.toString()}`);
            break;
          }
          case "pending":
            break;
        }
      } catch {
        toast("Could not open generator. Please try again.", "error");
      }
    },
    [router, toast]
  );

  const handleApproveCard = useCallback(
    (item: UnifiedFeedItem) => {
      if (item.sourceType === "pending") {
        approvePending(item.original as PendingFeedGenerationItem);
      }
    },
    [approvePending]
  );

  const handleDismissCard = useCallback(
    (item: UnifiedFeedItem) => {
      if (item.sourceType === "pending") {
        dismissPending((item.original as PendingFeedGenerationItem).id);
      }
    },
    [dismissPending]
  );

  return { handleCardAction, handleApproveCard, handleDismissCard };
}

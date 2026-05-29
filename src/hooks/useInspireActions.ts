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

export function useInspireActions({ approvePending, dismissPending }: UseInspireActionsOptions) {
  const router = useRouter();
  const { toast } = useToast();

  const handleCardAction = useCallback(
    async (item: UnifiedFeedItem) => {
      try {
        switch (item.sourceType) {
          case "rss": {
            const rssItem = item.original as FeedItem;
            const normalizeText = (text: string) => text.replace(/\s+/g, " ").trim();
            const clamp = (text: string, max: number) =>
              text.length > max ? `${text.slice(0, Math.max(0, max - 1)).trimEnd()}…` : text;

            const title = clamp(normalizeText(rssItem.title || ""), 120);
            const bodySource = rssItem.content || rssItem.description || "";
            const body = clamp(normalizeText(bodySource), 520);
            const topics =
              rssItem.topics && rssItem.topics.length > 0
                ? clamp(normalizeText(rssItem.topics.join(", ")), 120)
                : "";

            const parts: string[] = [];
            if (title) parts.push(title);
            if (body) parts.push(body);
            if (topics) parts.push(`Themes: ${topics}`);
            if (rssItem.mood && rssItem.mood !== "neutral") parts.push(`Mood: ${rssItem.mood}`);
            const lyricsPrompt = clamp(parts.join("\n\n"), 800);

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
            router.push(`/generate?prompt=${encodeURIComponent(digestItem.suggestedPrompt)}`);
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

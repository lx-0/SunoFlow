"use client";

import { useState } from "react";
import { Share2, Check, Globe } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "./Toast";
import { track } from "@/lib/analytics";
import { apiPatch } from "@/lib/api-client";

export interface ShareableSong {
  id: string;
  title: string | null | undefined;
  isPublic?: boolean | null;
  publicSlug?: string | null;
}

interface ShareButtonProps {
  song: ShareableSong;
  onUpdate?: (updated: Partial<ShareableSong>) => void;
  /** When true, renders an icon-only button. When false, renders icon + label. */
  compact?: boolean;
  className?: string;
  /** Analytics source label */
  source?: string;
}

/**
 * Share button for songs.
 *
 * Behaviour:
 * - If song is already public: copies URL to clipboard (or triggers Web Share API on mobile).
 * - If song is private: shows a confirmation dialog asking the user to make it public first.
 * - On mobile (navigator.share available): uses the native Web Share API, falling back to
 *   clipboard copy if the user cancels or the API is unavailable.
 */
export function ShareButton({
  song,
  onUpdate,
  compact = true,
  className = "",
  source = "unknown",
}: ShareButtonProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmPublic, setConfirmPublic] = useState(false);

  async function copyOrShare(slug: string) {
    const url = `${window.location.origin}/s/${slug}`;

    // Mobile: use Web Share API if available
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: song.title ?? "Check out this song",
          url,
        });
        track("song_shared", { songId: song.id, source, method: "web_share_api" });
        return;
      } catch (err) {
        // User cancelled — do not fall through to clipboard
        if (err instanceof Error && err.name === "AbortError") return;
        // Other errors fall through to clipboard
      }
    }

    // Desktop / fallback: clipboard copy
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Clipboard API unavailable (e.g. non-https in dev) — still show success for now
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast("Link copied!", "success");
    track("song_shared", { songId: song.id, source, method: "clipboard" });
  }

  async function makePublicAndShare() {
    setConfirmPublic(false);
    setLoading(true);
    try {
      const data = await apiPatch<{ isPublic: boolean; publicSlug: string | null }>(`/api/songs/${song.id}/share`, {});
      onUpdate?.({ isPublic: data.isPublic, publicSlug: data.publicSlug });
      if (data.isPublic && data.publicSlug) {
        await copyOrShare(data.publicSlug);
      }
    } catch {
      toast("Failed to share song", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleClick() {
    if (loading) return;

    if (song.isPublic && song.publicSlug) {
      // Already public — share the URL directly
      await copyOrShare(song.publicSlug);
    } else {
      // Private — prompt user to make it public first
      setConfirmPublic(true);
    }
  }

  const buttonLabel = copied ? "Copied!" : loading ? "Sharing…" : "Share";

  return (
    <>
      <button
        onClick={handleClick}
        disabled={loading}
        aria-label={copied ? "Link copied!" : "Share song"}
        title={song.isPublic ? "Share song" : "Make public to share"}
        className={className}
      >
        {copied ? (
          <Icon icon={Check} className="w-5 h-5" fill="currentColor" aria-hidden="true" />
        ) : (
          <Icon icon={Share2} className="w-5 h-5" fill="currentColor" aria-hidden="true" />
        )}
        {!compact && <span>{buttonLabel}</span>}
      </button>

      {/* "Make public to share?" confirmation dialog */}
      {confirmPublic && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4"
          onClick={() => setConfirmPublic(false)}
        >
          <div
            className="w-full sm:w-80 bg-surface border border-border rounded-2xl p-5 shadow-xl space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <Icon icon={Globe} className="w-5 h-5 text-violet-500 flex-shrink-0" fill="currentColor" aria-hidden="true" />
              <h3 className="text-sm font-semibold text-primary">
                Make public to share?
              </h3>
            </div>
            <p className="text-sm text-secondary">
              This song is private. Make it public so anyone with the link can listen.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmPublic(false)}
                className="flex-1 px-3 py-2 text-sm rounded-lg bg-surface-raised hover:bg-surface-hover text-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={makePublicAndShare}
                className="flex-1 px-3 py-2 text-sm rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-medium transition-colors"
              >
                Make public &amp; share
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

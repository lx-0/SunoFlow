"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { type SubscriptionTier } from "@/lib/feature-gates";
import { track } from "@/lib/analytics";
import {
  PlayIcon,
  PauseIcon,
  PaintBrushIcon,
} from "@heroicons/react/24/solid";
import { useOfflineCache } from "@/hooks/useOfflineCache";
import type { SunoSong } from "@/lib/sunoapi";
import { useToast } from "./Toast";
import { useQueue } from "./QueueContext";
import { TagInput } from "./TagInput";
import { CoverArtImage } from "./CoverArtImage";
import { generateCoverArtVariants } from "@/lib/cover-art-generator";
import { SongMetadataCard } from "./SongMetadataCard";
import { SongActionsBar } from "./SongActionsBar";
import { AddToPlaylistButton } from "./AddToPlaylistButton";
import { SongLyricsSection } from "./SongLyricsSection";
import { SongHeroSection } from "./song-detail/SongHeroSection";
import { SongAppealBanner } from "./song-detail/SongAppealBanner";
import { SongExportPanel } from "./song-detail/SongExportPanel";
import { SongRemixPanel } from "./song-detail/SongRemixPanel";
import { SongVariationTree } from "./song-detail/SongVariationTree";
import { SongRatingPanel } from "./song-detail/SongRatingPanel";
import type { SongTag, VariationSummary } from "./song-detail/types";

const EmbedCodeModal = dynamic(() => import("./EmbedCodeModal").then((m) => m.EmbedCodeModal));
const ReportModal = dynamic(() => import("./ReportModal").then((m) => m.ReportModal));
const CoverArtModal = dynamic(() => import("./CoverArtModal").then((m) => m.CoverArtModal));
const RecommendationSection = dynamic(() => import("./SongRecommendations").then((m) => m.RecommendationSection));

interface SongDetailViewProps {
  song: SunoSong;
  isFavorite?: boolean;
  favoriteCount?: number;
  sunoJobId?: string | null;
  isPublic?: boolean;
  publicSlug?: string | null;
  isHidden?: boolean;
  isInstrumental?: boolean;
  initialRating?: number | null;
  initialRatingNote?: string | null;
  songTags?: SongTag[];
  variations?: VariationSummary[];
  variationCount?: number;
  maxVariations?: number;
  parentSongId?: string | null;
  parentSongTitle?: string | null;
  lyricsEdited?: string | null;
  isArchived?: boolean;
}

export function SongDetailView({
  song,
  isFavorite: initialFavorite = false,
  favoriteCount: initialFavoriteCount = 0,
  sunoJobId,
  isPublic: initialIsPublic = false,
  publicSlug: initialPublicSlug = null,
  isHidden = false,
  isInstrumental = false,
  initialRating = null,
  initialRatingNote = null,
  songTags: initialSongTags = [],
  variations: initialVariations = [],
  variationCount: initialVariationCount = 0,
  maxVariations = 5,
  parentSongId = null,
  parentSongTitle = null,
  lyricsEdited = null,
  isArchived: initialIsArchived = false,
}: SongDetailViewProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const userTier = ((session?.user as unknown as Record<string, unknown>)?.subscriptionTier as SubscriptionTier) ?? "free";
  const { toast } = useToast();
  const { cachedIds, saving: offlineSaving, saveOffline, removeOffline } = useOfflineCache();
  const isCached = cachedIds.has(song.id);
  const isSavingOffline = offlineSaving.has(song.id);
  const { playNext, addToQueue, togglePlay, isPlaying, currentIndex, queue } = useQueue();
  const currentSong = currentIndex >= 0 ? queue[currentIndex] : null;
  const isThisSongPlaying = isPlaying && currentSong?.id === song.id;

  const [isFavorite, setIsFavorite] = useState(initialFavorite);
  const [favoriteCount, setFavoriteCount] = useState(initialFavoriteCount);

  // Share / visibility state
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [publicSlug, setPublicSlug] = useState(initialPublicSlug);
  const [sharing, setSharing] = useState(false);
  const [confirmPublicOpen, setConfirmPublicOpen] = useState(false);

  // Report & embed modals
  const [reportOpen, setReportOpen] = useState(false);
  const [embedOpen, setEmbedOpen] = useState(false);
  const [embedTheme, setEmbedTheme] = useState<"dark" | "light">("dark");
  const [embedAutoplay, setEmbedAutoplay] = useState(false);

  // Archive state
  const [isArchived, setIsArchived] = useState(initialIsArchived);
  const [archiving, setArchiving] = useState(false);
  const [confirmArchiveOpen, setConfirmArchiveOpen] = useState(false);

  // Cover art state
  const [coverArtModalOpen, setCoverArtModalOpen] = useState(false);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(song.imageUrl ?? null);
  const generatedFallbackUrl = generateCoverArtVariants({ songId: song.id, title: song.title, tags: song.tags })[0].dataUrl;

  const hasAudio = Boolean(song.audioUrl);

  async function handleToggleFavorite() {
    const prev = isFavorite;
    const prevCount = favoriteCount;
    const newFav = !prev;
    setIsFavorite(newFav);
    setFavoriteCount(newFav ? prevCount + 1 : Math.max(0, prevCount - 1));
    try {
      const res = await fetch(`/api/songs/${song.id}/favorite`, {
        method: newFav ? "POST" : "DELETE",
      });
      if (!res.ok) {
        setIsFavorite(prev);
        setFavoriteCount(prevCount);
        toast("Failed to update favorite", "error");
      } else {
        const data = await res.json();
        setFavoriteCount(data.favoriteCount);
        toast(newFav ? "Added to favorites" : "Removed from favorites", "success");
      }
    } catch {
      setIsFavorite(prev);
      setFavoriteCount(prevCount);
      toast("Failed to update favorite", "error");
    }
  }

  async function setVisibility(visibility: "public" | "private") {
    setSharing(true);
    try {
      const res = await fetch(`/api/songs/${song.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibility }),
      });
      if (!res.ok) {
        toast("Failed to update visibility", "error");
        return;
      }
      const data = await res.json();
      setIsPublic(data.isPublic);
      setPublicSlug(data.publicSlug);

      if (data.isPublic && data.publicSlug) {
        const url = `${window.location.origin}/s/${data.publicSlug}`;
        await navigator.clipboard.writeText(url);
        toast("Public link copied to clipboard", "success");
        track("song_shared", { songId: song.id, source: "song_detail" });
      } else {
        toast("Song is now private", "success");
      }
    } catch {
      toast("Failed to update visibility", "error");
    } finally {
      setSharing(false);
    }
  }

  function handleVisibilityToggle() {
    if (!isPublic) {
      setConfirmPublicOpen(true);
    } else {
      setVisibility("private");
    }
  }

  async function handleCopyLink() {
    if (!publicSlug) return;
    const url = `${window.location.origin}/s/${publicSlug}`;

    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: song.title ?? "Check out this song", url });
        track("song_shared", { songId: song.id, source: "song_detail", method: "web_share_api" });
        return;
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
      }
    }

    await navigator.clipboard.writeText(url);
    toast("Link copied!", "success");
    track("song_link_copied", { songId: song.id, source: "song_detail" });
  }

  function handleShareOnX() {
    if (!publicSlug) return;
    const url = `${window.location.origin}/s/${publicSlug}`;
    const songTitle = song.title ?? "Check out this song";
    const tweetText = `${songTitle} — listen on SunoFlow`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(url)}`;
    window.open(twitterUrl, "_blank", "noopener,noreferrer");
    track("song_shared", { songId: song.id, source: "song_detail", method: "twitter" });
  }

  async function handleArchive() {
    setArchiving(true);
    try {
      const res = await fetch(`/api/songs/${song.id}/archive`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast(data.error || "Failed to archive song", "error");
        return;
      }
      setIsArchived(true);
      toast("Song archived", "success");
      router.push("/library");
    } catch {
      toast("Failed to archive song", "error");
    } finally {
      setArchiving(false);
    }
  }

  async function handleRestore() {
    setArchiving(true);
    try {
      const res = await fetch(`/api/songs/${song.id}/restore`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast(data.error || "Failed to restore song", "error");
        return;
      }
      setIsArchived(false);
      toast("Song restored", "success");
    } catch {
      toast("Failed to restore song", "error");
    } finally {
      setArchiving(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <SongHeroSection
        songId={song.id}
        title={song.title}
        isHidden={isHidden}
        coverImageUrl={coverImageUrl}
        generatedFallbackUrl={generatedFallbackUrl}
        isFavorite={isFavorite}
        favoriteCount={favoriteCount}
        onToggleFavorite={handleToggleFavorite}
        onOpenCoverArt={() => setCoverArtModalOpen(true)}
      />

      <div className="px-4 space-y-6">
        <SongAppealBanner songId={song.id} isHidden={isHidden} />

        <SongMetadataCard
          tags={song.tags}
          duration={song.duration}
          createdAt={song.createdAt}
          model={song.model}
          ratingStars={initialRating ?? 0}
          sunoJobId={sunoJobId}
        />

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 space-y-2">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 tracking-wide">Tags</h2>
          <TagInput songId={song.id} initialTags={initialSongTags} />
        </div>

        {hasAudio ? (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 flex items-center justify-center gap-3">
            <button
              onClick={() =>
                togglePlay({ id: song.id, title: song.title, audioUrl: song.audioUrl!, imageUrl: coverImageUrl ?? null, duration: song.duration ?? null, lyrics: song.lyrics })
              }
              aria-label={isThisSongPlaying ? "Pause" : "Play"}
              className="flex items-center gap-2 px-6 py-3 text-sm font-medium rounded-xl bg-violet-600 hover:bg-violet-500 text-white shadow-sm transition-all duration-200 active:scale-95 min-h-[44px]"
            >
              {isThisSongPlaying ? (
                <PauseIcon className="w-5 h-5" aria-hidden="true" />
              ) : (
                <PlayIcon className="w-5 h-5" aria-hidden="true" />
              )}
              {isThisSongPlaying ? "Pause" : "Play"}
            </button>
            <AddToPlaylistButton songId={song.id} songTitle={song.title} variant="button" />
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 flex items-center justify-center gap-3">
            <span className="text-sm text-gray-400 dark:text-gray-600">No audio available</span>
            <AddToPlaylistButton songId={song.id} songTitle={song.title} variant="button" />
          </div>
        )}

        <SongActionsBar
          song={song}
          hasAudio={hasAudio}
          isPublic={isPublic}
          publicSlug={publicSlug}
          isCached={isCached}
          isSavingOffline={isSavingOffline}
          sharing={sharing}
          coverImageUrl={coverImageUrl}
          onVisibilityToggle={handleVisibilityToggle}
          onCopyLink={handleCopyLink}
          onShareOnX={handleShareOnX}
          onEmbedOpen={() => setEmbedOpen(true)}
          onReportOpen={() => setReportOpen(true)}
          onSaveOffline={() => saveOffline({ id: song.id, title: song.title, imageUrl: song.imageUrl ?? null })}
          onRemoveOffline={() => removeOffline(song.id)}
          onPlayNext={() => {
            playNext({ id: song.id, title: song.title, audioUrl: song.audioUrl!, imageUrl: coverImageUrl ?? null, duration: song.duration ?? null, lyrics: song.lyrics });
            toast("Playing next", "success");
          }}
          onAddToQueue={() => {
            addToQueue({ id: song.id, title: song.title, audioUrl: song.audioUrl!, imageUrl: coverImageUrl ?? null, duration: song.duration ?? null, lyrics: song.lyrics });
            toast("Added to queue", "success");
          }}
          isArchived={isArchived}
          archiving={archiving}
          onArchive={() => setConfirmArchiveOpen(true)}
          onRestore={handleRestore}
        />

        {/* Make public confirmation dialog */}
        {confirmPublicOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-labelledby="confirm-public-title">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4">
              <h2 id="confirm-public-title" className="text-lg font-semibold text-gray-900 dark:text-white">Make song public?</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                This song will be visible to anyone with the link.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setConfirmPublicOpen(false)}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => { setConfirmPublicOpen(false); setVisibility("public"); }}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-violet-600 hover:bg-violet-500 text-white transition-colors"
                >
                  Make public
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Archive confirmation dialog */}
        {confirmArchiveOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-labelledby="confirm-archive-title">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4">
              <h2 id="confirm-archive-title" className="text-lg font-semibold text-gray-900 dark:text-white">Archive this song?</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                It will be hidden from your library and playlists but can be restored from Archive.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setConfirmArchiveOpen(false)}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => { setConfirmArchiveOpen(false); handleArchive(); }}
                  disabled={archiving}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors"
                >
                  {archiving ? "Archiving…" : "Archive"}
                </button>
              </div>
            </div>
          </div>
        )}

        {reportOpen && (
          <ReportModal
            songId={song.id}
            songTitle={song.title}
            onClose={() => setReportOpen(false)}
          />
        )}

        {embedOpen && (
          <EmbedCodeModal
            songId={song.id}
            theme={embedTheme}
            autoplay={embedAutoplay}
            onThemeChange={setEmbedTheme}
            onAutoplayChange={setEmbedAutoplay}
            onClose={() => setEmbedOpen(false)}
          />
        )}

        <SongExportPanel
          songId={song.id}
          hasAudio={hasAudio}
          initialVideoUrl={song.videoUrl ?? null}
        />

        {/* Cover art */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 tracking-wide">Cover Art</h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 flex-shrink-0">
              <CoverArtImage
                src={coverImageUrl || generatedFallbackUrl}
                alt="Cover art"
                fill
                className="object-cover"
                sizes="56px"
                fallbackSrc={generatedFallbackUrl}
                songId={song.id}
              />
            </div>
            <button
              onClick={() => setCoverArtModalOpen(true)}
              className="flex items-center gap-2 px-3 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-xl transition-colors min-h-[44px]"
            >
              <PaintBrushIcon className="w-4 h-4" aria-hidden="true" />
              {coverImageUrl ? "Change Cover" : "Generate Cover"}
            </button>
          </div>
        </div>

        <SongRemixPanel
          song={song}
          hasAudio={hasAudio}
          isInstrumental={isInstrumental}
          userTier={userTier}
          variationCount={initialVariationCount}
          maxVariations={maxVariations}
        />

        <SongVariationTree
          songId={song.id}
          song={{
            title: song.title,
            tags: song.tags ?? null,
            duration: song.duration ?? null,
            audioUrl: song.audioUrl ?? null,
            lyrics: song.lyrics ?? null,
          }}
          variations={initialVariations}
          maxVariations={maxVariations}
          parentSongId={parentSongId}
          parentSongTitle={parentSongTitle}
        />

        <RecommendationSection songId={song.id} type="similar" title="Similar songs" />
        <RecommendationSection songId={song.id} type="also-liked" title="Listeners also liked" />

        <SongLyricsSection
          songId={song.id}
          lyrics={song.lyrics}
          lyricsEdited={lyricsEdited}
          isCurrentSong={currentSong?.id === song.id}
        />

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 transition-shadow duration-200 hover:shadow-md">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 tracking-wide mb-2">Prompt</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{song.prompt}</p>
        </div>

        <SongRatingPanel
          songId={song.id}
          initialRating={initialRating}
          initialRatingNote={initialRatingNote}
        />
      </div>

      {coverArtModalOpen && (
        <CoverArtModal
          songId={song.id}
          songTitle={song.title}
          currentImageUrl={coverImageUrl}
          onClose={() => setCoverArtModalOpen(false)}
          onSave={(newUrl) => setCoverImageUrl(newUrl)}
        />
      )}
    </div>
  );
}

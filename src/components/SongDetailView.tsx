"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { type SubscriptionTier } from "@/lib/feature-gates";
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
import { useSongFavorite } from "@/hooks/song-actions/use-song-favorite";
import { useSongVisibility } from "@/hooks/song-actions/use-song-visibility";
import { useSongArchive } from "@/hooks/song-actions/use-song-archive";

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

  const [confirmPublicOpen, setConfirmPublicOpen] = useState(false);
  const [confirmArchiveOpen, setConfirmArchiveOpen] = useState(false);

  const { isFavorite, favoriteCount, handleToggleFavorite } = useSongFavorite({
    songId: song.id,
    initialFavorite,
    initialFavoriteCount,
    toast,
  });
  const { isPublic, publicSlug, sharing, setVisibility, handleCopyLink, handleShareOnX } = useSongVisibility({
    songId: song.id,
    songTitle: song.title,
    initialIsPublic,
    initialPublicSlug,
    toast,
  });
  const { isArchived, archiving, handleArchive, handleRestore } = useSongArchive({
    songId: song.id,
    initialIsArchived,
    toast,
  });

  const [reportOpen, setReportOpen] = useState(false);
  const [embedOpen, setEmbedOpen] = useState(false);
  const [embedTheme, setEmbedTheme] = useState<"dark" | "light">("dark");
  const [embedAutoplay, setEmbedAutoplay] = useState(false);

  const [coverArtModalOpen, setCoverArtModalOpen] = useState(false);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(song.imageUrl ?? null);
  const generatedFallbackUrl = generateCoverArtVariants({ songId: song.id, title: song.title, tags: song.tags })[0].dataUrl;

  const hasAudio = Boolean(song.audioUrl);

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
          onVisibilityToggle={() => {
            if (!isPublic) {
              setConfirmPublicOpen(true);
            } else {
              setVisibility("private");
            }
          }}
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

        <ConfirmDialog
          open={confirmPublicOpen}
          title="Make song public?"
          description="This song will be visible to anyone with the link."
          confirmLabel="Make public"
          onConfirm={() => { setConfirmPublicOpen(false); setVisibility("public"); }}
          onClose={() => setConfirmPublicOpen(false)}
        />

        <ConfirmDialog
          open={confirmArchiveOpen}
          title="Archive this song?"
          description="It will be hidden from your library and playlists but can be restored from Archive."
          confirmLabel="Archive"
          loadingLabel="Archiving…"
          danger
          loading={archiving}
          onConfirm={() => { setConfirmArchiveOpen(false); handleArchive(); }}
          onClose={() => setConfirmArchiveOpen(false)}
        />

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

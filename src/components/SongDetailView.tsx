"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { canUseFeature, type SubscriptionTier } from "@/lib/feature-gates";
import {
  ArrowLeftIcon,
  MusicalNoteIcon,
  ArrowDownTrayIcon,
  HeartIcon,
  ArrowPathIcon,
  ForwardIcon,
  MicrophoneIcon,
  SpeakerWaveIcon,
  ScissorsIcon,
  PaintBrushIcon,
  SwatchIcon,
  FilmIcon,
  PlayIcon,
  PauseIcon,
  HandThumbUpIcon,
  HandThumbDownIcon,
  ArrowsRightLeftIcon,
} from "@heroicons/react/24/solid";
import { HeartIcon as HeartOutlineIcon, HandThumbUpIcon as HandThumbUpOutlineIcon, HandThumbDownIcon as HandThumbDownOutlineIcon, DocumentDuplicateIcon } from "@heroicons/react/24/outline";
import { useOfflineCache } from "@/hooks/useOfflineCache";
import { useSongStems } from "@/hooks/useSongStems";
import { useSongActions } from "@/hooks/useSongActions";
import { useDialogFocusTrap } from "@/hooks/useDialogFocusTrap";
import type { SunoSong } from "@/lib/sunoapi";
import { useToast } from "./Toast";
import { useQueue } from "./QueueContext";
import { StarPicker } from "./StarPicker";
import { StemsPlayer } from "./StemsPlayer";
import { SeparateVocalsModal } from "./SeparateVocalsModal";
const EmbedCodeModal = dynamic(() => import("./EmbedCodeModal").then((m) => m.EmbedCodeModal));
const CreateVariationModal = dynamic(() => import("./CreateVariationModal").then((m) => m.CreateVariationModal));
const RemixModal = dynamic(() => import("./RemixModal").then((m) => m.RemixModal));
const ReportModal = dynamic(() => import("./ReportModal").then((m) => m.ReportModal));
const SectionEditor = dynamic(() => import("./SectionEditor").then((m) => m.SectionEditor));
const CoverArtModal = dynamic(() => import("./CoverArtModal").then((m) => m.CoverArtModal));
const RecommendationSection = dynamic(() => import("./SongRecommendations").then((m) => m.RecommendationSection));
import { TagInput } from "./TagInput";
import { CoverArtImage } from "./CoverArtImage";
import { generateCoverArtVariants } from "@/lib/cover-art-generator";
import { SongMetadataCard } from "./SongMetadataCard";
import { SongActionsBar } from "./SongActionsBar";
import { AddToPlaylistButton } from "./AddToPlaylistButton";
import { SongLyricsSection } from "./SongLyricsSection";
import { formatDuration as formatTime } from "@/lib/time-format";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SongTag {
  id: string;
  name: string;
  color: string;
}

interface VariationSummary {
  id: string;
  title: string | null;
  prompt: string | null;
  tags: string | null;
  audioUrl: string | null;
  imageUrl: string | null;
  duration: number | null;
  lyrics: string | null;
  generationStatus: string;
  isInstrumental: boolean;
  createdAt: string | Date;
}

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

// ─── Main SongDetailView ──────────────────────────────────────────────────────

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
  const canSeparateVocals = canUseFeature("vocalSeparation", userTier);
  const { toast } = useToast();
  const { cachedIds, saving: offlineSaving, saveOffline, removeOffline } = useOfflineCache();
  const isCached = cachedIds.has(song.id);
  const isSavingOffline = offlineSaving.has(song.id);
  const { playNext, addToQueue, togglePlay, isPlaying, currentIndex, queue } = useQueue();
  const currentSong = currentIndex >= 0 ? queue[currentIndex] : null;
  const isThisSongPlaying = isPlaying && currentSong?.id === song.id;

  // All data mutations extracted to useSongActions
  const actions = useSongActions({
    song,
    initialFavorite,
    initialFavoriteCount,
    initialIsPublic,
    initialPublicSlug,
    initialRating,
    initialRatingNote,
    initialIsArchived,
    initialVariationCount,
    maxVariations,
    toast,
  });

  // UI-only modal state (no data fetching)
  const [embedOpen, setEmbedOpen] = useState(false);
  const [embedTheme, setEmbedTheme] = useState<"dark" | "light">("dark");
  const [embedAutoplay, setEmbedAutoplay] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [sectionEditorOpen, setSectionEditorOpen] = useState(false);
  const [coverArtModalOpen, setCoverArtModalOpen] = useState(false);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(song.imageUrl ?? null);
  const [confirmPublicOpen, setConfirmPublicOpen] = useState(false);
  const [confirmArchiveOpen, setConfirmArchiveOpen] = useState(false);

  const generatedFallbackUrl = generateCoverArtVariants({ songId: song.id, title: song.title, tags: song.tags })[0].dataUrl;

  // Vocal separation — delegated to useSongStems hook
  const stemHook = useSongStems({ songId: song.id, songTitle: song.title, toast });

  // Appeal dialog focus trap
  const appealDialogRef = useRef<HTMLDivElement>(null);
  useDialogFocusTrap(appealDialogRef, actions.appealOpen, () => actions.setAppealOpen(false));

  const hasAudio = Boolean(song.audioUrl);

  function handleVisibilityToggle() {
    const result = actions.handleVisibilityToggle();
    if (result === "confirm-public") {
      setConfirmPublicOpen(true);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Hero cover art with blurred background */}
      <div className="relative w-full overflow-hidden rounded-b-3xl mb-6">
        {/* Blurred background layer */}
        {(coverImageUrl || generatedFallbackUrl) && (
          <div className="absolute inset-0">
            <CoverArtImage
              src={coverImageUrl || generatedFallbackUrl}
              alt=""
              fill
              className="object-cover scale-110 blur-2xl opacity-60"
              sizes="100vw"
              priority
              fallbackSrc={generatedFallbackUrl}
              songId={song.id}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-gray-50/30 via-gray-50/50 to-gray-50 dark:from-gray-950/30 dark:via-gray-950/50 dark:to-gray-950" />
          </div>
        )}

        <div className="relative px-4 pt-4 pb-6 space-y-4">
          {/* Back link */}
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors min-h-[44px]"
          >
            <ArrowLeftIcon className="w-4 h-4" aria-hidden="true" />
            Back
          </button>

          {/* Cover art */}
          <div className="relative w-full aspect-square max-h-80 sm:max-h-[400px] rounded-2xl bg-gray-200 dark:bg-gray-800 overflow-hidden flex items-center justify-center shadow-xl ring-1 ring-black/5 dark:ring-white/10 mx-auto group">
            <CoverArtImage
              src={coverImageUrl || generatedFallbackUrl}
              alt={song.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 400px"
              priority
              fallbackSrc={generatedFallbackUrl}
              songId={song.id}
            />
            {/* Generate Cover overlay button */}
            <button
              onClick={() => setCoverArtModalOpen(true)}
              className="absolute inset-0 flex items-end justify-center pb-3 bg-black/0 group-hover:bg-black/30 transition-colors"
              aria-label="Change cover art"
            >
              <span className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 px-3 py-1.5 bg-black/70 text-white text-xs font-medium rounded-full">
                <PaintBrushIcon className="w-3.5 h-3.5" />
                {coverImageUrl ? "Change Cover" : "Generate Cover"}
              </span>
            </button>
          </div>

          {/* Title + favorite */}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white flex-1">
                {song.title}
                {isHidden && (
                  <span className="ml-2 inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 align-middle">
                    Hidden
                  </span>
                )}
              </h1>
              <button
                onClick={actions.handleToggleFavorite}
                aria-label={actions.isFavorite ? "Remove from favorites" : "Add to favorites"}
                className={`flex-shrink-0 flex items-center gap-1 px-2 h-11 rounded-full transition-all duration-200 active:scale-95 ${
                  actions.isFavorite ? "text-pink-500" : "text-gray-400 dark:text-gray-500 hover:text-pink-400"
                }`}
              >
                {actions.isFavorite ? (
                  <HeartIcon className="w-6 h-6" />
                ) : (
                  <HeartOutlineIcon className="w-6 h-6" />
                )}
                {actions.favoriteCount > 0 && (
                  <span className="text-sm font-medium">{actions.favoriteCount}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-6">

      {/* Hidden song appeal banner */}
      {isHidden && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <p className="text-sm font-medium text-red-700 dark:text-red-400 mb-1">This song was removed by a moderator.</p>
          {actions.appealStatus === "pending" ? (
            <p className="text-xs text-red-600 dark:text-red-400">Your appeal is under review.</p>
          ) : actions.appealStatus === "approved" ? (
            <p className="text-xs text-green-600 dark:text-green-400">Your appeal was approved.</p>
          ) : actions.appealStatus === "rejected" ? (
            <p className="text-xs text-red-600 dark:text-red-400">Your appeal was rejected.</p>
          ) : (
            <button
              onClick={() => actions.setAppealOpen(true)}
              className="mt-1 text-xs font-medium text-red-700 dark:text-red-300 underline hover:no-underline"
            >
              Appeal this decision
            </button>
          )}
        </div>
      )}

      {/* Appeal modal */}
      {actions.appealOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-4" onClick={() => actions.setAppealOpen(false)}>
          <div
            ref={appealDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="appeal-modal-title"
            tabIndex={-1}
            className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="appeal-modal-title" className="text-lg font-bold mb-2 text-gray-900 dark:text-white">Appeal removal</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Explain why you believe this song should be restored. Be specific — our team will review your appeal.
            </p>
            <textarea
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-500"
              rows={5}
              placeholder="Describe why this content should be restored (min 10 characters)…"
              value={actions.appealReason}
              onChange={(e) => actions.setAppealReason(e.target.value)}
              maxLength={2000}
            />
            <p className="text-xs text-gray-400 text-right mt-1">{actions.appealReason.length}/2000</p>
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => actions.setAppealOpen(false)}
                className="flex-1 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={actions.handleSubmitAppeal}
                disabled={actions.appealSubmitting || actions.appealReason.trim().length < 10}
                className="flex-1 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
              >
                {actions.appealSubmitting ? "Submitting…" : "Submit appeal"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full metadata grid */}
      <SongMetadataCard
        tags={song.tags}
        duration={song.duration}
        createdAt={song.createdAt}
        model={song.model}
        ratingStars={actions.rating.stars}
        sunoJobId={sunoJobId}
      />

      {/* Tags */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 space-y-2">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 tracking-wide">Tags</h2>
        <TagInput songId={song.id} initialTags={initialSongTags} />
      </div>

      {/* Play / pause via global player */}
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

      {/* Action buttons row */}
      <SongActionsBar
        song={song}
        hasAudio={hasAudio}
        isPublic={actions.isPublic}
        publicSlug={actions.publicSlug}
        isCached={isCached}
        isSavingOffline={isSavingOffline}
        sharing={actions.sharing}
        coverImageUrl={coverImageUrl}
        onVisibilityToggle={handleVisibilityToggle}
        onCopyLink={actions.handleCopyLink}
        onShareOnX={actions.handleShareOnX}
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
        isArchived={actions.isArchived}
        archiving={actions.archiving}
        onArchive={() => setConfirmArchiveOpen(true)}
        onRestore={actions.handleRestore}
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
                onClick={() => { setConfirmPublicOpen(false); actions.setVisibility("public"); }}
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
                onClick={() => { setConfirmArchiveOpen(false); actions.handleArchive(); }}
                disabled={actions.archiving}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors"
              >
                {actions.archiving ? "Archiving…" : "Archive"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report modal */}
      {reportOpen && (
        <ReportModal
          songId={song.id}
          songTitle={song.title}
          onClose={() => setReportOpen(false)}
        />
      )}

      {/* Embed code modal */}
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

      {actions.saveStyleOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="save-style-title"
          onClick={() => actions.setSaveStyleOpen(false)}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="save-style-title" className="text-lg font-semibold text-gray-900 dark:text-white">Save Style Template</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Save this song style for quick reuse in future generations.
            </p>
            <div className="space-y-3">
              <div>
                <label htmlFor="style-template-name" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Template Name
                </label>
                <input
                  id="style-template-name"
                  type="text"
                  value={actions.styleTemplateName}
                  onChange={(e) => actions.setStyleTemplateName(e.target.value)}
                  maxLength={100}
                  autoFocus
                  className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="e.g. Cinematic Piano Ballad"
                />
              </div>
              <div>
                <label htmlFor="style-template-tags" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Style Tags
                </label>
                <textarea
                  id="style-template-tags"
                  value={actions.styleTemplateTags}
                  onChange={(e) => actions.setStyleTemplateTags(e.target.value)}
                  rows={3}
                  maxLength={500}
                  className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                  placeholder="e.g. dreamy synthwave, lush pads, driving bass"
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => actions.setSaveStyleOpen(false)}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={actions.handleSaveStyleTemplate}
                disabled={actions.isSavingStyle || !actions.styleTemplateName.trim() || !actions.styleTemplateTags.trim()}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors"
              >
                {actions.isSavingStyle ? "Saving..." : "Save Style"}
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Export / Format Conversion */}
      {hasAudio && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 tracking-wide">Export</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <button
              onClick={() => actions.handleExport("wav")}
              disabled={actions.exports.wav.status === "converting"}
              className="flex items-center justify-center gap-2 px-3 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-colors min-h-[44px]"
            >
              <ArrowDownTrayIcon className="w-4 h-4" aria-hidden="true" />
              {actions.exports.wav.status === "converting" ? "Converting..." : actions.exports.wav.status === "done" ? "WAV Sent" : "WAV"}
            </button>
            <button
              onClick={() => actions.handleExport("midi")}
              disabled={actions.exports.midi.status === "converting"}
              className="flex items-center justify-center gap-2 px-3 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-colors min-h-[44px]"
            >
              <MusicalNoteIcon className="w-4 h-4" aria-hidden="true" />
              {actions.exports.midi.status === "converting" ? "Extracting..." : actions.exports.midi.status === "done" ? "MIDI Sent" : "MIDI"}
            </button>
            <button
              onClick={() => actions.handleExport("mp4")}
              disabled={actions.exports.mp4.status === "converting" || actions.videoStatus === "polling"}
              className="flex items-center justify-center gap-2 px-3 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-colors min-h-[44px]"
            >
              <FilmIcon className="w-4 h-4" aria-hidden="true" />
              {actions.exports.mp4.status === "converting" || actions.videoStatus === "polling"
                ? "Generating..."
                : actions.videoStatus === "ready"
                  ? "Regenerate Video"
                  : "Music Video"}
            </button>
          </div>
          {(actions.exports.wav.status === "error" || actions.exports.midi.status === "error" || actions.exports.mp4.status === "error") && (
            <p className="text-xs text-red-400">
              {actions.exports.wav.error || actions.exports.midi.error || actions.exports.mp4.error}
            </p>
          )}
        </div>
      )}

      {/* Music Video Player */}
      {actions.videoStatus === "polling" && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 tracking-wide">Music Video</h2>
          <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
            <ArrowPathIcon className="w-5 h-5 animate-spin text-purple-500" aria-hidden="true" />
            <span>Generating your music video&hellip; This may take a minute.</span>
          </div>
        </div>
      )}

      {actions.videoStatus === "ready" && actions.videoUrl && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 tracking-wide">Music Video</h2>
          <div className="rounded-lg overflow-hidden bg-black">
            <video
              src={actions.videoUrl}
              controls
              playsInline
              preload="metadata"
              className="w-full max-h-[400px]"
            />
          </div>
          <a
            href={actions.videoUrl}
            download
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-xl transition-colors min-h-[44px]"
          >
            <ArrowDownTrayIcon className="w-4 h-4" aria-hidden="true" />
            Download Video
          </a>
        </div>
      )}

      {actions.videoStatus === "error" && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 tracking-wide">Music Video</h2>
          <p className="text-sm text-red-500">{actions.videoError ?? "Video generation failed."}</p>
          <button
            onClick={() => actions.handleExport("mp4")}
            className="inline-flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-xl transition-colors min-h-[44px]"
          >
            <ArrowPathIcon className="w-4 h-4" aria-hidden="true" />
            Retry
          </button>
        </div>
      )}

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

      {/* Variation / Remix actions */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 tracking-wide">Remix & Extend</h2>
          <span className="text-xs text-gray-400 dark:text-gray-500">{initialVariationCount}/{maxVariations} variations</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              if (initialVariationCount >= maxVariations) {
                toast(`Maximum ${maxVariations} variations reached`, "error");
                return;
              }
              actions.setVariationModalOpen(true);
            }}
            disabled={initialVariationCount >= maxVariations}
            className="flex items-center justify-center gap-2 px-3 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-colors min-h-[44px]"
          >
            <ArrowPathIcon className="w-4 h-4" aria-hidden="true" />
            Create Variation
          </button>
          <button
            onClick={() => actions.setRemixAction("extend")}
            disabled={initialVariationCount >= maxVariations}
            className="flex items-center justify-center gap-2 px-3 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-colors min-h-[44px]"
          >
            <ForwardIcon className="w-4 h-4" aria-hidden="true" />
            Extend
          </button>
          {isInstrumental ? (
            <button
              onClick={() => actions.setRemixAction("add-vocals")}
              disabled={initialVariationCount >= maxVariations}
              className="flex items-center justify-center gap-2 px-3 py-2.5 bg-pink-600 hover:bg-pink-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-colors min-h-[44px]"
            >
              <MicrophoneIcon className="w-4 h-4" aria-hidden="true" />
              Add Vocals
            </button>
          ) : (
            <button
              onClick={() => actions.setRemixAction("add-instrumental")}
              disabled={initialVariationCount >= maxVariations}
              className="flex items-center justify-center gap-2 px-3 py-2.5 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-colors min-h-[44px]"
            >
              <SpeakerWaveIcon className="w-4 h-4" aria-hidden="true" />
              Add Instrumental
            </button>
          )}
          {canSeparateVocals ? (
            <button
              onClick={stemHook.openSeparateModal}
              disabled={!hasAudio}
              className="flex items-center justify-center gap-2 px-3 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-colors min-h-[44px]"
            >
              <ScissorsIcon className="w-4 h-4" aria-hidden="true" />
              Separate Vocals
            </button>
          ) : (
            <Link
              href="/pricing"
              className="flex items-center justify-center gap-2 px-3 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-sm font-medium rounded-xl transition-colors min-h-[44px] hover:bg-violet-100 dark:hover:bg-violet-900/20 hover:text-violet-700 dark:hover:text-violet-400"
              title="Vocal Separation requires Pro or higher"
            >
              <ScissorsIcon className="w-4 h-4" aria-hidden="true" />
              Separate Vocals <span className="text-xs font-bold">(Pro+)</span>
            </Link>
          )}
          <button
            onClick={() => setSectionEditorOpen(true)}
            disabled={!hasAudio || !song.duration || initialVariationCount >= maxVariations}
            className="flex items-center justify-center gap-2 px-3 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-colors min-h-[44px] col-span-2"
          >
            <PaintBrushIcon className="w-4 h-4" aria-hidden="true" />
            Replace Section
          </button>
          <button
            onClick={() => {
              const params = new URLSearchParams();
              if (song.title) params.set("title", song.title);
              if (song.tags) params.set("tags", song.tags);
              if (song.prompt) params.set("prompt", song.prompt);
              if (isInstrumental) params.set("instrumental", "1");
              params.set("sourceSongId", song.id);
              if (song.title) params.set("sourceSongTitle", song.title);
              router.push(`/generate?${params.toString()}`);
            }}
            className="flex items-center justify-center gap-2 px-3 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl transition-colors min-h-[44px] col-span-2"
          >
            <DocumentDuplicateIcon className="w-4 h-4" aria-hidden="true" />
            Use as Template
          </button>
          {song.tags?.trim() && (
            <button
              onClick={actions.openSaveStyleModal}
              className="flex items-center justify-center gap-2 px-3 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-colors min-h-[44px] col-span-2"
            >
              <SwatchIcon className="w-4 h-4" aria-hidden="true" />
              Save Style
            </button>
          )}
        </div>
      </div>

      {/* Remix modal */}
      {actions.variationModalOpen && (
        <CreateVariationModal
          sourceSong={{
            prompt: song.prompt ?? null,
            tags: song.tags ?? null,
            lyrics: song.lyrics ?? null,
            title: song.title ?? null,
            isInstrumental: isInstrumental,
          }}
          onClose={() => actions.setVariationModalOpen(false)}
          onSubmit={actions.handleCreateVariation}
          submitting={actions.creatingVariation}
        />
      )}

      {actions.remixAction && (
        <RemixModal
          action={actions.remixAction}
          songTitle={song.title}
          songTags={song.tags ?? null}
          songDuration={song.duration ?? null}
          onClose={() => actions.setRemixAction(null)}
          onSubmit={actions.handleRemixSubmit}
          submitting={actions.remixSubmitting}
        />
      )}

      {/* Separate Vocals modal */}
      {stemHook.separateModalOpen && (
        <SeparateVocalsModal
          onClose={stemHook.closeSeparateModal}
          onSubmit={stemHook.separate}
          submitting={stemHook.separateSubmitting}
        />
      )}

      {/* Section Editor modal */}
      {sectionEditorOpen && hasAudio && song.duration && (
        <SectionEditor
          songId={song.id}
          songTitle={song.title}
          songTags={song.tags ?? null}
          songDuration={song.duration}
          audioUrl={song.audioUrl}
          onClose={() => setSectionEditorOpen(false)}
          onSubmitted={(newSongId) => {
            setSectionEditorOpen(false);
            toast("Section replacement started!", "success");
            router.push(`/library/${newSongId}`);
          }}
        />
      )}

      {/* Stem viewer */}
      {stemHook.stems.length > 0 && (
        <StemsPlayer stems={stemHook.stems} onDownload={stemHook.downloadStem} onDownloadAll={stemHook.downloadAllStems} downloadingAll={stemHook.downloadingAll} />
      )}

      {/* Parent link */}
      {parentSongId && (
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Variation of:{" "}
          <Link href={`/library/${parentSongId}`} className="text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 underline">
            {parentSongTitle ?? "Original song"}
          </Link>
        </div>
      )}

      {/* Variation tree */}
      {initialVariations.length > 0 && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 tracking-wide">
            Variations ({initialVariations.length}/{maxVariations})
          </h2>
          <div className="space-y-2">
            {initialVariations.map((v) => (
              <div
                key={v.id}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                  v.id === song.id
                    ? "border-violet-400 bg-violet-50 dark:bg-violet-900/20"
                    : "border-gray-200 dark:border-gray-700 hover:border-violet-300 dark:hover:border-violet-600"
                }`}
              >
                <Link href={`/library/${v.id}`} className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-gray-900 dark:text-white block truncate">
                    {v.title || "Untitled variation"}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 block truncate">
                    {v.tags || v.prompt || "No description"}
                  </span>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                      v.generationStatus === "ready"
                        ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                        : v.generationStatus === "failed"
                        ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                        : "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400"
                    }`}>
                      {v.generationStatus}
                    </span>
                    {v.isInstrumental && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400">
                        instrumental
                      </span>
                    )}
                    {v.duration != null && (
                      <span className="text-xs text-gray-400">{formatTime(v.duration)}</span>
                    )}
                  </div>
                </Link>
                {v.id !== song.id && v.generationStatus === "ready" && (
                  <div className="flex-shrink-0 flex flex-col gap-1">
                    <Link
                      href={`/compare?a=${song.id}&b=${v.id}`}
                      className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg bg-violet-600 hover:bg-violet-500 text-white transition-colors"
                      title="Full compare page"
                    >
                      <ArrowsRightLeftIcon className="w-3 h-3" />
                      Compare
                    </Link>
                    <button
                      onClick={() => actions.setCompareVariation(actions.compareVariation?.id === v.id ? null : { id: v.id, title: v.title, tags: v.tags, audioUrl: v.audioUrl, duration: v.duration, lyrics: v.lyrics })}
                      className={`px-2 py-1 text-xs font-medium rounded-lg transition-colors ${
                        actions.compareVariation?.id === v.id
                          ? "bg-indigo-600 text-white"
                          : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                      }`}
                    >
                      {actions.compareVariation?.id === v.id ? "Hide" : "Quick"}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Side-by-side comparison */}
      {actions.compareVariation && (
        <div className="bg-white dark:bg-gray-900 border border-violet-300 dark:border-violet-700 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 tracking-wide">Comparison</h2>
            <button
              onClick={() => actions.setCompareVariation(null)}
              className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              Close
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {/* Current song */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-violet-500 uppercase tracking-wide">Current</span>
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{song.title || "Untitled"}</p>
              {song.tags && <p className="text-xs text-gray-500 dark:text-gray-400">{song.tags}</p>}
              {song.duration != null && <p className="text-xs text-gray-400">{formatTime(song.duration)}</p>}
              {song.audioUrl && (
                <audio src={song.audioUrl} controls className="w-full h-8" preload="none" />
              )}
              {song.lyrics && (
                <div className="max-h-40 overflow-y-auto">
                  <p className="text-xs text-gray-500 dark:text-gray-400 whitespace-pre-line">{song.lyrics}</p>
                </div>
              )}
            </div>
            {/* Comparison variation */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-violet-500 uppercase tracking-wide">Variation</span>
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{actions.compareVariation.title || "Untitled"}</p>
              {actions.compareVariation.tags && <p className="text-xs text-gray-500 dark:text-gray-400">{actions.compareVariation.tags}</p>}
              {actions.compareVariation.duration != null && <p className="text-xs text-gray-400">{formatTime(actions.compareVariation.duration)}</p>}
              {actions.compareVariation.audioUrl && (
                <audio src={actions.compareVariation.audioUrl} controls className="w-full h-8" preload="none" />
              )}
              {actions.compareVariation.lyrics && (
                <div className="max-h-40 overflow-y-auto">
                  <p className="text-xs text-gray-500 dark:text-gray-400 whitespace-pre-line">{actions.compareVariation.lyrics}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Similar songs */}
      <RecommendationSection
        songId={song.id}
        type="similar"
        title="Similar songs"
      />

      {/* Listeners also liked */}
      <RecommendationSection
        songId={song.id}
        type="also-liked"
        title="Listeners also liked"
      />

      {/* Lyrics */}
      <SongLyricsSection
        songId={song.id}
        lyrics={song.lyrics}
        lyricsEdited={lyricsEdited}
        isCurrentSong={currentSong?.id === song.id}
      />

      {/* Prompt */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 transition-shadow duration-200 hover:shadow-md">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 tracking-wide mb-2">Prompt</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">{song.prompt}</p>
      </div>

      {/* Generation Feedback */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 space-y-3 transition-shadow duration-200 hover:shadow-md">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 tracking-wide">Generation Quality</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">Was this generation good?</p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => actions.handleThumbsFeedback("thumbs_up")}
            disabled={actions.savingThumbs}
            aria-label="Thumbs up — good generation"
            aria-pressed={actions.thumbsRating === "thumbs_up"}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
              actions.thumbsRating === "thumbs_up"
                ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-300 dark:border-green-700"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-600 hover:border-green-200"
            }`}
          >
            {actions.thumbsRating === "thumbs_up" ? (
              <HandThumbUpIcon className="h-5 w-5" aria-hidden="true" />
            ) : (
              <HandThumbUpOutlineIcon className="h-5 w-5" aria-hidden="true" />
            )}
            Good
          </button>
          <button
            type="button"
            onClick={() => actions.handleThumbsFeedback("thumbs_down")}
            disabled={actions.savingThumbs}
            aria-label="Thumbs down — poor generation"
            aria-pressed={actions.thumbsRating === "thumbs_down"}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
              actions.thumbsRating === "thumbs_down"
                ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-700"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 hover:border-red-200"
            }`}
          >
            {actions.thumbsRating === "thumbs_down" ? (
              <HandThumbDownIcon className="h-5 w-5" aria-hidden="true" />
            ) : (
              <HandThumbDownOutlineIcon className="h-5 w-5" aria-hidden="true" />
            )}
            Poor
          </button>
        </div>
      </div>

      {/* Rating */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 space-y-3 transition-shadow duration-200 hover:shadow-md">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 tracking-wide">Your Rating</h2>

        <StarPicker value={actions.rating.stars} onChange={actions.handleStarChange} />

        <textarea
          value={actions.noteDraft}
          onChange={(e) => {
            actions.setNoteDraft(e.target.value);
            actions.setSaved(false);
          }}
          placeholder="Add a note (optional)..."
          aria-label="Rating note"
          rows={3}
          className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-base text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 resize-none focus:outline-none focus:border-violet-500 transition-colors"
        />

        <div className="flex items-center gap-3">
          <button
            onClick={actions.handleSaveRating}
            disabled={actions.rating.stars === 0}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:bg-gray-200 dark:disabled:bg-gray-800 disabled:text-gray-400 dark:disabled:text-gray-600 text-white text-sm font-medium rounded-lg transition-colors min-h-[44px]"
          >
            Save rating
          </button>
          {actions.saved && (
            <span className="text-sm text-green-400">Saved</span>
          )}
        </div>
      </div>
      </div>

      {/* Cover Art Modal */}
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

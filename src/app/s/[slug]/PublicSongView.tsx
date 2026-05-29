"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { PlayIcon, PauseIcon, MusicalNoteIcon, FlagIcon, SparklesIcon, SpeakerWaveIcon, SpeakerXMarkIcon, CodeBracketIcon, HeartIcon } from "@heroicons/react/24/solid";
import { ChatBubbleLeftIcon, HeartIcon as HeartOutlineIcon } from "@heroicons/react/24/outline";
import { FollowButton } from "@/components/FollowButton";
import { track } from "@/lib/analytics";
import { RelatedSongs } from "@/components/RelatedSongs";
import { ShareMenu } from "@/components/ShareMenu";
import { ReportModal } from "@/components/ReportModal";
import { CommentsSection } from "@/components/CommentsSection";
import { EmojiReactionPicker } from "@/components/EmojiReactionPicker";
import { ReactionTimeline } from "@/components/ReactionTimeline";
import { PlayerWaveform } from "@/components/PlayerWaveform";
import { formatDuration as formatTime } from "@/lib/time-format";
import { useAudioPlayback } from "./use-audio-playback";
import { useVariantSwitcher } from "./use-variant-switcher";
import { useFavoriteSong } from "./use-favorite-song";
import { useEmbedCode } from "./use-embed-code";
import { useReactionPopups } from "./use-reaction-popups";
import { useCommentPopups } from "./use-comment-popups";
import { useState } from "react";


export interface SerializedPublicVariant {
  id: string;
  title: string | null;
  audioUrl: string | null;
  imageUrl: string | null;
  duration: number | null;
  tags: string | null;
  publicSlug: string | null;
  createdAt: string;
}

interface PublicSongViewProps {
  songId: string;
  slug: string;
  /** Optional override for the returnUrl used in the signup CTA. Defaults to /s/{slug}. */
  returnUrl?: string;
  title: string;
  imageUrl: string | null;
  audioUrl: string | null;
  duration: number | null;
  tags: string | null;
  creatorName: string | null;
  creatorUsername?: string | null;
  songOwnerId?: string | null;
  prompt: string | null;
  lyrics: string | null;
  createdAt: string;
  variants?: SerializedPublicVariant[];
}

export function PublicSongView({
  songId,
  slug,
  returnUrl,
  title,
  imageUrl,
  audioUrl,
  duration,
  tags,
  creatorName,
  creatorUsername,
  songOwnerId,
  prompt,
  lyrics,
  createdAt,
  variants = [],
}: PublicSongViewProps) {
  const signupReturnUrl = returnUrl ?? `/s/${slug}`;
  const [reportOpen, setReportOpen] = useState(false);

  const audio = useAudioPlayback(duration);
  const variant = useVariantSwitcher({ songId, title, imageUrl, audioUrl, tags });
  const { session, isFavorite, handleToggleFavorite } = useFavoriteSong(songId);
  const embed = useEmbedCode(songId, title);
  const reactionPopups = useReactionPopups(songId, audio.currentTime, audio.audioDuration, audio.isPlaying);
  const commentPopups = useCommentPopups(songId, audio.currentTime, audio.audioDuration, audio.isPlaying);

  const showVariants = variants.length > 1;

  useEffect(() => {
    if (audio.audioRef.current && variant.activeAudioUrl) {
      audio.audioRef.current.load();
    }
  }, [variant.activeAudioUrl, audio.audioRef]);

  useEffect(() => {
    track("public_song_viewed", { songId, slug });
    fetch("/api/analytics/view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ songId }),
    }).catch(() => {});
  }, [songId, slug]);

  function handleVariantSwitch(v: SerializedPublicVariant) {
    variant.handleVariantSwitch(v, () => {
      audio.resetPlayback();
      audio.setAudioDuration(v.duration ?? 0);
      reactionPopups.resetReactions();
      commentPopups.resetComments();
    });
  }

  return (
    <div className="w-full max-w-sm md:max-w-4xl">
      <div className="md:grid md:grid-cols-[2fr_3fr] md:gap-8 md:items-start">
      {/* Left column: cover art */}
      <div className="md:sticky md:top-8">
      <div className="relative w-full overflow-hidden rounded-b-3xl md:rounded-3xl mb-6 md:mb-0">
        {/* Blurred background layer */}
        {variant.activeImageUrl && (
          <div className="absolute inset-0">
            <Image
              src={variant.activeImageUrl}
              alt=""
              fill
              className="object-cover scale-110 blur-2xl opacity-60"
              sizes="100vw"
              aria-hidden="true"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-gray-50/30 via-gray-50/50 to-gray-50 dark:from-gray-950/30 dark:via-gray-950/50 dark:to-gray-950" />
          </div>
        )}

        <div className="relative px-4 pt-4 pb-6 space-y-4">
          {/* Cover art */}
          <div className="relative aspect-square w-full rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 overflow-hidden flex items-center justify-center shadow-xl ring-1 ring-black/5 dark:ring-white/10">
            {variant.activeImageUrl ? (
              <Image src={variant.activeImageUrl} alt={variant.activeTitle} fill className="object-cover" sizes="(max-width: 768px) 100vw, 400px" priority />
            ) : (
              <MusicalNoteIcon className="w-20 h-20 text-gray-300 dark:text-gray-700" />
            )}
          </div>

          {/* Song info */}
          <div className="text-center md:text-left space-y-1.5">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">{variant.activeTitle}</h1>
            {creatorName && (
              <div className="flex items-center justify-center md:justify-start gap-2 flex-wrap">
                {creatorUsername ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    by{" "}
                    <Link href={`/u/${creatorUsername}`} className="hover:text-violet-500 dark:hover:text-violet-400 transition-colors">
                      {creatorName}
                    </Link>
                  </p>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">by {creatorName}</p>
                )}
                {songOwnerId && (
                  <FollowButton userId={songOwnerId} />
                )}
              </div>
            )}
            {variant.activeTags && (
              <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">{variant.activeTags}</p>
            )}
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {new Date(createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
            </p>
          </div>
        </div>
      </div>
      </div>

      {/* Right column: content */}
      <div className="space-y-6 px-4 md:px-0 md:pt-4">
      {/* Prompt */}
      {prompt && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 transition-shadow duration-200 hover:shadow-md">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">Prompt</h2>
          <p className="text-sm text-gray-700 dark:text-gray-300">{prompt}</p>
        </div>
      )}

      {/* Lyrics */}
      {lyrics && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 transition-shadow duration-200 hover:shadow-md">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">Lyrics</h2>
          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">{lyrics}</p>
        </div>
      )}

      {/* Audio player */}
      {variant.activeAudioUrl && (
        <div className="space-y-3">
          {/* Play button */}
          <div className="flex flex-col items-center gap-1.5">
            <button
              onClick={() => audio.handleTogglePlay(variant.activeSongId, variant.resolvedAudioUrl)}
              disabled={audio.isBuffering}
              className="w-14 h-14 rounded-full bg-violet-600 hover:bg-violet-500 disabled:opacity-70 text-white flex items-center justify-center transition-colors"
              aria-label={audio.isBuffering ? "Loading" : audio.isPlaying ? "Pause" : "Play"}
            >
              {audio.isBuffering ? (
                <svg className="w-7 h-7 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-25" />
                  <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
                </svg>
              ) : audio.isPlaying ? (
                <PauseIcon className="w-7 h-7" />
              ) : (
                <PlayIcon className="w-7 h-7 ml-0.5" />
              )}
            </button>
            {audio.audioError && (
              <p className="text-xs text-red-500 dark:text-red-400 text-center max-w-[200px]">{audio.audioError}</p>
            )}
          </div>

          {/* Waveform + reaction timeline + floating popups */}
          <div className="relative space-y-1">
            {/* Floating emoji popups */}
            {reactionPopups.activePopups.length > 0 && (
              <div className="pointer-events-none absolute inset-x-2 bottom-8 h-0 z-10">
                {reactionPopups.activePopups.map((popup) => (
                  <span
                    key={popup.key}
                    className="absolute text-2xl leading-none animate-emoji-float"
                    style={{ left: `${popup.leftPct}%` }}
                    aria-hidden="true"
                  >
                    {popup.emoji}
                  </span>
                ))}
              </div>
            )}

            {/* Floating comment popups */}
            {commentPopups.activeCommentPopups.length > 0 && (
              <div className="pointer-events-none absolute inset-x-2 bottom-8 h-0 z-20">
                {commentPopups.activeCommentPopups.map((popup) => (
                  <div
                    key={popup.key}
                    className="absolute bottom-2 flex flex-col items-center gap-0.5 animate-emoji-float"
                    style={{ left: `${popup.leftPct}%`, transform: "translateX(-50%)" }}
                    aria-hidden="true"
                  >
                    <div className="bg-gray-800/90 border border-violet-500/50 text-white text-xs px-2 py-1 rounded-lg shadow-lg max-w-[160px] text-center leading-tight">
                      {popup.username && (
                        <span className="block text-[10px] text-violet-400 font-medium truncate">{popup.username}</span>
                      )}
                      <span className="line-clamp-2">{popup.body}</span>
                    </div>
                    <ChatBubbleLeftIcon className="w-3 h-3 text-violet-400" />
                  </div>
                ))}
              </div>
            )}

            <div className="relative h-14 bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden px-2 pt-1 pb-0.5">
              <PlayerWaveform
                songId={songId}
                currentTime={audio.currentTime}
                duration={audio.audioDuration}
                isBuffering={audio.isBuffering}
                onSeek={audio.handleSeek}
                reactionTimestamps={reactionPopups.reactions.map((r) => r.timestamp)}
                commentTimestamps={commentPopups.timedComments.map((c) => c.timestamp)}
              />
              {reactionPopups.reactions.length > 0 && audio.audioDuration > 0 && (
                <div className="absolute inset-x-2 top-0 bottom-0 pointer-events-none">
                  <div className="pointer-events-auto">
                    <ReactionTimeline reactions={reactionPopups.reactions} duration={audio.audioDuration} />
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>{formatTime(audio.currentTime)}</span>
              <span>{formatTime(audio.audioDuration)}</span>
            </div>
          </div>

          {/* Volume control */}
          <div className="flex items-center gap-2">
            <button
              onClick={audio.handleToggleMute}
              className="text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors flex-shrink-0"
              aria-label={audio.muted ? "Unmute" : "Mute"}
            >
              {audio.muted || audio.volume === 0 ? (
                <SpeakerXMarkIcon className="w-4 h-4" aria-hidden="true" />
              ) : (
                <SpeakerWaveIcon className="w-4 h-4" aria-hidden="true" />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={audio.muted ? 0 : audio.volume}
              onChange={(e) => audio.handleVolumeChange(parseFloat(e.target.value))}
              className="flex-1 h-1.5 accent-violet-500 cursor-pointer"
              aria-label="Volume"
            />
          </div>

          {/* Emoji reaction picker or login prompt */}
          <div className="flex justify-center">
            {session?.user ? (
              <EmojiReactionPicker
                isPlaying={audio.isPlaying}
                isAuthenticated={true}
                onReact={reactionPopups.handleReact}
                reactionEmojis={reactionPopups.reactions.map((r) => r.emoji)}
              />
            ) : (
              audio.isPlaying && (
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  <Link href="/auth/signin" className="underline hover:text-violet-500 transition-colors">
                    Log in
                  </Link>{" "}
                  to react
                </p>
              )
            )}
          </div>

          <audio
            ref={audio.audioRef}
            src={variant.resolvedAudioUrl ?? undefined}
            preload="metadata"
            onPlay={audio.onPlay}
            onPause={audio.onPause}
            onEnded={() => {
              audio.onEnded();
              reactionPopups.resetReactions();
              commentPopups.resetComments();
            }}
            onTimeUpdate={audio.onTimeUpdate}
            onDurationChange={audio.onDurationChange}
            onWaiting={audio.onWaiting}
            onCanPlay={audio.onCanPlay}
            onError={() => audio.onError(variant.activeSongId, variant.resolvedAudioUrl)}
          />
        </div>
      )}

      {/* Favorite + Share + Embed + Report buttons */}
      <div className="flex justify-center gap-2 flex-wrap">
        {session?.user ? (
          <button
            onClick={handleToggleFavorite}
            aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-all duration-200 active:scale-95 min-h-[44px] ${
              isFavorite
                ? "text-pink-500 hover:bg-pink-50 dark:hover:bg-pink-900/20"
                : "text-gray-500 dark:text-gray-400 hover:text-pink-500 dark:hover:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-900/20"
            }`}
          >
            {isFavorite ? (
              <HeartIcon className="w-4 h-4" aria-hidden="true" />
            ) : (
              <HeartOutlineIcon className="w-4 h-4" aria-hidden="true" />
            )}
            Favorite
          </button>
        ) : (
          <Link
            href="/auth/signin"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg text-gray-500 dark:text-gray-400 hover:text-pink-500 dark:hover:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-900/20 transition-all duration-200 active:scale-95 min-h-[44px]"
            aria-label="Log in to favorite"
          >
            <HeartOutlineIcon className="w-4 h-4" aria-hidden="true" />
            Favorite
          </Link>
        )}
        <ShareMenu
          url={typeof window !== "undefined" ? window.location.href : `/s/${slug}`}
          title={title}
          text={`${title} — listen on SunoFlow`}
          source="public_song"
          embedUrl={`/embed/${songId}`}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-all duration-200 active:scale-95 min-h-[44px]"
        />
        <button
          onClick={() => embed.setEmbedOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-all duration-200 active:scale-95 min-h-[44px]"
          aria-label="Get embed code"
        >
          <CodeBracketIcon className="w-3.5 h-3.5" aria-hidden="true" />
          Embed
        </button>
        <button
          onClick={() => setReportOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200 active:scale-95 min-h-[44px]"
          aria-label="Report song"
        >
          <FlagIcon className="w-3.5 h-3.5" aria-hidden="true" />
          Report
        </button>
      </div>

      {/* Embed modal */}
      {embed.embedOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Embed player"
          onClick={(e) => { if (e.target === e.currentTarget) embed.setEmbedOpen(false); }}
        >
          <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <CodeBracketIcon className="w-4 h-4 text-violet-500" />
                Embed player
              </h2>
              <button
                onClick={() => embed.setEmbedOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Options */}
            <div className="flex gap-4 text-xs">
              <div className="space-y-1">
                <p className="text-gray-500 dark:text-gray-400 font-medium">Theme</p>
                <div className="flex gap-1.5">
                  {(["dark", "light"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => embed.setEmbedTheme(t)}
                      className={`px-2.5 py-1 rounded-md border capitalize transition-colors ${embed.embedTheme === t ? "border-violet-500 bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400" : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-400"}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-gray-500 dark:text-gray-400 font-medium">Width</p>
                <div className="flex gap-1.5">
                  {["100%", "480px", "320px"].map((w) => (
                    <button
                      key={w}
                      onClick={() => embed.setEmbedWidth(w)}
                      className={`px-2.5 py-1 rounded-md border transition-colors ${embed.embedWidth === w ? "border-violet-500 bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400" : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-400"}`}
                    >
                      {w}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
              <iframe
                src={`/embed/${songId}?theme=${embed.embedTheme}`}
                width="100%"
                height="96"
                style={{ border: "none", display: "block" }}
                title={`${title} — SunoFlow`}
              />
            </div>

            {/* Code */}
            <div className="relative">
              <textarea
                readOnly
                rows={3}
                aria-label="Embed code"
                value={embed.getEmbedCode()}
                className="w-full text-xs font-mono bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 resize-none text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-violet-500"
                onClick={(e) => (e.target as HTMLTextAreaElement).select()}
              />
            </div>

            <button
              onClick={embed.handleCopyEmbed}
              className="w-full py-2 text-sm font-medium rounded-lg bg-violet-600 hover:bg-violet-500 text-white transition-colors"
            >
              {embed.embedCopied ? "Copied!" : "Copy embed code"}
            </button>
          </div>
        </div>
      )}

      {/* Generate CTA for unauthenticated visitors */}
      {!session?.user && (
        <div className="bg-gradient-to-br from-violet-50 to-violet-100 dark:from-violet-950/30 dark:to-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-xl p-4 text-center space-y-3">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-violet-100 dark:bg-violet-900/40">
            <SparklesIcon className="w-5 h-5 text-violet-600 dark:text-violet-400" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Love this song?</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Generate something like it — free to try.</p>
          </div>
          <Link
            href={`/register?returnUrl=${encodeURIComponent(signupReturnUrl)}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <SparklesIcon className="w-4 h-4" aria-hidden="true" />
            Create your own music
          </Link>
        </div>
      )}

      {/* Report modal */}
      {reportOpen && (
        <ReportModal
          songId={songId}
          songTitle={title}
          onClose={() => setReportOpen(false)}
        />
      )}

      {/* Variations */}
      {showVariants && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Variations ({variants.length})
          </h2>
          <div className="space-y-2">
            {variants.map((v) => {
              const isActive = v.id === variant.activeSongId;
              return (
                <button
                  key={v.id}
                  onClick={() => handleVariantSwitch(v)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
                    isActive
                      ? "border-violet-400 bg-violet-50 dark:bg-violet-900/20"
                      : "border-gray-200 dark:border-gray-700 hover:border-violet-300 dark:hover:border-violet-600"
                  }`}
                >
                  <div className="relative w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 overflow-hidden flex-shrink-0">
                    {v.imageUrl ? (
                      <Image src={v.imageUrl} alt={v.title ?? "Variant"} fill className="object-cover" sizes="40px" />
                    ) : (
                      <MusicalNoteIcon className="w-5 h-5 text-gray-400 dark:text-gray-600 absolute inset-0 m-auto" />
                    )}
                    {!isActive && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity">
                        <PlayIcon className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-gray-900 dark:text-white block truncate">
                      {v.title || "Untitled variation"}
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      {v.duration != null && (
                        <span className="text-xs text-gray-400 dark:text-gray-500">{formatTime(v.duration)}</span>
                      )}
                      {v.tags && (
                        <span className="text-xs text-gray-400 dark:text-gray-500 truncate">{v.tags}</span>
                      )}
                    </div>
                  </div>
                  {isActive && (
                    <span className="flex-shrink-0 text-xs font-medium text-violet-600 dark:text-violet-400 px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/40">
                      Playing
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Comments */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
        <CommentsSection
          songId={songId}
          songOwnerId={songOwnerId ?? undefined}
          currentTime={audio.currentTime}
          duration={audio.audioDuration}
          onSeek={(seconds) => {
            if (audio.audioRef.current && audio.audioDuration > 0) {
              audio.audioRef.current.currentTime = seconds;
            }
          }}
        />
      </div>

      {/* Related songs */}
      <RelatedSongs songId={songId} />

      {/* Branding */}
      <p className="text-center text-xs text-gray-500 dark:text-gray-400">
        Shared via SunoFlow
      </p>
      </div>
      </div>
    </div>
  );
}

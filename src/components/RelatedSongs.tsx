"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { PlayIcon, MusicalNoteIcon } from "@heroicons/react/24/solid";

interface RelatedSong {
  id: string;
  title: string | null;
  tags: string | null;
  imageUrl: string | null;
  duration: number | null;
  audioUrl: string | null;
  publicSlug: string | null;
  creatorName: string | null;
  creatorUsername: string | null;
  score: number;
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface RelatedSongsProps {
  songId: string;
}

export function RelatedSongs({ songId }: RelatedSongsProps) {
  const [songs, setSongs] = useState<RelatedSong[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/songs/${songId}/related?limit=8`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.songs) {
          setSongs(data.songs);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [songId]);

  if (loading) {
    return (
      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          You might also like
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse h-24"
            />
          ))}
        </div>
      </div>
    );
  }

  if (songs.length === 0) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
        You might also like
      </h2>
      <div className="grid grid-cols-2 gap-2">
        {songs.map((song) => {
          const href = song.publicSlug ? `/s/${song.publicSlug}` : `/songs/${song.id}`;
          return (
            <Link
              key={song.id}
              href={href}
              className="group relative flex flex-col rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 overflow-hidden hover:border-violet-400 dark:hover:border-violet-600 transition-colors"
            >
              {/* Cover art */}
              <div className="relative aspect-square w-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                {song.imageUrl ? (
                  <Image
                    src={song.imageUrl}
                    alt={song.title ?? "Song"}
                    fill
                    className="object-cover"
                    sizes="(max-width: 384px) 50vw, 192px"
                  />
                ) : (
                  <MusicalNoteIcon className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                )}
                {/* Play overlay */}
                {song.audioUrl && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-10 h-10 rounded-full bg-violet-600/90 flex items-center justify-center">
                      <PlayIcon className="w-5 h-5 text-white ml-0.5" />
                    </div>
                  </div>
                )}
                {/* Duration badge */}
                {song.duration && (
                  <span className="absolute bottom-1 right-1 text-[10px] font-medium bg-black/60 text-white rounded px-1 py-0.5 leading-none">
                    {formatDuration(song.duration)}
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="p-2 space-y-0.5 min-w-0">
                <p className="text-xs font-semibold text-gray-900 dark:text-white truncate leading-tight">
                  {song.title ?? "Untitled"}
                </p>
                {song.creatorName && (
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                    {song.creatorName}
                  </p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

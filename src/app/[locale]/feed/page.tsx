"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { AppShell } from "@/components/AppShell";
import {
  MusicalNoteIcon,
  UserGroupIcon,
  QueueListIcon,
  HeartIcon,
  ChatBubbleLeftIcon,
  UserPlusIcon,
} from "@heroicons/react/24/outline";

interface FeedUser {
  id: string;
  name: string | null;
  image: string | null;
  username?: string | null;
}

interface FeedSong {
  id: string;
  publicSlug: string | null;
  title: string | null;
  imageUrl: string | null;
  duration: number | null;
  tags: string | null;
}

interface FeedPlaylist {
  id: string;
  name: string;
  slug: string | null;
  songCount: number;
}

interface FeedItem {
  id: string;
  type: "song_created" | "playlist_created" | "song_favorited" | "song_commented" | "new_follower";
  createdAt: string;
  user: FeedUser;
  song: FeedSong | null;
  playlist: FeedPlaylist | null;
  followedUser: FeedUser | null;
}

interface Pagination {
  page: number;
  totalPages: number;
  total: number;
  hasMore: boolean;
}

type FeedMode = "following" | "discover";
type EventFilter = "all" | "song_created" | "song_favorited" | "song_commented" | "new_follower" | "playlist_created";

const EVENT_FILTERS: { value: EventFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "song_created", label: "Songs" },
  { value: "song_favorited", label: "Likes" },
  { value: "song_commented", label: "Comments" },
  { value: "new_follower", label: "Follows" },
  { value: "playlist_created", label: "Playlists" },
];

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function Avatar({ user }: { user: FeedUser }) {
  const initials = (user.name ?? "?").charAt(0).toUpperCase();
  if (user.image) {
    return (
      <Image
        src={user.image}
        alt={user.name ?? "User"}
        width={36}
        height={36}
        className="w-9 h-9 rounded-full object-cover flex-shrink-0"
      />
    );
  }
  return (
    <div className="w-9 h-9 rounded-full bg-violet-600 flex items-center justify-center flex-shrink-0">
      <span className="text-sm font-bold text-white">{initials}</span>
    </div>
  );
}

function SongThumb({ song }: { song: FeedSong }) {
  return (
    <>
      <div className="w-12 h-12 rounded-lg bg-gray-200 dark:bg-gray-700 flex-shrink-0 overflow-hidden flex items-center justify-center">
        {song.imageUrl ? (
          <Image
            src={song.imageUrl}
            alt={song.title ?? "Song"}
            width={48}
            height={48}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <MusicalNoteIcon className="w-6 h-6 text-gray-400 dark:text-gray-500" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
          {song.title ?? "Untitled"}
        </p>
        {song.tags && (
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{song.tags}</p>
        )}
      </div>
    </>
  );
}

function FeedItemCard({ item }: { item: FeedItem }) {
  const userHref = item.user.username ? `/u/${item.user.username}` : `/users/${item.user.id}`;

  if ((item.type === "song_created" || item.type === "song_favorited" || item.type === "song_commented") && item.song) {
    const songHref = item.song.publicSlug ? `/s/${item.song.publicSlug}` : null;
    const actionText =
      item.type === "song_created"
        ? "published a song"
        : item.type === "song_favorited"
        ? "liked a song"
        : "commented on a song";
    const actionIcon =
      item.type === "song_favorited" ? (
        <HeartIcon className="w-3.5 h-3.5 text-pink-500 inline" />
      ) : item.type === "song_commented" ? (
        <ChatBubbleLeftIcon className="w-3.5 h-3.5 text-blue-400 inline" />
      ) : null;

    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 flex gap-3">
        <Link href={userHref}>
          <Avatar user={item.user} />
        </Link>
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <Link href={userHref} className="text-sm font-semibold text-gray-900 dark:text-white hover:text-violet-600 dark:hover:text-violet-400">
              {item.user.name ?? "Someone"}
            </Link>
            <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
              {actionIcon} {actionText}
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto flex-shrink-0">
              {formatRelativeTime(item.createdAt)}
            </span>
          </div>
          {songHref ? (
            <Link href={songHref} className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg p-2 transition-colors">
              <SongThumb song={item.song} />
            </Link>
          ) : (
            <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
              <SongThumb song={item.song} />
            </div>
          )}
        </div>
      </div>
    );
  }

  if (item.type === "playlist_created" && item.playlist) {
    const playlistHref = item.playlist.slug
      ? `/playlists/${item.playlist.slug}`
      : `/playlists/${item.playlist.id}`;
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 flex gap-3">
        <Link href={userHref}>
          <Avatar user={item.user} />
        </Link>
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <Link href={userHref} className="text-sm font-semibold text-gray-900 dark:text-white hover:text-violet-600 dark:hover:text-violet-400">
              {item.user.name ?? "Someone"}
            </Link>
            <span className="text-sm text-gray-500 dark:text-gray-400">created a playlist</span>
            <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto flex-shrink-0">
              {formatRelativeTime(item.createdAt)}
            </span>
          </div>
          <Link href={playlistHref} className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg p-2 transition-colors">
            <div className="w-12 h-12 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center flex-shrink-0">
              <QueueListIcon className="w-6 h-6 text-violet-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.playlist.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {item.playlist.songCount} song{item.playlist.songCount !== 1 ? "s" : ""}
              </p>
            </div>
          </Link>
        </div>
      </div>
    );
  }

  if (item.type === "new_follower" && item.followedUser) {
    const followedHref = item.followedUser.username
      ? `/u/${item.followedUser.username}`
      : `/users/${item.followedUser.id}`;
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 flex gap-3">
        <Link href={userHref}>
          <Avatar user={item.user} />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <Link href={userHref} className="text-sm font-semibold text-gray-900 dark:text-white hover:text-violet-600 dark:hover:text-violet-400">
              {item.user.name ?? "Someone"}
            </Link>
            <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <UserPlusIcon className="w-3.5 h-3.5 text-green-500 inline" /> started following
            </span>
            <Link href={followedHref} className="text-sm font-semibold text-gray-900 dark:text-white hover:text-violet-600 dark:hover:text-violet-400">
              {item.followedUser.name ?? "someone"}
            </Link>
            <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto flex-shrink-0">
              {formatRelativeTime(item.createdAt)}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

function FeedContent({ mode, eventFilter }: { mode: FeedMode; eventFilter: EventFilter }) {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const fetchFeed = useCallback(async (page: number, append = false) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), mode });
      if (eventFilter !== "all") params.set("type", eventFilter);
      const res = await fetch(`/api/feed?${params}`);
      if (!res.ok) return;
      const data = await res.json();
      setItems((prev) => append ? [...prev, ...data.items] : data.items);
      setPagination(data.pagination);
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [mode, eventFilter]);

  useEffect(() => {
    fetchFeed(1);
  }, [fetchFeed]);

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && pagination?.hasMore && !loadingMore) {
        fetchFeed(pagination.page + 1, true);
      }
    });
    if (sentinelRef.current) observerRef.current.observe(sentinelRef.current);
    return () => observerRef.current?.disconnect();
  }, [pagination, loadingMore, fetchFeed]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 animate-pulse h-24" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <UserGroupIcon className="w-12 h-12 text-gray-300 dark:text-gray-700" />
        <div className="space-y-1">
          <p className="text-base font-medium text-gray-700 dark:text-gray-300">
            {mode === "following" ? "Your feed is empty" : "Nothing to discover yet"}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {mode === "following"
              ? "Follow other creators to see their songs, playlists, and activity here."
              : "Check back later for trending activity from the community."}
          </p>
        </div>
        {mode === "following" && (
          <Link
            href="/discover"
            className="mt-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Discover creators
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <FeedItemCard key={item.id} item={item} />
      ))}
      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="h-4" />
      {loadingMore && (
        <div className="text-center py-2">
          <span className="text-sm text-gray-400">Loading…</span>
        </div>
      )}
    </div>
  );
}

export default function FeedPage() {
  const { status } = useSession();
  const [mode, setMode] = useState<FeedMode>("following");
  const [eventFilter, setEventFilter] = useState<EventFilter>("all");

  if (status === "unauthenticated") {
    return (
      <AppShell>
        <div className="px-4 py-16 flex flex-col items-center gap-4 text-center">
          <UserGroupIcon className="w-12 h-12 text-gray-300 dark:text-gray-700" />
          <p className="text-base font-medium text-gray-700 dark:text-gray-300">
            Sign in to see your feed
          </p>
          <Link
            href="/login"
            className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Sign in
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="px-4 py-6 space-y-4">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Feed</h1>

        {/* Mode tabs: Following / Discover */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 w-fit">
          {(["following", "discover"] as const).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setEventFilter("all"); }}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${
                mode === m
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              {m === "following" ? "Following" : "Discover"}
            </button>
          ))}
        </div>

        {/* Event type filter */}
        <div className="flex gap-2 flex-wrap">
          {EVENT_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setEventFilter(f.value)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                eventFilter === f.value
                  ? "bg-violet-600 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <FeedContent key={`${mode}-${eventFilter}`} mode={mode} eventFilter={eventFilter} />
      </div>
    </AppShell>
  );
}

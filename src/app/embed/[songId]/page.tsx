import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { EmbedSongPlayer } from "./EmbedSongPlayer";
import { cached, cacheKey, CacheTTL } from "@/lib/cache";

/** ISR: revalidate embed pages every 60 seconds */
export const revalidate = 60;

const getSong = cache((songId: string) =>
  cached(
    cacheKey("public-song-embed", songId),
    () =>
      prisma.song.findUnique({
        where: { id: songId },
        include: { user: { select: { name: true } } },
      }),
    CacheTTL.PUBLIC_SONG
  )
);

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sunoflow.app";

export default async function EmbedSongPage({
  params,
  searchParams,
}: {
  params: { songId: string };
  searchParams: { theme?: string; autoplay?: string };
}) {
  const song = await getSong(params.songId);

  const theme = searchParams.theme === "light" ? "light" : "dark";

  if (!song || !song.isPublic || song.isHidden || song.archivedAt) {
    const isDark = theme === "dark";
    return (
      <html lang="en">
        <head>
          <meta charSet="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <meta name="robots" content="noindex" />
          <title>Song Unavailable — SunoFlow</title>
        </head>
        <body
          style={{ margin: 0, padding: "8px", boxSizing: "border-box" }}
          className={isDark ? "bg-gray-950" : "bg-white"}
        >
          <div
            className={`flex items-center gap-3 w-full h-[80px] px-4 rounded-xl border ${isDark ? "bg-gray-900 border-gray-800 text-gray-400" : "bg-gray-50 border-gray-200 text-gray-400"}`}
          >
            <span className="text-sm">This song is no longer available.</span>
          </div>
        </body>
      </html>
    );
  }
  const autoplay = searchParams.autoplay === "1";

  const title = song.title ?? "Untitled";
  const creatorName = song.user.name;
  const songUrl = song.publicSlug
    ? `${siteUrl}/s/${song.publicSlug}`
    : `${siteUrl}/songs/${params.songId}`;

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="noindex" />
        <title>{title} — SunoFlow</title>
      </head>
      <body
        style={{ margin: 0, padding: "8px", boxSizing: "border-box" }}
        className={theme === "dark" ? "bg-gray-950" : "bg-white"}
      >
        <EmbedSongPlayer
          songId={song.id}
          title={title}
          creatorName={creatorName}
          imageUrl={song.imageUrl}
          audioUrl={song.audioUrl}
          duration={song.duration}
          theme={theme}
          songUrl={songUrl}
          autoplay={autoplay}
        />
      </body>
    </html>
  );
}

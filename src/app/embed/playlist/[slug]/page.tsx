import { cache } from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { EmbedPlaylistPlayer } from "./EmbedPlaylistPlayer";
import { cached, cacheKey, CacheTTL } from "@/lib/cache";

/** ISR: revalidate embed pages every 60 seconds */
export const revalidate = 60;

const getPlaylist = cache((slug: string) =>
  cached(
    cacheKey("public-playlist-embed", slug),
    () =>
      prisma.playlist.findUnique({
        where: { slug },
        include: {
          user: { select: { name: true } },
          songs: {
            orderBy: { position: "asc" },
            include: {
              song: {
                select: {
                  id: true,
                  title: true,
                  audioUrl: true,
                  imageUrl: true,
                  duration: true,
                  isHidden: true,
                  archivedAt: true,
                },
              },
            },
          },
        },
      }),
    CacheTTL.PUBLIC_SONG
  )
);

export default async function EmbedPlaylistPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const playlist = await getPlaylist(slug);

  if (!playlist || !playlist.isPublic) {
    notFound();
  }

  const visibleSongs = playlist.songs
    .filter((ps) => !ps.song.isHidden && !ps.song.archivedAt)
    .map((ps) => ({
      id: ps.song.id,
      title: ps.song.title,
      audioUrl: ps.song.audioUrl,
      imageUrl: ps.song.imageUrl,
      duration: ps.song.duration,
    }));

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <EmbedPlaylistPlayer
        name={playlist.name}
        creatorName={playlist.user.name ?? "Unknown"}
        songs={visibleSongs}
      />
    </div>
  );
}

import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PublicSongView } from "./PublicSongView";

export default async function PublicSongPage({
  params,
}: {
  params: { slug: string };
}) {
  const song = await prisma.song.findUnique({
    where: { publicSlug: params.slug },
    include: { user: { select: { name: true } } },
  });

  if (!song || !song.isPublic) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-4">
      <PublicSongView
        title={song.title ?? "Untitled"}
        imageUrl={song.imageUrl}
        audioUrl={song.audioUrl}
        duration={song.duration}
        tags={song.tags}
        creatorName={song.user.name}
      />
    </div>
  );
}

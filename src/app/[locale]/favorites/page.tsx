import type { Metadata } from "next";
import { Suspense } from "react";
import { Heart } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/AppShell";
import { LibraryView } from "@/components/LibraryView";
import { LibrarySkeleton } from "@/components/Skeleton";
import { Icon } from "@/components/ui/Icon";
import { auth } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Favorites",
  description: "Your favorited AI-generated songs, all in one place.",
  robots: { index: false },
};
import { prisma } from "@/lib/prisma";

async function fetchFavorites() {
  try {
    const session = await auth();
    if (!session?.user?.id) return [];

    const favorites = await prisma.favorite.findMany({
      where: { userId: session.user.id },
      include: {
        song: {
          include: {
            songTags: { include: { tag: true }, orderBy: { tag: { name: "asc" } } },
            _count: { select: { favorites: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return favorites.map((f) => ({
      ...f.song,
      isFavorite: true,
      favoriteCount: f.song._count.favorites,
    }));
  } catch {
    return [];
  }
}

export default async function FavoritesPage() {
  const [songs, t] = await Promise.all([fetchFavorites(), getTranslations("favorites")]);

  return (
    <AppShell>
      <Suspense fallback={<LibrarySkeleton />}>
        {songs.length === 0 ? (
          // The empty branch must still render the page heading — without it
          // /favorites had no h1 at all and read as an anonymous error state.
          <div className="p-4 space-y-6">
            <h1 className="text-xl font-bold text-primary">{t("title")}</h1>
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="w-16 h-16 rounded-full bg-surface-raised flex items-center justify-center mb-4">
                <Icon icon={Heart} className="w-8 h-8 text-muted" aria-hidden="true" />
              </div>
              <h2 className="text-lg font-semibold text-primary mb-1">{t("noFavorites")}</h2>
              <p className="text-sm text-secondary max-w-sm">{t("noFavoritesDescription")}</p>
            </div>
          </div>
        ) : (
          <LibraryView
            initialSongs={songs as never[]}
            title={t("title")}
            enableServerSearch={false}
            lockedSmartFilter="favorites"
          />
        )}
      </Suspense>
    </AppShell>
  );
}

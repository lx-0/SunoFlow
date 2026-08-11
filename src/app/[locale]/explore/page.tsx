import type { Metadata } from "next";
import { APP_NAME } from "@/lib/branding";
import { getInitialBrowseSongs } from "@/lib/discovery";
import { DiscoverView } from "../discover/DiscoverView";

export const metadata: Metadata = {
  title: `Explore Songs — ${APP_NAME}`,
  description:
    `Browse and listen to publicly shared AI-generated songs on ${APP_NAME}.`,
  openGraph: {
    title: `Explore Songs — ${APP_NAME}`,
    description:
      `Browse and listen to publicly shared AI-generated songs on ${APP_NAME}.`,
    type: "website",
  },
};

/** ISR: revalidate explore page every 60 seconds */
export const revalidate = 60;

export default async function ExplorePage() {
  const { songs, pagination } = await getInitialBrowseSongs();
  return (
    <DiscoverView
      basePath="/explore"
      initialSongs={songs}
      initialPagination={pagination}
      defaultTab="browse"
    />
  );
}

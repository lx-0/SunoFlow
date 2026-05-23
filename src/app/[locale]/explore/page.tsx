import type { Metadata } from "next";
import { getInitialBrowseSongs } from "@/lib/discovery";
import { DiscoverView } from "../discover/DiscoverView";

export const metadata: Metadata = {
  title: "Explore Songs — SunoFlow",
  description:
    "Browse and listen to publicly shared AI-generated songs on SunoFlow.",
  openGraph: {
    title: "Explore Songs — SunoFlow",
    description:
      "Browse and listen to publicly shared AI-generated songs on SunoFlow.",
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

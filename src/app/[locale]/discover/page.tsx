import type { Metadata } from "next";
import { getInitialBrowseSongs } from "@/lib/discover/get-initial-browse-songs";
import { DiscoverView } from "./DiscoverView";

export const metadata: Metadata = {
  title: "Discover Songs — SunoFlow",
  description:
    "Explore and listen to publicly shared AI-generated songs on SunoFlow.",
  openGraph: {
    title: "Discover Songs — SunoFlow",
    description:
      "Explore and listen to publicly shared AI-generated songs on SunoFlow.",
    type: "website",
  },
};

/** ISR: revalidate discover page every 60 seconds */
export const revalidate = 60;

export default async function DiscoverPage() {
  const { songs, pagination } = await getInitialBrowseSongs();
  return (
    <DiscoverView
      initialSongs={songs}
      initialPagination={pagination}
      defaultTab="browse"
    />
  );
}

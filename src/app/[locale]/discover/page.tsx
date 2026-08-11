import type { Metadata } from "next";
import { APP_NAME } from "@/lib/branding";
import { getInitialBrowseSongs } from "@/lib/discovery";
import { DiscoverView } from "./DiscoverView";

export const metadata: Metadata = {
  title: `Discover Songs — ${APP_NAME}`,
  description:
    `Explore and listen to publicly shared AI-generated songs on ${APP_NAME}.`,
  openGraph: {
    title: `Discover Songs — ${APP_NAME}`,
    description:
      `Explore and listen to publicly shared AI-generated songs on ${APP_NAME}.`,
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

import type { Metadata } from "next";
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

export default function ExplorePage() {
  return <DiscoverView basePath="/explore" />;
}

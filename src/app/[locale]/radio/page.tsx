import type { Metadata } from "next";
import { MoodRadioView } from "@/components/MoodRadioView";

export const metadata: Metadata = {
  title: "Mood Radio — SunoFlow",
  description: "Auto-playing radio that matches your selected mood or genre.",
  openGraph: {
    title: "Mood Radio — SunoFlow",
    description: "Auto-playing radio that matches your selected mood or genre.",
    type: "website",
  },
};

export default function RadioPage() {
  return <MoodRadioView />;
}

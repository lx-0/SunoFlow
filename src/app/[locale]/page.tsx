import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LandingPage } from "@/components/LandingPage";
import { safeJsonLd } from "@/lib/json-ld";
import { getSiteUrl } from "@/lib/site-url";
import { APP_NAME } from "@/lib/branding";

const siteUrl = getSiteUrl();

const TITLE = `${APP_NAME} — Your Personal AI Music Studio`;
const DESCRIPTION = `Generate, manage, and share AI-crafted music. ${APP_NAME} brings your library, inspiration feeds, and creative tools into one seamless workspace.`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: siteUrl,
    type: "website",
    images: [{ url: `${siteUrl}/icons/icon-512.png`, width: 512, height: 512, alt: APP_NAME }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: APP_NAME,
  url: siteUrl,
  description: DESCRIPTION,
};

export default async function HomePage() {
  const session = await auth();

  // Authenticated users go straight to their library
  if (session?.user) {
    redirect("/library");
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(websiteJsonLd) }}
      />
      <LandingPage />
    </>
  );
}

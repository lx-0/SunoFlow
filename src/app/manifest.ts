import type { MetadataRoute } from "next";
import { APP_NAME } from "@/lib/branding";

// The PWA manifest is generated rather than served from /public, so the product
// name follows NEXT_PUBLIC_APP_NAME like every other user-visible string. A
// static public/manifest.json cannot read build-time config — and its `name` is
// what iOS and Android print under the home-screen icon, which made it one of
// the most visible places a rename would have been missed.
//
// Colors mirror the DESIGN.md tokens (surface-deep background, Electric Magenta
// theme) and must stay in sync with the <meta name="theme-color"> in the layout.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${APP_NAME} — Personal Music Manager`,
    short_name: APP_NAME,
    description: "Manage your AI music, discover inspiration, and automate your creative workflow.",
    start_url: "/",
    display: "standalone",
    background_color: "#0f090c",
    theme_color: "#ef009c",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

const siteUrl = getSiteUrl();

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/s/", "/p/", "/u/", "/explore", "/discover"],
      disallow: [
        "/api/",
        "/login",
        "/register",
        "/library",
        "/playlists",
        "/favorites",
        "/history",
        "/generate",
        "/settings",
        "/profile",
        "/admin",
        "/dashboard/",
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}

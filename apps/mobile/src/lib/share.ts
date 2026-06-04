import { Share } from "react-native";

import { apiPatch, API_BASE_URL } from "@/api/client";

// Native share for songs + playlists. Mirrors the web ShareButton flow
// (src/components/ShareButton.tsx + src/hooks/usePlaylistShare.ts):
//
//   - Public URLs are ${API_BASE_URL}/s/<publicSlug> (songs) and
//     ${API_BASE_URL}/p/<slug> (playlists).
//   - The /share endpoints are PATCH *toggles* (toggleSongShare /
//     toggleShare): each call flips isPublic. We therefore only call them when
//     we don't already have a slug, so we never accidentally un-publish an
//     already-public item.
//   - Song share returns  { isPublic, publicSlug }.
//   - Playlist share returns { isPublic, slug }.
//
// Everything here is defensive and never throws uncaught: any failure is logged
// and swallowed so callers can fire-and-forget.

interface SongShareResponse {
  isPublic?: boolean;
  publicSlug?: string | null;
}

interface PlaylistShareResponse {
  isPublic?: boolean;
  slug?: string | null;
}

function songUrl(slug: string): string {
  return `${API_BASE_URL}/s/${slug}`;
}

function playlistUrl(slug: string): string {
  return `${API_BASE_URL}/p/${slug}`;
}

async function nativeShare(message: string, url: string): Promise<void> {
  try {
    // On iOS, url is surfaced separately; on Android it must be in message.
    await Share.share({ message: `${message} ${url}`.trim(), url });
  } catch (err) {
    console.error("[share] native share sheet failed", err);
  }
}

/**
 * Share a song via the native share sheet. If the song is already public
 * (publicSlug present), the URL is built directly. Otherwise the share endpoint
 * is called once to publish it and obtain a slug.
 */
export async function shareSong({
  id,
  title,
  publicSlug,
}: {
  id: string;
  title?: string | null;
  publicSlug?: string | null;
}): Promise<void> {
  try {
    let slug = typeof publicSlug === "string" && publicSlug ? publicSlug : null;

    if (!slug) {
      const data = await apiPatch<SongShareResponse>(
        `/api/songs/${id}/share`,
        {},
      );
      if (data && data.isPublic && typeof data.publicSlug === "string") {
        slug = data.publicSlug;
      }
    }

    if (!slug) {
      console.error("[share] song has no public slug after share attempt", id);
      return;
    }

    await nativeShare(title ?? "Check out this song", songUrl(slug));
  } catch (err) {
    console.error("[share] shareSong failed", err);
  }
}

/**
 * Share a playlist via the native share sheet. The playlist share endpoint is a
 * toggle, so it is only called when no slug can be derived yet. The mobile
 * caller does not currently track playlist slugs, so this publishes on first
 * share and reuses the returned slug.
 */
export async function sharePlaylist({
  id,
  name,
  slug: knownSlug,
}: {
  id: string;
  name?: string | null;
  slug?: string | null;
}): Promise<void> {
  try {
    let slug = typeof knownSlug === "string" && knownSlug ? knownSlug : null;

    if (!slug) {
      const data = await apiPatch<PlaylistShareResponse>(
        `/api/playlists/${id}/share`,
        {},
      );
      if (data && data.isPublic && typeof data.slug === "string") {
        slug = data.slug;
      }
    }

    if (!slug) {
      console.error(
        "[share] playlist has no public slug after share attempt",
        id,
      );
      return;
    }

    await nativeShare(name ?? "Check out this playlist", playlistUrl(slug));
  } catch (err) {
    console.error("[share] sharePlaylist failed", err);
  }
}

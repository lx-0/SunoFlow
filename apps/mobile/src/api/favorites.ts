import { apiGet, apiPost, apiDelete } from "./client";

// Favorites talk to the existing web endpoints (authRoute → resolveUser accepts
// the bearer sk- key). GET returns { isFavorite }, POST adds, DELETE removes.

export async function getFavorite(songId: string): Promise<boolean> {
  const res = await apiGet<{ isFavorite?: boolean }>(`/api/songs/${songId}/favorite`);
  return Boolean(res?.isFavorite);
}

export async function setFavorite(songId: string, favorite: boolean): Promise<void> {
  if (favorite) {
    await apiPost(`/api/songs/${songId}/favorite`, {});
  } else {
    await apiDelete(`/api/songs/${songId}/favorite`);
  }
}

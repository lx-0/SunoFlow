import { errorFromResult } from "@/lib/api-error";
import { optionalAuthDataRoute } from "@/lib/route-handler";
import { getPublicUserProfileByUsername } from "@/lib/profile";

type FeaturedSongResponse = {
  id: string;
  title: string;
  imageUrl: string | null;
  audioUrl: string | null;
  duration: number | null;
  tags: string | null;
  publicSlug: string | null;
};

function toFeaturedSongResponse(song: {
  id: string;
  title: string;
  imageUrl: string | null;
  audioUrl: string;
  duration: number | null;
  tags: string[];
  publicSlug: string | null;
}): FeaturedSongResponse {
  return {
    id: song.id,
    title: song.title,
    imageUrl: song.imageUrl,
    audioUrl: song.audioUrl || null,
    duration: song.duration,
    tags: song.tags.length > 0 ? song.tags.join(", ") : null,
    publicSlug: song.publicSlug,
  };
}

export const GET = optionalAuthDataRoute<{ username: string }>(async (_request, { auth, params }) => {
  const userResult = await getPublicUserProfileByUsername(params.username, auth.userId);
  if (!userResult.ok) {
    return errorFromResult(userResult);
  }

  const user = userResult.data;

  return {
    id: user.id,
    name: user.name,
    username: user.username,
    image: user.image,
    avatarUrl: user.avatarUrl,
    bannerUrl: user.bannerUrl,
    bio: user.bio,
    createdAt: user.createdAt,
    followersCount: user.followersCount,
    followingCount: user.followingCount,
    publicSongsCount: user.publicSongsCount,
    totalPlays: user.totalPlays,
    featuredSong: user.featuredSong ? toFeaturedSongResponse(user.featuredSong) : null,
    isFollowing: user.isFollowing,
  };
}, { route: "/api/u/[username]" });

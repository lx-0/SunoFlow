import type { Song } from "@prisma/client";

export interface CollaboratorUser {
  id: string;
  name: string | null;
  image: string | null;
  avatarUrl: string | null;
  username?: string | null;
}

export interface PlaylistSongItem {
  id: string;
  songId: string;
  position: number;
  song: Song;
  addedByUser: CollaboratorUser | null;
}

export interface PlaylistCollaboratorItem {
  id: string;
  userId: string | null;
  status: string;
  role?: string;
  user: CollaboratorUser | null;
}

export interface PlaylistActivityItem {
  id: string;
  type: string;
  createdAt: string;
  user: CollaboratorUser | null;
  song: { id: string; title: string | null; imageUrl: string | null } | null;
}

export interface PlaylistData {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  isPublished?: boolean;
  publishedAt?: string | null;
  genre?: string | null;
  isCollaborative: boolean;
  slug: string | null;
  songs: PlaylistSongItem[];
  _count: { songs: number };
  collaborators: PlaylistCollaboratorItem[];
}

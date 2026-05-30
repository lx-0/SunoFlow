"use client";

import { useState, useCallback } from "react";
import { apiDelete, apiPatch, apiPost } from "@/lib/api-client";

interface CollaboratorUser {
  id: string;
  name: string | null;
  image: string | null;
  avatarUrl: string | null;
  username?: string | null;
}

export interface PlaylistCollaboratorItem {
  id: string;
  userId: string | null;
  status: string;
  role?: string;
  user: CollaboratorUser | null;
}

interface UsePlaylistCollaborationOptions {
  playlistId: string;
  initialIsCollaborative: boolean;
  initialCollaborators: PlaylistCollaboratorItem[];
  toast: (message: string, type: "success" | "error") => void;
}

export function usePlaylistCollaboration({
  playlistId,
  initialIsCollaborative,
  initialCollaborators,
  toast,
}: UsePlaylistCollaborationOptions) {
  const [isCollaborative, setIsCollaborative] = useState(initialIsCollaborative);
  const [collaborators, setCollaborators] = useState<PlaylistCollaboratorItem[]>(
    initialCollaborators
  );
  const [showCollabPanel, setShowCollabPanel] = useState(false);
  const [isTogglingCollab, setIsTogglingCollab] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false);
  const [inviteUsername, setInviteUsername] = useState("");
  const [inviteRole, setInviteRole] = useState<"editor" | "viewer">("editor");
  const [isInvitingByUsername, setIsInvitingByUsername] = useState(false);

  const toggleCollabPanel = useCallback(() => {
    setShowCollabPanel((v) => !v);
  }, []);

  const closeCollabPanel = useCallback(() => {
    setShowCollabPanel(false);
  }, []);

  const handleToggleCollaborative = useCallback(async () => {
    if (isTogglingCollab) return;
    setIsTogglingCollab(true);
    try {
      const data = await apiPatch<{ isCollaborative: boolean }>(`/api/playlists/${playlistId}/collaborative`, {});
      setIsCollaborative(data.isCollaborative);
      if (!data.isCollaborative) setInviteLink(null);
      toast(data.isCollaborative ? "Collaborative mode enabled" : "Collaborative mode disabled", "success");
    } catch {
      toast("Failed to update collaborative mode", "error");
    } finally {
      setIsTogglingCollab(false);
    }
  }, [isTogglingCollab, playlistId, toast]);

  const handleGenerateInvite = useCallback(async () => {
    if (isGeneratingInvite) return;
    setIsGeneratingInvite(true);
    try {
      const data = await apiPost<{ collaborator: { inviteToken: string } }>(`/api/playlists/${playlistId}/collaborators`, {});
      const link = `${window.location.origin}/playlists/invite/${data.collaborator.inviteToken}`;
      setInviteLink(link);
    } catch {
      toast("Failed to generate invite link", "error");
    } finally {
      setIsGeneratingInvite(false);
    }
  }, [isGeneratingInvite, playlistId, toast]);

  const handleCopyInviteLink = useCallback(() => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink).then(() => toast("Invite link copied!", "success"));
  }, [inviteLink, toast]);

  const handleRemoveCollaborator = useCallback(async (collaboratorId: string) => {
    try {
      await apiDelete(`/api/playlists/${playlistId}/collaborators/${collaboratorId}`);
      setCollaborators((prev) => prev.filter((c) => c.id !== collaboratorId));
      toast("Collaborator removed", "success");
    } catch {
      toast("Failed to remove collaborator", "error");
    }
  }, [playlistId, toast]);

  const handleInviteByUsername = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteUsername.trim() || isInvitingByUsername) return;
    setIsInvitingByUsername(true);
    try {
      const data = await apiPost<{ collaborator: PlaylistCollaboratorItem }>(
        `/api/playlists/${playlistId}/collaborators`,
        { username: inviteUsername.trim(), role: inviteRole }
      );
      setCollaborators((prev) => [...prev, data.collaborator]);
      setInviteUsername("");
      toast(`${data.collaborator.user?.name ?? inviteUsername} added as ${inviteRole}`, "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to invite user", "error");
    } finally {
      setIsInvitingByUsername(false);
    }
  }, [inviteUsername, isInvitingByUsername, playlistId, inviteRole, toast]);

  return {
    isCollaborative,
    collaborators,
    showCollabPanel,
    isTogglingCollab,
    inviteLink,
    isGeneratingInvite,
    inviteUsername,
    setInviteUsername,
    inviteRole,
    setInviteRole,
    isInvitingByUsername,
    toggleCollabPanel,
    closeCollabPanel,
    handleToggleCollaborative,
    handleGenerateInvite,
    handleCopyInviteLink,
    handleRemoveCollaborator,
    handleInviteByUsername,
  };
}

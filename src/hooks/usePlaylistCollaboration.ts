"use client";

import { useState, useCallback } from "react";

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
      const res = await fetch(`/api/playlists/${playlistId}/collaborative`, { method: "PATCH" });
      if (!res.ok) { toast("Failed to update collaborative mode", "error"); return; }
      const data = await res.json();
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
      const res = await fetch(`/api/playlists/${playlistId}/collaborators`, { method: "POST" });
      if (!res.ok) { toast("Failed to generate invite link", "error"); return; }
      const data = await res.json();
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
      const res = await fetch(`/api/playlists/${playlistId}/collaborators/${collaboratorId}`, { method: "DELETE" });
      if (!res.ok) { toast("Failed to remove collaborator", "error"); return; }
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
      const res = await fetch(`/api/playlists/${playlistId}/collaborators`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: inviteUsername.trim(), role: inviteRole }),
      });
      const data = await res.json();
      if (!res.ok) { toast(data.error ?? "Failed to invite user", "error"); return; }
      setCollaborators((prev) => [...prev, data.collaborator]);
      setInviteUsername("");
      toast(`${data.collaborator.user?.name ?? inviteUsername} added as ${inviteRole}`, "success");
    } catch {
      toast("Failed to invite user", "error");
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

"use client";

import { useState } from "react";
import type { PlaylistCollaboratorItem } from "./types";

interface UsePlaylistCollaborationParams {
  playlistId: string;
  initialIsCollaborative: boolean;
  initialCollaborators: PlaylistCollaboratorItem[];
  toast: (msg: string, type: "success" | "error" | "info") => void;
}

export function usePlaylistCollaboration({
  playlistId,
  initialIsCollaborative,
  initialCollaborators,
  toast,
}: UsePlaylistCollaborationParams) {
  const [isCollaborative, setIsCollaborative] = useState(initialIsCollaborative);
  const [collaborators, setCollaborators] = useState<PlaylistCollaboratorItem[]>(
    initialCollaborators
  );
  const [showCollabPanel, setShowCollabPanel] = useState(false);
  const [isTogglingCollab, setIsTogglingCollab] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false);

  async function handleToggleCollaborative() {
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
  }

  async function handleGenerateInvite() {
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
  }

  function handleCopyInviteLink() {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink).then(() => toast("Invite link copied!", "success"));
  }

  async function handleRemoveCollaborator(collaboratorId: string) {
    try {
      const res = await fetch(`/api/playlists/${playlistId}/collaborators/${collaboratorId}`, { method: "DELETE" });
      if (!res.ok) { toast("Failed to remove collaborator", "error"); return; }
      setCollaborators((prev) => prev.filter((c) => c.id !== collaboratorId));
      toast("Collaborator removed", "success");
    } catch {
      toast("Failed to remove collaborator", "error");
    }
  }

  async function handleInviteByUsername(username: string, role: "editor" | "viewer") {
    try {
      const res = await fetch(`/api/playlists/${playlistId}/collaborators`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, role }),
      });
      const data = await res.json();
      if (!res.ok) { toast(data.error ?? "Failed to invite user", "error"); return; }
      setCollaborators((prev) => [...prev, data.collaborator]);
      toast(`${data.collaborator.user?.name ?? username} added as ${role}`, "success");
    } catch {
      toast("Failed to invite user", "error");
    }
  }

  return {
    isCollaborative,
    collaborators,
    showCollabPanel,
    isTogglingCollab,
    inviteLink,
    isGeneratingInvite,
    setShowCollabPanel,
    handleToggleCollaborative,
    handleGenerateInvite,
    handleCopyInviteLink,
    handleRemoveCollaborator,
    handleInviteByUsername,
  };
}

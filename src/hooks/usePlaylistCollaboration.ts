"use client";

import { useState } from "react";

interface CollaboratorUser {
  id: string;
  name: string | null;
  image: string | null;
  avatarUrl: string | null;
  username?: string | null;
}

interface PlaylistCollaboratorItem {
  id: string;
  userId: string | null;
  status: string;
  role?: string;
  user: CollaboratorUser | null;
}

export function usePlaylistCollaboration(
  playlistId: string,
  initialIsCollaborative: boolean,
  initialCollaborators: PlaylistCollaboratorItem[],
  toast: (message: string, type: "success" | "error") => void,
) {
  const [isCollaborative, setIsCollaborative] = useState(initialIsCollaborative);
  const [collaborators, setCollaborators] = useState<PlaylistCollaboratorItem[]>(
    initialCollaborators,
  );
  const [showCollabPanel, setShowCollabPanel] = useState(false);
  const [isTogglingCollab, setIsTogglingCollab] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false);
  const [inviteUsername, setInviteUsername] = useState("");
  const [inviteRole, setInviteRole] = useState<"editor" | "viewer">("editor");
  const [isInvitingByUsername, setIsInvitingByUsername] = useState(false);

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

  async function handleInviteByUsername(e: React.FormEvent) {
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
  }

  return {
    isCollaborative,
    collaborators,
    showCollabPanel,
    setShowCollabPanel,
    isTogglingCollab,
    inviteLink,
    isGeneratingInvite,
    inviteUsername,
    setInviteUsername,
    inviteRole,
    setInviteRole,
    isInvitingByUsername,
    handleToggleCollaborative,
    handleGenerateInvite,
    handleCopyInviteLink,
    handleRemoveCollaborator,
    handleInviteByUsername,
  };
}

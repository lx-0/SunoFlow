"use client";

import { useState } from "react";

interface UsePlaylistEditingParams {
  playlistId: string;
  initialName: string;
  initialDescription: string | null;
  toast: (msg: string, type: "success" | "error" | "info") => void;
  onSaved: (updates: Record<string, unknown>) => void;
}

export function usePlaylistEditing({
  playlistId,
  initialName,
  initialDescription,
  toast,
  onSaved,
}: UsePlaylistEditingParams) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(initialName);
  const [editDesc, setEditDesc] = useState(initialDescription || "");
  const [saving, setSaving] = useState(false);

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editName.trim() || saving) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/playlists/${playlistId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          description: editDesc.trim() || null,
        }),
      });
      if (!res.ok) {
        toast("Failed to update playlist", "error");
        return;
      }
      const data = await res.json();
      onSaved(data.playlist);
      setEditing(false);
      toast("Playlist updated", "success");
    } catch {
      toast("Failed to update playlist", "error");
    } finally {
      setSaving(false);
    }
  }

  function cancelEdit(name: string, description: string | null) {
    setEditing(false);
    setEditName(name);
    setEditDesc(description || "");
  }

  return {
    editing,
    editName,
    editDesc,
    saving,
    setEditing,
    setEditName,
    setEditDesc,
    handleSaveEdit,
    cancelEdit,
  };
}

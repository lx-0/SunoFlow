"use client";

import { useState, useCallback } from "react";

interface UsePlaylistEditingOptions {
  playlistId: string;
  initialName: string;
  initialDescription: string;
  toast: (message: string, type: "success" | "error") => void;
  onPlaylistUpdate: (data: Record<string, unknown>) => void;
  onDeleted: () => void;
}

export function usePlaylistEditing({
  playlistId,
  initialName,
  initialDescription,
  toast,
  onPlaylistUpdate,
  onDeleted,
}: UsePlaylistEditingOptions) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(initialName);
  const [editDesc, setEditDesc] = useState(initialDescription);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const startEdit = useCallback(() => {
    setEditing(true);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditName(initialName);
    setEditDesc(initialDescription);
    setEditing(false);
  }, [initialName, initialDescription]);

  const handleSaveEdit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/playlists/${playlistId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim(), description: editDesc.trim() || null }),
      });
      if (!res.ok) { toast("Failed to update playlist", "error"); return; }
      const data = await res.json();
      onPlaylistUpdate(data);
      setEditing(false);
      toast("Playlist updated", "success");
    } catch {
      toast("Failed to update playlist", "error");
    } finally {
      setSaving(false);
    }
  }, [editName, editDesc, playlistId, toast, onPlaylistUpdate]);

  const handleDelete = useCallback(async () => {
    setShowDeleteConfirm(false);
    try {
      const res = await fetch(`/api/playlists/${playlistId}`, { method: "DELETE" });
      if (!res.ok) { toast("Failed to delete playlist", "error"); return; }
      toast("Playlist deleted", "success");
      onDeleted();
    } catch {
      toast("Failed to delete playlist", "error");
    }
  }, [playlistId, toast, onDeleted]);

  return {
    editing,
    editName,
    setEditName,
    editDesc,
    setEditDesc,
    saving,
    showDeleteConfirm,
    setShowDeleteConfirm,
    handleSaveEdit,
    handleDelete,
    cancelEdit,
    startEdit,
  };
}

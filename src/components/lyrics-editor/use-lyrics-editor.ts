import { useCallback, useRef, useState } from "react";
import { useToast } from "../Toast";
import { fetchWithTimeout } from "@/lib/fetch-client";

export function useLyricsEditor(
  songId: string,
  originalLyrics: string | null,
  initialEditedLyrics: string | null
) {
  const { toast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [editDraft, setEditDraft] = useState(initialEditedLyrics ?? originalLyrics ?? "");
  const [savedEdited, setSavedEdited] = useState(initialEditedLyrics);
  const [saving, setSaving] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeLyrics = savedEdited ?? originalLyrics ?? "";

  const handleSaveLyrics = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetchWithTimeout(`/api/songs/${songId}/lyrics`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ edited: editDraft || null }),
      });
      if (!res.ok) throw new Error("save failed");
      const data = await res.json();
      setSavedEdited(data.edited);
      setIsEditing(false);
      toast("Lyrics saved");
    } catch {
      toast("Failed to save lyrics");
    } finally {
      setSaving(false);
    }
  }, [songId, editDraft, toast]);

  const handleDiscardEdits = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetchWithTimeout(`/api/songs/${songId}/lyrics`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ edited: null }),
      });
      if (!res.ok) throw new Error("save failed");
      setSavedEdited(null);
      setEditDraft(originalLyrics ?? "");
      toast("Reverted to original lyrics");
    } catch {
      toast("Failed to revert");
    } finally {
      setSaving(false);
    }
  }, [songId, originalLyrics, toast]);

  function startEditing() {
    setEditDraft(activeLyrics);
    setIsEditing(true);
  }

  function startAddingLyrics() {
    setIsEditing(true);
    setEditDraft("");
  }

  function cancelEditing() {
    setIsEditing(false);
  }

  function insertFormat(marker: string) {
    const ta = textareaRef.current;
    if (!ta) return;
    const { selectionStart: start, selectionEnd: end } = ta;
    const selected = editDraft.slice(start, end);
    const replacement = selected ? `${marker}${selected}${marker}` : `${marker}${marker}`;
    const next = editDraft.slice(0, start) + replacement + editDraft.slice(end);
    setEditDraft(next);
    setTimeout(() => {
      ta.focus();
      const cur = selected ? start + replacement.length : start + marker.length;
      ta.setSelectionRange(cur, cur);
    }, 0);
  }

  return {
    isEditing,
    editDraft,
    setEditDraft,
    savedEdited,
    saving,
    showOriginal,
    setShowOriginal,
    activeLyrics,
    textareaRef,
    handleSaveLyrics,
    handleDiscardEdits,
    startEditing,
    startAddingLyrics,
    cancelEditing,
    insertFormat,
  };
}

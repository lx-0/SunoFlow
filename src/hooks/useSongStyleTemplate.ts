"use client";

import { useState } from "react";

interface UseSongStyleTemplateOptions {
  songId: string;
  songTags: string | null;
  toast: (message: string, variant?: "success" | "error" | "info") => void;
}

export function useSongStyleTemplate({
  songId,
  songTags,
  toast,
}: UseSongStyleTemplateOptions) {
  const [saveStyleOpen, setSaveStyleOpen] = useState(false);
  const [styleTemplateName, setStyleTemplateName] = useState("");
  const [styleTemplateTags, setStyleTemplateTags] = useState("");
  const [isSavingStyle, setIsSavingStyle] = useState(false);

  function openSaveStyleModal() {
    setStyleTemplateName("");
    setStyleTemplateTags((songTags || "").trim());
    setSaveStyleOpen(true);
  }

  async function handleSaveStyleTemplate() {
    if (isSavingStyle || !styleTemplateName.trim() || !styleTemplateTags.trim()) return;

    const name = styleTemplateName.trim();
    const tags = styleTemplateTags.trim();
    setIsSavingStyle(true);
    try {
      const res = await fetch("/api/style-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          tags,
          sourceSongId: songId,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.error ?? "Failed to save style template", "error");
        return;
      }

      setSaveStyleOpen(false);
      setStyleTemplateName("");
      setStyleTemplateTags("");
      toast("Style template saved", "success");
    } catch {
      toast("Failed to save style template", "error");
    } finally {
      setIsSavingStyle(false);
    }
  }

  return {
    saveStyleOpen,
    setSaveStyleOpen,
    styleTemplateName,
    setStyleTemplateName,
    styleTemplateTags,
    setStyleTemplateTags,
    isSavingStyle,
    openSaveStyleModal,
    handleSaveStyleTemplate,
  };
}

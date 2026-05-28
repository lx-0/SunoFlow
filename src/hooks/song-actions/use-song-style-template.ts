"use client";

import { useCallback, useState } from "react";

type ToastFn = (message: string, type?: "success" | "error" | "info") => void;

interface UseSongStyleTemplateParams {
  songId: string;
  songTags: string | null;
  toast: ToastFn;
}

export function useSongStyleTemplate({
  songId,
  songTags,
  toast,
}: UseSongStyleTemplateParams) {
  const [saveStyleOpen, setSaveStyleOpen] = useState(false);
  const [styleTemplateName, setStyleTemplateName] = useState("");
  const [styleTemplateTags, setStyleTemplateTags] = useState("");
  const [isSavingStyle, setIsSavingStyle] = useState(false);

  const openSaveStyleModal = useCallback(() => {
    setStyleTemplateName("");
    setStyleTemplateTags((songTags || "").trim());
    setSaveStyleOpen(true);
  }, [songTags]);

  const handleSaveStyleTemplate = useCallback(async () => {
    if (isSavingStyle || !styleTemplateName.trim() || !styleTemplateTags.trim()) return;

    const name = styleTemplateName.trim();
    const tags = styleTemplateTags.trim();
    setIsSavingStyle(true);
    try {
      const res = await fetch("/api/style-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, tags, sourceSongId: songId }),
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
  }, [isSavingStyle, styleTemplateName, styleTemplateTags, songId, toast]);

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

"use client";

import { useCallback, useState } from "react";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { type ToastFn } from "@/components/Toast";


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

  const openSaveStyleModal = useCallback(() => {
    setStyleTemplateName("");
    setStyleTemplateTags((songTags || "").trim());
    setSaveStyleOpen(true);
  }, [songTags]);

  const [handleSaveStyleTemplate, isSavingStyle] = useAsyncAction(async () => {
    if (!styleTemplateName.trim() || !styleTemplateTags.trim()) return;
    const name = styleTemplateName.trim();
    const tags = styleTemplateTags.trim();
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
  });

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

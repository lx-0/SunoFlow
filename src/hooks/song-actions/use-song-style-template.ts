"use client";

import { useCallback, useState } from "react";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { type ToastFn } from "@/components/Toast";
import { callApi, jsonPost } from "./call-api";


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
    const ok = await callApi("/api/style-templates", jsonPost({ name, tags, sourceSongId: songId }), toast, "Failed to save style template");
    if (!ok) return;
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

import { useState } from "react";
import { useToast } from "../Toast";
import { apiPost } from "@/lib/api-client";

export function useSaveStyleTemplate() {
  const [saveStyleOpen, setSaveStyleOpen] = useState(false);
  const [styleTemplateName, setStyleTemplateName] = useState("");
  const [styleTemplateTags, setStyleTemplateTags] = useState("");
  const [isSavingStyle, setIsSavingStyle] = useState(false);
  const { toast } = useToast();

  function openSaveStyle(tags: string) {
    setStyleTemplateTags(tags);
    setStyleTemplateName("");
    setSaveStyleOpen(true);
  }

  function closeSaveStyle() {
    setSaveStyleOpen(false);
  }

  async function submitSaveStyle(sourceSongId: string) {
    setIsSavingStyle(true);
    try {
      await apiPost("/api/style-templates", {
        name: styleTemplateName.trim(),
        tags: styleTemplateTags.trim(),
        sourceSongId,
      });
      toast("Style template saved", "success");
      setSaveStyleOpen(false);
    } catch {
      toast("Failed to save template", "error");
    } finally {
      setIsSavingStyle(false);
    }
  }

  return {
    saveStyleOpen,
    styleTemplateName,
    setStyleTemplateName,
    styleTemplateTags,
    setStyleTemplateTags,
    isSavingStyle,
    openSaveStyle,
    closeSaveStyle,
    submitSaveStyle,
  };
}

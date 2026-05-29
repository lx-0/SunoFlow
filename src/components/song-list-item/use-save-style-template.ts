import { useState } from "react";
import { useToast } from "../Toast";

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
      const res = await fetch("/api/style-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: styleTemplateName.trim(),
          tags: styleTemplateTags.trim(),
          sourceSongId,
        }),
      });
      if (res.ok) {
        toast("Style template saved", "success");
        setSaveStyleOpen(false);
      } else {
        const data = await res.json();
        toast(data.error ?? "Failed to save template", "error");
      }
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

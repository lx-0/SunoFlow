import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "../Toast";
import { fetchWithTimeout } from "@/lib/fetch-client";

interface Annotation {
  lineIndex: number;
  body: string;
}

export function useAnnotationEditor(songId: string) {
  const { toast } = useToast();

  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [annotationsOpen, setAnnotationsOpen] = useState(false);
  const [editingAnnotation, setEditingAnnotation] = useState<number | null>(null);
  const [annotationDraft, setAnnotationDraft] = useState("");
  const [savingAnnotation, setSavingAnnotation] = useState(false);

  const annMap = useMemo(
    () => new Map<number, string>(annotations.map((a) => [a.lineIndex, a.body])),
    [annotations]
  );

  useEffect(() => {
    fetchWithTimeout(`/api/songs/${songId}/lyrics/annotations`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setAnnotations(data.annotations as Annotation[]);
        }
      });
  }, [songId]);

  const handleSaveAnnotation = useCallback(
    async (lineIndex: number, body: string) => {
      setSavingAnnotation(true);
      try {
        const res = await fetchWithTimeout(`/api/songs/${songId}/lyrics/annotations`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lineIndex, body }),
        });
        if (!res.ok) throw new Error("save failed");
        const data = await res.json();
        if (data.deleted) {
          setAnnotations((prev) => prev.filter((a) => a.lineIndex !== lineIndex));
        } else {
          setAnnotations((prev) => {
            const others = prev.filter((a) => a.lineIndex !== lineIndex);
            return [...others, { lineIndex, body }].sort((a, b) => a.lineIndex - b.lineIndex);
          });
        }
        setEditingAnnotation(null);
        setAnnotationDraft("");
        toast("Annotation saved");
      } catch {
        toast("Failed to save annotation");
      } finally {
        setSavingAnnotation(false);
      }
    },
    [songId, toast]
  );

  function openAnnotationForLine(lineIndex: number) {
    setAnnotationsOpen(true);
    setEditingAnnotation(lineIndex);
    setAnnotationDraft(annMap.get(lineIndex) ?? "");
  }

  function cancelEditingAnnotation() {
    setEditingAnnotation(null);
    setAnnotationDraft("");
  }

  return {
    annotations,
    annotationsOpen,
    setAnnotationsOpen,
    editingAnnotation,
    annotationDraft,
    setAnnotationDraft,
    savingAnnotation,
    annMap,
    handleSaveAnnotation,
    openAnnotationForLine,
    cancelEditingAnnotation,
  };
}

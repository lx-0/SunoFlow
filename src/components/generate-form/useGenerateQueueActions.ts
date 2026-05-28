import { track } from "@/lib/analytics";
import { getPendingIndexFromVisualIndex, getSubmitPrompt, reorderPendingQueueIds } from "./helpers";
import type { PersonaOption } from "./types";

type ToastFn = (message: string, variant: "success" | "error") => void;

interface QueueItem {
  id: string;
  status: "pending" | "processing" | "done" | "failed" | "cancelled";
}

interface UseGenerateQueueActionsParams {
  customMode: boolean;
  prompt: string;
  style: string;
  title: string;
  instrumental: boolean;
  selectedPersonaId: string;
  personas: PersonaOption[];
  queueItems: QueueItem[];
  queueIsProcessing: boolean;
  addToQueue: (params: {
    prompt: string;
    title?: string;
    tags?: string;
    makeInstrumental: boolean;
    personaId?: string;
  }) => Promise<{ item?: { id: string }; error?: string }>;
  reorderQueue: (ids: string[]) => void;
  processNext: () => Promise<{ song?: { id: string; title: string | null } } | undefined>;
  trackSong: (songId: string, title: string | null) => void;
  fetchCredits: () => void;
  toast: ToastFn;
}

export function useGenerateQueueActions({
  customMode,
  prompt,
  style,
  title,
  instrumental,
  selectedPersonaId,
  personas,
  queueItems,
  queueIsProcessing,
  addToQueue,
  reorderQueue,
  processNext,
  trackSong,
  fetchCredits,
  toast,
}: UseGenerateQueueActionsParams) {
  async function handleAddToQueue() {
    const submitPrompt = getSubmitPrompt(customMode, prompt, style);
    if (!submitPrompt) {
      toast("A prompt is required", "error");
      return;
    }

    const selectedPersona = personas.find((p) => p.personaId === selectedPersonaId);
    const { item, error: queueError } = await addToQueue({
      prompt: submitPrompt.trim(),
      title: title || undefined,
      tags: style || undefined,
      makeInstrumental: instrumental,
      personaId: selectedPersona?.personaId || undefined,
    });

    if (queueError) {
      toast(queueError, "error");
      return;
    }

    toast("Added to generation queue!", "success");
    track("song_generation_requested", { mode: customMode ? "custom" : "style", instrumental, via: "queue" });

    if (!queueIsProcessing && item) {
      const result = await processNext();
      if (result?.song) {
        trackSong(result.song.id, result.song.title);
        fetchCredits();
      }
    }
  }

  function handleQueueMoveUp(index: number) {
    const activeItems = queueItems.filter(
      (i) => i.status === "pending" || i.status === "processing"
    );
    const pendingItems = activeItems.filter((i) => i.status === "pending");
    if (index <= 0) return;
    const firstActiveStatus =
      activeItems[0]?.status === "processing"
        ? "processing"
        : activeItems[0]?.status === "pending"
          ? "pending"
          : undefined;
    const pendingIndex = getPendingIndexFromVisualIndex(index, firstActiveStatus);
    const ids = reorderPendingQueueIds(
      pendingItems.map((i) => i.id),
      pendingIndex,
      "up",
    );
    reorderQueue(ids);
  }

  function handleQueueMoveDown(index: number) {
    const activeItems = queueItems.filter(
      (i) => i.status === "pending" || i.status === "processing"
    );
    const pendingItems = activeItems.filter((i) => i.status === "pending");
    const firstActiveStatus =
      activeItems[0]?.status === "processing"
        ? "processing"
        : activeItems[0]?.status === "pending"
          ? "pending"
          : undefined;
    const pendingIndex = getPendingIndexFromVisualIndex(index, firstActiveStatus);
    const ids = reorderPendingQueueIds(
      pendingItems.map((i) => i.id),
      pendingIndex,
      "down",
    );
    reorderQueue(ids);
  }

  return {
    handleAddToQueue,
    handleQueueMoveUp,
    handleQueueMoveDown,
  };
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  ArrowPathIcon,
  ForwardIcon,
  MicrophoneIcon,
  SpeakerWaveIcon,
  ScissorsIcon,
  PaintBrushIcon,
  SwatchIcon,
} from "@heroicons/react/24/solid";
import { DocumentDuplicateIcon } from "@heroicons/react/24/outline";
import { canUseFeature, type SubscriptionTier } from "@/lib/feature-gates";
import { useSongStems } from "@/hooks/useSongStems";
import { useToast } from "../Toast";
import { StemsPlayer } from "../StemsPlayer";
import { SeparateVocalsModal } from "../SeparateVocalsModal";
import { type RemixAction } from "../RemixModal";
import type { SunoSong } from "@/lib/sunoapi";
import { apiPost } from "@/lib/api-client";

const CreateVariationModal = dynamic(() => import("../CreateVariationModal").then((m) => m.CreateVariationModal));
const RemixModal = dynamic(() => import("../RemixModal").then((m) => m.RemixModal));
const SectionEditor = dynamic(() => import("../SectionEditor").then((m) => m.SectionEditor));

interface SongRemixPanelProps {
  song: SunoSong;
  hasAudio: boolean;
  isInstrumental: boolean;
  userTier: SubscriptionTier;
  variationCount: number;
  maxVariations: number;
}

export function SongRemixPanel({
  song,
  hasAudio,
  isInstrumental,
  userTier,
  variationCount,
  maxVariations,
}: SongRemixPanelProps) {
  const router = useRouter();
  const { toast } = useToast();
  const canSeparateVocals = canUseFeature("vocalSeparation", userTier);

  const [variationModalOpen, setVariationModalOpen] = useState(false);
  const [creatingVariation, setCreatingVariation] = useState(false);
  const [remixAction, setRemixAction] = useState<RemixAction | null>(null);
  const [remixSubmitting, setRemixSubmitting] = useState(false);
  const [sectionEditorOpen, setSectionEditorOpen] = useState(false);
  const [saveStyleOpen, setSaveStyleOpen] = useState(false);
  const [styleTemplateName, setStyleTemplateName] = useState("");
  const [styleTemplateTags, setStyleTemplateTags] = useState("");
  const [isSavingStyle, setIsSavingStyle] = useState(false);

  const stemHook = useSongStems({ songId: song.id, songTitle: song.title, toast });

  async function handleCreateVariation(data: { prompt: string; tags: string; lyrics: string; title: string; makeInstrumental: boolean }) {
    if (creatingVariation) return;
    if (variationCount >= maxVariations) {
      toast(`Maximum ${maxVariations} variations reached`, "error");
      return;
    }
    setCreatingVariation(true);
    try {
      const result = await apiPost<{ song: { id: string } }>(`/api/songs/${song.id}/variations`, {
        prompt: data.prompt || undefined,
        tags: data.tags || undefined,
        title: data.title || undefined,
        makeInstrumental: data.makeInstrumental,
      });
      toast("Variation generation started!", "success");
      setVariationModalOpen(false);
      router.push(`/library/${result.song.id}`);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to create variation", "error");
    } finally {
      setCreatingVariation(false);
    }
  }

  async function handleRemixSubmit(action: RemixAction, data: Record<string, string | number | undefined>) {
    if (remixSubmitting) return;
    if (variationCount >= maxVariations) {
      toast(`Maximum ${maxVariations} variations reached`, "error");
      return;
    }
    setRemixSubmitting(true);
    try {
      const result = await apiPost<{ song: { id: string } }>(`/api/songs/${song.id}/${action}`, data);
      toast("Generation started!", "success");
      setRemixAction(null);
      router.push(`/library/${result.song.id}`);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Generation failed", "error");
    } finally {
      setRemixSubmitting(false);
    }
  }

  async function handleSaveStyleTemplate() {
    if (isSavingStyle || !styleTemplateName.trim() || !styleTemplateTags.trim()) return;
    setIsSavingStyle(true);
    try {
      await apiPost("/api/style-templates", {
        name: styleTemplateName.trim(),
        tags: styleTemplateTags.trim(),
        sourceSongId: song.id,
      });
      setSaveStyleOpen(false);
      setStyleTemplateName("");
      setStyleTemplateTags("");
      toast("Style template saved", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to save style template", "error");
    } finally {
      setIsSavingStyle(false);
    }
  }

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 tracking-wide">Remix & Extend</h2>
          <span className="text-xs text-gray-400 dark:text-gray-500">{variationCount}/{maxVariations} variations</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              if (variationCount >= maxVariations) {
                toast(`Maximum ${maxVariations} variations reached`, "error");
                return;
              }
              setVariationModalOpen(true);
            }}
            disabled={variationCount >= maxVariations}
            className="flex items-center justify-center gap-2 px-3 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-colors min-h-[44px]"
          >
            <ArrowPathIcon className="w-4 h-4" aria-hidden="true" />
            Create Variation
          </button>
          <button
            onClick={() => setRemixAction("extend")}
            disabled={variationCount >= maxVariations}
            className="flex items-center justify-center gap-2 px-3 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-colors min-h-[44px]"
          >
            <ForwardIcon className="w-4 h-4" aria-hidden="true" />
            Extend
          </button>
          {isInstrumental ? (
            <button
              onClick={() => setRemixAction("add-vocals")}
              disabled={variationCount >= maxVariations}
              className="flex items-center justify-center gap-2 px-3 py-2.5 bg-pink-600 hover:bg-pink-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-colors min-h-[44px]"
            >
              <MicrophoneIcon className="w-4 h-4" aria-hidden="true" />
              Add Vocals
            </button>
          ) : (
            <button
              onClick={() => setRemixAction("add-instrumental")}
              disabled={variationCount >= maxVariations}
              className="flex items-center justify-center gap-2 px-3 py-2.5 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-colors min-h-[44px]"
            >
              <SpeakerWaveIcon className="w-4 h-4" aria-hidden="true" />
              Add Instrumental
            </button>
          )}
          {canSeparateVocals ? (
            <button
              onClick={stemHook.openSeparateModal}
              disabled={!hasAudio}
              className="flex items-center justify-center gap-2 px-3 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-colors min-h-[44px]"
            >
              <ScissorsIcon className="w-4 h-4" aria-hidden="true" />
              Separate Vocals
            </button>
          ) : (
            <Link
              href="/pricing"
              className="flex items-center justify-center gap-2 px-3 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-sm font-medium rounded-xl transition-colors min-h-[44px] hover:bg-violet-100 dark:hover:bg-violet-900/20 hover:text-violet-700 dark:hover:text-violet-400"
              title="Vocal Separation requires Pro or higher"
            >
              <ScissorsIcon className="w-4 h-4" aria-hidden="true" />
              Separate Vocals <span className="text-xs font-bold">(Pro+)</span>
            </Link>
          )}
          <button
            onClick={() => setSectionEditorOpen(true)}
            disabled={!hasAudio || !song.duration || variationCount >= maxVariations}
            className="flex items-center justify-center gap-2 px-3 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-colors min-h-[44px] col-span-2"
          >
            <PaintBrushIcon className="w-4 h-4" aria-hidden="true" />
            Replace Section
          </button>
          <button
            onClick={() => {
              const params = new URLSearchParams();
              if (song.title) params.set("title", song.title);
              if (song.tags) params.set("tags", song.tags);
              if (song.prompt) params.set("prompt", song.prompt);
              if (isInstrumental) params.set("instrumental", "1");
              params.set("sourceSongId", song.id);
              if (song.title) params.set("sourceSongTitle", song.title);
              router.push(`/generate?${params.toString()}`);
            }}
            className="flex items-center justify-center gap-2 px-3 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl transition-colors min-h-[44px] col-span-2"
          >
            <DocumentDuplicateIcon className="w-4 h-4" aria-hidden="true" />
            Use as Template
          </button>
          {song.tags?.trim() && (
            <button
              onClick={() => {
                setStyleTemplateName("");
                setStyleTemplateTags((song.tags || "").trim());
                setSaveStyleOpen(true);
              }}
              className="flex items-center justify-center gap-2 px-3 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-colors min-h-[44px] col-span-2"
            >
              <SwatchIcon className="w-4 h-4" aria-hidden="true" />
              Save Style
            </button>
          )}
        </div>
      </div>

      {variationModalOpen && (
        <CreateVariationModal
          sourceSong={{
            prompt: song.prompt ?? null,
            tags: song.tags ?? null,
            lyrics: song.lyrics ?? null,
            title: song.title ?? null,
            isInstrumental,
          }}
          onClose={() => setVariationModalOpen(false)}
          onSubmit={handleCreateVariation}
          submitting={creatingVariation}
        />
      )}

      {remixAction && (
        <RemixModal
          action={remixAction}
          songTitle={song.title}
          songTags={song.tags ?? null}
          songDuration={song.duration ?? null}
          onClose={() => setRemixAction(null)}
          onSubmit={handleRemixSubmit}
          submitting={remixSubmitting}
        />
      )}

      {stemHook.separateModalOpen && (
        <SeparateVocalsModal
          onClose={stemHook.closeSeparateModal}
          onSubmit={stemHook.separate}
          submitting={stemHook.separateSubmitting}
        />
      )}

      {sectionEditorOpen && hasAudio && song.duration && (
        <SectionEditor
          songId={song.id}
          songTitle={song.title}
          songTags={song.tags ?? null}
          songDuration={song.duration}
          audioUrl={song.audioUrl}
          onClose={() => setSectionEditorOpen(false)}
          onSubmitted={(newSongId) => {
            setSectionEditorOpen(false);
            toast("Section replacement started!", "success");
            router.push(`/library/${newSongId}`);
          }}
        />
      )}

      {stemHook.stems.length > 0 && (
        <StemsPlayer stems={stemHook.stems} onDownload={stemHook.downloadStem} onDownloadAll={stemHook.downloadAllStems} downloadingAll={stemHook.downloadingAll} />
      )}

      {saveStyleOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="save-style-title"
          onClick={() => setSaveStyleOpen(false)}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="save-style-title" className="text-lg font-semibold text-gray-900 dark:text-white">Save Style Template</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Save this song style for quick reuse in future generations.
            </p>
            <div className="space-y-3">
              <div>
                <label htmlFor="style-template-name" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Template Name
                </label>
                <input
                  id="style-template-name"
                  type="text"
                  value={styleTemplateName}
                  onChange={(e) => setStyleTemplateName(e.target.value)}
                  maxLength={100}
                  autoFocus
                  className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="e.g. Cinematic Piano Ballad"
                />
              </div>
              <div>
                <label htmlFor="style-template-tags" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Style Tags
                </label>
                <textarea
                  id="style-template-tags"
                  value={styleTemplateTags}
                  onChange={(e) => setStyleTemplateTags(e.target.value)}
                  rows={3}
                  maxLength={500}
                  className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                  placeholder="e.g. dreamy synthwave, lush pads, driving bass"
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setSaveStyleOpen(false)}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveStyleTemplate}
                disabled={isSavingStyle || !styleTemplateName.trim() || !styleTemplateTags.trim()}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors"
              >
                {isSavingStyle ? "Saving..." : "Save Style"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

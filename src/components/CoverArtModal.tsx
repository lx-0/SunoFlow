"use client";

import { useRef, useState } from "react";
import { X, Sparkles, Upload, Check } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { apiPost, apiPatch } from "@/lib/api-client";

interface CoverArtVariant {
  style: string;
  label: string;
  prompt: string;
  dataUrl: string;
}

interface CoverArtModalProps {
  songId: string;
  songTitle: string | null;
  currentImageUrl: string | null;
  onClose: () => void;
  onSave: (imageUrl: string) => void;
}

export function CoverArtModal({
  songId,
  songTitle,
  currentImageUrl,
  onClose,
  onSave,
}: CoverArtModalProps) {
  const [variants, setVariants] = useState<CoverArtVariant[]>([]);
  const [generating, setGenerating] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    setSelected(null);
    try {
      const data = await apiPost<{ variants?: CoverArtVariant[] }>(`/api/songs/${songId}/cover-art/generate`, {});
      setVariants(data.variants ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type and size (max 4 MB)
    if (!file.type.startsWith("image/")) {
      setError("Please upload a valid image file.");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setError("Image must be smaller than 4 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result;
      if (typeof result === "string") {
        setSelected(result);
        setError(null);
      }
    };
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      await apiPatch(`/api/songs/${songId}/cover-art`, { imageUrl: selected });
      onSave(selected);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const displayTitle = songTitle || "Untitled";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-lg overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border">
          <div>
            <h2 className="text-lg font-bold text-primary">Cover Art</h2>
            <p className="text-xs text-secondary mt-0.5 truncate max-w-[280px]">
              {displayTitle}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted hover:text-primary transition-colors p-1"
            aria-label="Close"
          >
            <Icon icon={X} fill="currentColor" className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Current cover preview */}
          {(currentImageUrl || selected) && (
            <div className="flex items-start gap-4">
              <div>
                <p className="text-xs font-medium text-secondary uppercase tracking-wider mb-2">
                  {selected && selected !== currentImageUrl ? "New cover" : "Current cover"}
                </p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selected ?? currentImageUrl!}
                  alt="Cover art"
                  className="w-24 h-24 rounded-xl object-cover border border-border shadow"
                />
              </div>
            </div>
          )}

          {/* Generate variants */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-primary">
                AI-Generated Variants
              </p>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-60 disabled:cursor-not-allowed text-white transition-colors"
              >
                <Icon icon={Sparkles} fill="currentColor" className="w-3.5 h-3.5" />
                {generating ? "Generating…" : variants.length > 0 ? "Regenerate" : "Generate"}
              </button>
            </div>

            {generating && (
              <div className="grid grid-cols-3 gap-2">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="aspect-square rounded-xl bg-surface-raised animate-pulse"
                  />
                ))}
              </div>
            )}

            {!generating && variants.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {variants.map((v) => {
                  const isSelected = selected === v.dataUrl;
                  return (
                    <button
                      key={v.style}
                      onClick={() => setSelected(v.dataUrl)}
                      className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all focus:outline-none focus:ring-2 focus:ring-violet-500 ${
                        isSelected
                          ? "border-violet-500 ring-2 ring-violet-400"
                          : "border-transparent hover:border-violet-300 dark:hover:border-violet-600"
                      }`}
                      title={v.label}
                      aria-label={`Select ${v.label} style`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={v.dataUrl}
                        alt={v.label}
                        className="w-full h-full object-cover"
                      />
                      {isSelected && (
                        <span className="absolute top-1 right-1 bg-violet-600 rounded-full p-0.5">
                          <Icon icon={Check} fill="currentColor" className="w-3 h-3 text-white" />
                        </span>
                      )}
                      <span className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent pt-4 pb-1 px-1.5">
                        <span className="text-[10px] text-white font-medium">{v.label}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {!generating && variants.length === 0 && (
              <p className="text-xs text-muted">
                Click &ldquo;Generate&rdquo; to create AI cover art variants based on this song&rsquo;s style and title.
              </p>
            )}
          </div>

          {/* Upload custom */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-primary">
              Upload Custom Image
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-xl border border-border hover:bg-surface-hover text-primary transition-colors"
            >
              <Icon icon={Upload} fill="currentColor" className="w-4 h-4" />
              Choose file…
            </button>
            <p className="text-xs text-muted">JPEG, PNG, WEBP — max 4 MB</p>
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 pb-5 pt-2 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-xl bg-surface-raised hover:bg-surface-hover text-primary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!selected || saving}
            className="px-4 py-2 text-sm font-medium rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors"
          >
            {saving ? "Saving…" : "Save Cover"}
          </button>
        </div>
      </div>
    </div>
  );
}

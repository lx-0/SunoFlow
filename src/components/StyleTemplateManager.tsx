"use client";

import { useState, useEffect, useCallback } from "react";
import { Trash2, SwatchBook, Pencil, Check, X } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "./Toast";
import { apiGet, apiPatch, apiDelete } from "@/lib/api-client";

interface StyleTemplate {
  id: string;
  name: string;
  tags: string;
  sourceSongId: string | null;
  createdAt: string;
}

export function StyleTemplateManager() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<StyleTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editTags, setEditTags] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const fetchTemplates = useCallback(async () => {
    try {
      const data = await apiGet<{ templates: StyleTemplate[] }>("/api/style-templates");
      setTemplates(data.templates);
    } catch {
      toast("Failed to load style templates", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  function startEdit(template: StyleTemplate) {
    setEditingId(template.id);
    setEditName(template.name);
    setEditTags(template.tags);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditTags("");
  }

  async function handleSave(id: string) {
    if (!editName.trim() || !editTags.trim()) {
      toast("Name and tags are required", "error");
      return;
    }
    setIsSaving(true);
    try {
      const data = await apiPatch<{ template: StyleTemplate }>(`/api/style-templates/${id}`, { name: editName.trim(), tags: editTags.trim() });
      setTemplates((prev) => prev.map((t) => (t.id === id ? data.template : t)));
      cancelEdit();
      toast("Template updated", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to update template", "error");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await apiDelete(`/api/style-templates/${id}`);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      toast("Template deleted", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to delete template", "error");
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <div className="px-4 py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-surface-raised rounded w-1/3" />
          <div className="h-20 bg-surface-raised rounded" />
          <div className="h-20 bg-surface-raised rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-primary">Style Templates</h1>
        <p className="text-secondary text-sm mt-0.5">
          Manage your saved style templates for quick generation
        </p>
      </div>

      {templates.length === 0 ? (
        <div className="text-center py-12">
          <Icon icon={SwatchBook} className="h-12 w-12 text-muted mx-auto mb-3" />
          <p className="text-secondary text-sm">
            No style templates yet. Save a style from any song using the &ldquo;Save Style&rdquo; action in the song menu.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((template) => (
            <div
              key={template.id}
              className="bg-surface-raised border border-border rounded-xl p-4"
            >
              {editingId === template.id ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Template name"
                    maxLength={100}
                    autoFocus
                    className="w-full bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                  <textarea
                    value={editTags}
                    onChange={(e) => setEditTags(e.target.value)}
                    placeholder="Style tags"
                    rows={2}
                    maxLength={500}
                    className="w-full bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleSave(template.id)}
                      disabled={isSaving}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-violet-600 hover:bg-violet-500 disabled:opacity-50 rounded-lg transition-colors"
                    >
                      <Icon icon={Check} className="h-4 w-4" />
                      {isSaving ? "Saving..." : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm text-secondary hover:text-primary transition-colors"
                    >
                      <Icon icon={X} className="h-4 w-4" />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="flex-shrink-0 w-10 h-10 bg-violet-100 dark:bg-violet-900/30 rounded-full flex items-center justify-center">
                      <Icon icon={SwatchBook} className="h-6 w-6 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-primary truncate">
                        {template.name}
                      </p>
                      <p className="text-xs text-secondary mt-0.5 line-clamp-2">
                        {template.tags}
                      </p>
                      <span className="text-[10px] text-muted mt-1 inline-block">
                        {new Date(template.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => startEdit(template)}
                      className="p-2 text-muted hover:text-violet-500 dark:hover:text-violet-400 transition-colors"
                      aria-label={`Edit ${template.name}`}
                      title="Edit template"
                    >
                      <Icon icon={Pencil} className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(template.id)}
                      disabled={deletingId === template.id}
                      className="p-2 text-muted hover:text-red-500 dark:hover:text-red-400 disabled:opacity-50 transition-colors"
                      aria-label={`Delete ${template.name}`}
                      title="Delete template"
                    >
                      <Icon icon={Trash2} className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-secondary text-center">
        {templates.length} / 50 style templates
      </p>
    </div>
  );
}

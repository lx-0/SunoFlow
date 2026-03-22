"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  MagnifyingGlassIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  XMarkIcon,
  SparklesIcon,
  MusicalNoteIcon,
} from "@heroicons/react/24/outline";
import { BookmarkIcon } from "@heroicons/react/24/solid";
import { useToast } from "./Toast";

interface PromptTemplate {
  id: string;
  name: string;
  description: string | null;
  prompt: string;
  style: string | null;
  category: string | null;
  isInstrumental: boolean;
  isBuiltIn: boolean;
}

const CATEGORY_OPTIONS = [
  "pop", "rock", "hip-hop", "electronic", "ambient",
  "r&b", "folk", "jazz", "latin", "other",
];

export function TemplateBrowser() {
  const router = useRouter();
  const { toast } = useToast();

  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Modal state
  const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formPrompt, setFormPrompt] = useState("");
  const [formStyle, setFormStyle] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formInstrumental, setFormInstrumental] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fetchTemplates = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (selectedCategory) params.set("category", selectedCategory);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      const res = await fetch(`/api/prompt-templates?${params}`);
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates);
        if (data.categories) setCategories(data.categories);
      }
    } catch {
      toast("Failed to load templates", "error");
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategory, searchQuery, toast]);

  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => fetchTemplates(), searchQuery ? 300 : 0);
    return () => clearTimeout(timer);
  }, [fetchTemplates, searchQuery]);

  function openCreateForm() {
    setFormName("");
    setFormPrompt("");
    setFormStyle("");
    setFormCategory("");
    setFormDescription("");
    setFormInstrumental(false);
    setEditingTemplate(null);
    setIsCreating(true);
  }

  function openEditForm(template: PromptTemplate) {
    setFormName(template.name);
    setFormPrompt(template.prompt);
    setFormStyle(template.style ?? "");
    setFormCategory(template.category ?? "");
    setFormDescription(template.description ?? "");
    setFormInstrumental(template.isInstrumental);
    setIsCreating(false);
    setEditingTemplate(template);
  }

  function closeForm() {
    setIsCreating(false);
    setEditingTemplate(null);
  }

  async function handleSave() {
    if (!formName.trim()) {
      toast("Name is required", "error");
      return;
    }
    if (!formPrompt.trim()) {
      toast("Prompt is required", "error");
      return;
    }

    setIsSaving(true);
    try {
      const body = {
        name: formName.trim(),
        prompt: formPrompt.trim(),
        style: formStyle.trim() || null,
        category: formCategory.trim() || null,
        description: formDescription.trim() || null,
        isInstrumental: formInstrumental,
      };

      if (editingTemplate) {
        const res = await fetch(`/api/prompt-templates/${editingTemplate.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (res.ok) {
          toast(`Template "${data.template.name}" updated`, "success");
          closeForm();
          fetchTemplates();
        } else {
          toast(data.error ?? "Failed to update template", "error");
        }
      } else {
        const res = await fetch("/api/prompt-templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (res.ok) {
          toast(`Template "${data.template.name}" created`, "success");
          closeForm();
          fetchTemplates();
        } else {
          toast(data.error ?? "Failed to create template", "error");
        }
      }
    } catch {
      toast("Failed to save template", "error");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(templateId: string) {
    try {
      const res = await fetch(`/api/prompt-templates/${templateId}`, { method: "DELETE" });
      if (res.ok) {
        toast("Template deleted", "success");
        setDeleteConfirm(null);
        fetchTemplates();
      } else {
        const data = await res.json();
        toast(data.error ?? "Failed to delete", "error");
      }
    } catch {
      toast("Failed to delete template", "error");
    }
  }

  function applyToGenerate(template: PromptTemplate) {
    const params = new URLSearchParams();
    if (template.style) params.set("tags", template.style);
    if (template.prompt) params.set("prompt", template.prompt);
    if (template.isInstrumental) params.set("instrumental", "1");
    router.push(`/generate?${params}`);
  }

  const builtIn = templates.filter((t) => t.isBuiltIn);
  const userTemplates = templates.filter((t) => !t.isBuiltIn);
  const showForm = isCreating || editingTemplate !== null;

  return (
    <div className="px-4 py-4 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Prompt Templates</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
            Browse, create, and manage your prompt templates
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateForm}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-violet-600 hover:bg-violet-500 rounded-xl transition-colors"
        >
          <PlusIcon className="h-4 w-4" />
          New template
        </button>
      </div>

      {/* Search & Filters */}
      <div className="space-y-3">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates..."
            className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          )}
        </div>

        {categories.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedCategory(null)}
              className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
                selectedCategory === null
                  ? "bg-violet-600 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                className={`px-2.5 py-1 text-xs font-medium rounded-full capitalize transition-colors ${
                  selectedCategory === cat
                    ? "bg-violet-600 text-white"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Create / Edit Form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              {editingTemplate ? "Edit template" : "Create new template"}
            </h2>
            <button type="button" onClick={closeForm} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">Name *</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="My template"
                maxLength={50}
                className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">Category</label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              >
                <option value="">No category</option>
                {CATEGORY_OPTIONS.map((cat) => (
                  <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">Description</label>
            <input
              type="text"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Brief description of this template"
              className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">Style / Genre</label>
            <input
              type="text"
              value={formStyle}
              onChange={(e) => setFormStyle(e.target.value)}
              placeholder="e.g. upbeat lo-fi hip-hop, melancholic indie folk"
              className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">Prompt / Lyrics *</label>
            <textarea
              value={formPrompt}
              onChange={(e) => setFormPrompt(e.target.value)}
              placeholder="[Verse 1]&#10;Your lyrics or prompt here..."
              rows={5}
              className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
            />
          </div>

          <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-900/50 rounded-xl px-3 py-2">
            <span className="text-sm text-gray-700 dark:text-gray-300">Instrumental only</span>
            <button
              type="button"
              role="switch"
              aria-checked={formInstrumental}
              onClick={() => setFormInstrumental((v) => !v)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500 ${
                formInstrumental ? "bg-violet-600" : "bg-gray-400 dark:bg-gray-600"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  formInstrumental ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 px-3 py-2.5 text-sm font-medium text-white bg-violet-600 hover:bg-violet-500 disabled:opacity-50 rounded-xl transition-colors"
            >
              {isSaving ? "Saving..." : editingTemplate ? "Update template" : "Create template"}
            </button>
            <button
              type="button"
              onClick={closeForm}
              className="px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>

          {!editingTemplate && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {userTemplates.length} / 20 templates used
            </p>
          )}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {/* Built-in Templates */}
      {!isLoading && builtIn.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            Starter Templates
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {builtIn.map((t) => (
              <TemplateCard
                key={t.id}
                template={t}
                onUse={() => applyToGenerate(t)}
              />
            ))}
          </div>
        </div>
      )}

      {/* User Templates */}
      {!isLoading && userTemplates.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            My Templates
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {userTemplates.map((t) => (
              <TemplateCard
                key={t.id}
                template={t}
                onUse={() => applyToGenerate(t)}
                onEdit={() => openEditForm(t)}
                onDelete={() => setDeleteConfirm(t.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && templates.length === 0 && (
        <div className="text-center py-12">
          <BookmarkIcon className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {searchQuery || selectedCategory ? "No templates match your search" : "No templates yet"}
          </p>
          {!searchQuery && !selectedCategory && (
            <button
              type="button"
              onClick={openCreateForm}
              className="mt-3 text-sm text-violet-600 dark:text-violet-400 hover:underline"
            >
              Create your first template
            </button>
          )}
        </div>
      )}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 max-w-sm w-full space-y-4 shadow-xl">
            <p className="text-sm font-medium text-gray-900 dark:text-white">Delete this template?</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">This action cannot be undone.</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 px-3 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-500 rounded-xl transition-colors"
              >
                Delete
              </button>
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TemplateCard({
  template,
  onUse,
  onEdit,
  onDelete,
}: {
  template: PromptTemplate;
  onUse: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  return (
    <div className="group relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:border-violet-400 dark:hover:border-violet-500 transition-colors">
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white leading-snug">
            {template.name}
          </h3>
          {template.isBuiltIn && (
            <SparklesIcon className="h-4 w-4 text-violet-500 flex-shrink-0 mt-0.5" />
          )}
        </div>

        {template.description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{template.description}</p>
        )}

        <p className="text-xs text-gray-400 dark:text-gray-500 line-clamp-2 font-mono">
          {template.style || template.prompt}
        </p>

        <div className="flex items-center gap-1.5 flex-wrap">
          {template.category && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 capitalize">
              {template.category}
            </span>
          )}
          {template.isInstrumental && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center gap-0.5">
              <MusicalNoteIcon className="h-3 w-3" />
              Instrumental
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
        <button
          type="button"
          onClick={onUse}
          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 hover:bg-violet-100 dark:hover:bg-violet-900/30 rounded-lg transition-colors"
        >
          <SparklesIcon className="h-3.5 w-3.5" />
          Use
        </button>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="p-1.5 text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors opacity-0 group-hover:opacity-100"
            title="Edit"
          >
            <PencilSquareIcon className="h-4 w-4" />
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors opacity-0 group-hover:opacity-100"
            title="Delete"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

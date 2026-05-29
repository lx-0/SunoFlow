"use client";

import { useState } from "react";
import { BookmarkIcon, TrashIcon } from "@heroicons/react/24/solid";
import { BookmarkIcon as BookmarkOutline } from "@heroicons/react/24/outline";
import { useToast } from "../Toast";
import { deletePromptTemplate, savePromptTemplate } from "./api";
import { getSubmitPrompt } from "./helpers";
import type { PromptTemplate } from "./types";

interface TemplatePickerPanelProps {
  templates: PromptTemplate[];
  categories: string[];
  customMode: boolean;
  prompt: string;
  style: string;
  instrumental: boolean;
  onApplyTemplate: (template: PromptTemplate) => void;
  onTemplatesChange: (updater: (prev: PromptTemplate[]) => PromptTemplate[]) => void;
  fetchTemplates: () => void;
}

export function TemplatePickerPanel({
  templates,
  categories,
  customMode,
  prompt,
  style,
  instrumental,
  onApplyTemplate,
  onTemplatesChange,
  fetchTemplates,
}: TemplatePickerPanelProps) {
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateCategory, setTemplateCategory] = useState("");
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  const builtInTemplates = templates.filter((t) => t.isBuiltIn);
  const userTemplates = templates.filter((t) => !t.isBuiltIn);
  const filteredBuiltIn = selectedCategory
    ? builtInTemplates.filter((t) => t.category === selectedCategory)
    : builtInTemplates;
  const filteredUser = selectedCategory
    ? userTemplates.filter((t) => t.category === selectedCategory)
    : userTemplates;

  async function deleteTemplate(templateId: string) {
    const { ok, error } = await deletePromptTemplate(templateId);
    if (ok) {
      onTemplatesChange((prev) => prev.filter((t) => t.id !== templateId));
      toast("Template deleted", "success");
      return;
    }
    toast(error ?? "Failed to delete template", "error");
  }

  async function saveAsTemplate() {
    if (!templateName.trim()) {
      toast("Please enter a template name", "error");
      return;
    }
    const submitPrompt = getSubmitPrompt(customMode, prompt, style);
    if (!submitPrompt.trim()) {
      toast("Fill in the prompt fields before saving", "error");
      return;
    }

    setIsSavingTemplate(true);
    try {
      const result = await savePromptTemplate({
        name: templateName.trim(),
        prompt: submitPrompt.trim(),
        style: style.trim() || null,
        category: templateCategory.trim() || null,
        isInstrumental: instrumental,
      });

      if (result.ok && result.template) {
        onTemplatesChange((prev) => [...prev, result.template!]);
        setShowSaveDialog(false);
        setTemplateName("");
        setTemplateCategory("");
        fetchTemplates();
        toast(`Template "${result.template.name}" saved!`, "success");
      } else {
        toast(result.error ?? "Failed to save template", "error");
      }
    } catch {
      toast("Failed to save template", "error");
    } finally {
      setIsSavingTemplate(false);
    }
  }

  return (
    <>
      {/* Template Picker Button */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setShowTemplatePicker(!showTemplatePicker)}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-xl hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-colors"
        >
          <BookmarkOutline className="h-4 w-4" />
          Templates
        </button>
        <button
          type="button"
          onClick={() => setShowSaveDialog(!showSaveDialog)}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <BookmarkIcon className="h-4 w-4" />
          Save as template
        </button>
      </div>

      {/* Template Picker Panel */}
      {showTemplatePicker && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 space-y-3">
          {/* Category Filter */}
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

          {/* Built-in Templates Grid */}
          {filteredBuiltIn.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Starter Templates</p>
              <div className="grid grid-cols-2 gap-2">
                {filteredBuiltIn.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onApplyTemplate(t)}
                    className="text-left p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-violet-400 dark:hover:border-violet-500 hover:bg-violet-50 dark:hover:bg-violet-900/10 transition-colors"
                  >
                    <span className="text-sm font-medium text-gray-900 dark:text-white block">{t.name}</span>
                    {t.description && (
                      <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{t.description}</span>
                    )}
                    <div className="flex items-center gap-1.5 mt-1.5">
                      {t.category && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 capitalize">{t.category}</span>
                      )}
                      {t.isInstrumental && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">Instrumental</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* User Templates */}
          {filteredUser.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">My Templates</p>
              <div className="grid grid-cols-2 gap-2">
                {filteredUser.map((t) => (
                  <div key={t.id} className="relative group">
                    <button
                      type="button"
                      onClick={() => onApplyTemplate(t)}
                      className="w-full text-left p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-violet-400 dark:hover:border-violet-500 hover:bg-violet-50 dark:hover:bg-violet-900/10 transition-colors"
                    >
                      <span className="text-sm font-medium text-gray-900 dark:text-white block pr-6">{t.name}</span>
                      <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{t.style ?? t.prompt}</span>
                      {t.category && (
                        <span className="inline-block text-[10px] font-medium px-1.5 py-0.5 mt-1.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 capitalize">{t.category}</span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteTemplate(t.id)}
                      className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                      aria-label="Delete template"
                      title="Delete template"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {filteredBuiltIn.length === 0 && filteredUser.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">
              {selectedCategory ? "No templates in this category" : "No templates yet"}
            </p>
          )}
        </div>
      )}

      {/* Save Template Dialog */}
      {showSaveDialog && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 space-y-3">
          <p className="text-sm font-medium text-gray-900 dark:text-white">Save current settings as template</p>
          <input
            type="text"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder="Template name"
            aria-label="Template name"
            maxLength={50}
            className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2 text-base sm:text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
          <select
            value={templateCategory}
            onChange={(e) => setTemplateCategory(e.target.value)}
            aria-label="Template category"
            className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2 text-base sm:text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          >
            <option value="">No category</option>
            <option value="pop">Pop</option>
            <option value="rock">Rock</option>
            <option value="hip-hop">Hip-Hop</option>
            <option value="electronic">Electronic</option>
            <option value="ambient">Ambient</option>
            <option value="r&b">R&B</option>
            <option value="folk">Folk</option>
            <option value="jazz">Jazz</option>
            <option value="latin">Latin</option>
            <option value="other">Other</option>
          </select>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={saveAsTemplate}
              disabled={isSavingTemplate}
              className="flex-1 px-3 py-2 text-sm font-medium text-white bg-violet-600 hover:bg-violet-500 disabled:opacity-50 rounded-xl transition-colors"
            >
              {isSavingTemplate ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => { setShowSaveDialog(false); setTemplateName(""); setTemplateCategory(""); }}
              className="px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {userTemplates.length} / 20 templates used
          </p>
        </div>
      )}
    </>
  );
}

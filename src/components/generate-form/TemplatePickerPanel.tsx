"use client";

import { TrashIcon, BookmarkIcon } from "@heroicons/react/24/solid";
import { BookmarkIcon as BookmarkOutline } from "@heroicons/react/24/outline";
import type { useTemplateManager } from "@/hooks/useTemplateManager";

interface TemplatePickerPanelProps {
  templateMgr: ReturnType<typeof useTemplateManager>;
  categories: string[];
}

export function TemplatePickerPanel({ templateMgr, categories }: TemplatePickerPanelProps) {
  return (
    <>
      {/* Template / Save Buttons */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => templateMgr.setShowTemplatePicker(!templateMgr.showTemplatePicker)}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-xl hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-colors"
        >
          <BookmarkOutline className="h-4 w-4" />
          Templates
        </button>
        <button
          type="button"
          onClick={() => templateMgr.setShowSaveDialog(!templateMgr.showSaveDialog)}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <BookmarkIcon className="h-4 w-4" />
          Save as template
        </button>
      </div>

      {/* Template Picker Panel */}
      {templateMgr.showTemplatePicker && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 space-y-3">
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => templateMgr.setSelectedCategory(null)}
                className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
                  templateMgr.selectedCategory === null
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
                  onClick={() => templateMgr.setSelectedCategory(templateMgr.selectedCategory === cat ? null : cat)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-full capitalize transition-colors ${
                    templateMgr.selectedCategory === cat
                      ? "bg-violet-600 text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {templateMgr.filteredBuiltIn.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Starter Templates</p>
              <div className="grid grid-cols-2 gap-2">
                {templateMgr.filteredBuiltIn.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => templateMgr.applyTemplate(t)}
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

          {templateMgr.filteredUser.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">My Templates</p>
              <div className="grid grid-cols-2 gap-2">
                {templateMgr.filteredUser.map((t) => (
                  <div key={t.id} className="relative group">
                    <button
                      type="button"
                      onClick={() => templateMgr.applyTemplate(t)}
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
                      onClick={() => templateMgr.deleteTemplate(t.id)}
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
          {templateMgr.filteredBuiltIn.length === 0 && templateMgr.filteredUser.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">
              {templateMgr.selectedCategory ? "No templates in this category" : "No templates yet"}
            </p>
          )}
        </div>
      )}

      {/* Save Template Dialog */}
      {templateMgr.showSaveDialog && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 space-y-3">
          <p className="text-sm font-medium text-gray-900 dark:text-white">Save current settings as template</p>
          <input
            type="text"
            value={templateMgr.templateName}
            onChange={(e) => templateMgr.setTemplateName(e.target.value)}
            placeholder="Template name"
            aria-label="Template name"
            maxLength={50}
            className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2 text-base sm:text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
          <select
            value={templateMgr.templateCategory}
            onChange={(e) => templateMgr.setTemplateCategory(e.target.value)}
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
              onClick={templateMgr.saveAsTemplate}
              disabled={templateMgr.isSavingTemplate}
              className="flex-1 px-3 py-2 text-sm font-medium text-white bg-violet-600 hover:bg-violet-500 disabled:opacity-50 rounded-xl transition-colors"
            >
              {templateMgr.isSavingTemplate ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => { templateMgr.setShowSaveDialog(false); templateMgr.setTemplateName(""); templateMgr.setTemplateCategory(""); }}
              className="px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {templateMgr.userTemplates.length} / 20 templates used
          </p>
        </div>
      )}
    </>
  );
}

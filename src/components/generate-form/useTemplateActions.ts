import { useState } from "react";
import type { PromptTemplate } from "./types";
import { deletePromptTemplate, savePromptTemplate } from "./api";
import { getSubmitPrompt } from "./helpers";
import { type ToastFn } from "@/components/Toast";


interface UseTemplateActionsParams {
  templates: PromptTemplate[];
  setTemplates: React.Dispatch<React.SetStateAction<PromptTemplate[]>>;
  fetchTemplates: () => Promise<void>;
  onApply: (fields: { style: string; prompt: string; instrumental: boolean; customMode: boolean }) => void;
  toast: ToastFn;
}

export function useTemplateActions({
  templates,
  setTemplates,
  fetchTemplates,
  onApply,
  toast,
}: UseTemplateActionsParams) {
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

  function applyTemplate(template: PromptTemplate) {
    onApply({
      style: template.style ?? "",
      prompt: template.prompt,
      instrumental: template.isInstrumental,
      customMode: !template.style,
    });
    setShowTemplatePicker(false);
    toast(`Loaded "${template.name}" template`, "success");
  }

  async function deleteTemplate(templateId: string) {
    const { ok, error } = await deletePromptTemplate(templateId);
    if (ok) {
      setTemplates((prev) => prev.filter((t) => t.id !== templateId));
      toast("Template deleted", "success");
      return;
    }
    toast(error ?? "Failed to delete template", "error");
  }

  async function saveAsTemplate(formState: {
    style: string;
    prompt: string;
    customMode: boolean;
    instrumental: boolean;
  }) {
    if (!templateName.trim()) {
      toast("Please enter a template name", "error");
      return;
    }
    const submitPrompt = getSubmitPrompt(formState.customMode, formState.prompt, formState.style);
    if (!submitPrompt.trim()) {
      toast("Fill in the prompt fields before saving", "error");
      return;
    }

    setIsSavingTemplate(true);
    try {
      const result = await savePromptTemplate({
        name: templateName.trim(),
        prompt: submitPrompt.trim(),
        style: formState.style.trim() || null,
        category: templateCategory.trim() || null,
        isInstrumental: formState.instrumental,
      });

      if (result.ok && result.template) {
        setTemplates((prev) => [...prev, result.template!]);
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

  return {
    selectedCategory,
    setSelectedCategory,
    showTemplatePicker,
    setShowTemplatePicker,
    showSaveDialog,
    setShowSaveDialog,
    templateName,
    setTemplateName,
    templateCategory,
    setTemplateCategory,
    isSavingTemplate,
    builtInTemplates,
    userTemplates,
    filteredBuiltIn,
    filteredUser,
    applyTemplate,
    deleteTemplate,
    saveAsTemplate,
  };
}

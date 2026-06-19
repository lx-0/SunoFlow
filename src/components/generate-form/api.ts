import { apiDelete, apiPost } from "@/lib/api-client";
import { clientFetchErrorMessage } from "@/lib/fetch-client";
import type { GenerationPreset, PromptTemplate } from "./types";

export async function deletePromptTemplate(templateId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await apiDelete(`/api/prompt-templates/${templateId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: clientFetchErrorMessage(err) };
  }
}

export async function savePromptTemplate(payload: {
  name: string;
  prompt: string;
  style: string | null;
  category: string | null;
  isInstrumental: boolean;
}): Promise<{ ok: boolean; template?: PromptTemplate; error?: string }> {
  try {
    const data = await apiPost<{ template: PromptTemplate }>("/api/prompt-templates", payload);
    return { ok: true, template: data.template };
  } catch (err) {
    return { ok: false, error: clientFetchErrorMessage(err) };
  }
}

export async function deletePreset(presetId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await apiDelete(`/api/presets/${presetId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: clientFetchErrorMessage(err) };
  }
}

export async function savePreset(payload: {
  name: string;
  title: string | null;
  stylePrompt: string | null;
  lyricsPrompt: string | null;
  isInstrumental: boolean;
  customMode: boolean;
}): Promise<{ ok: boolean; preset?: GenerationPreset; error?: string }> {
  try {
    const data = await apiPost<{ preset: GenerationPreset }>("/api/presets", payload);
    return { ok: true, preset: data.preset };
  } catch (err) {
    return { ok: false, error: clientFetchErrorMessage(err) };
  }
}

export async function boostStylePrompt(content: string): Promise<{
  ok: boolean;
  result?: string;
  error?: string;
}> {
  try {
    const data = await apiPost<{ result?: string }>("/api/style-boost", { content });
    return { ok: true, result: data.result };
  } catch (err) {
    return { ok: false, error: clientFetchErrorMessage(err) };
  }
}

export async function generateLyricsFromPrompt(prompt: string): Promise<{
  ok: boolean;
  lyrics?: string;
  title?: string;
  style?: string;
  error?: string;
}> {
  try {
    const data = await apiPost<{ lyrics?: string; title?: string; style?: string }>(
      "/api/lyrics/generate",
      { prompt },
    );
    return { ok: true, lyrics: data.lyrics, title: data.title, style: data.style };
  } catch (err) {
    return { ok: false, error: clientFetchErrorMessage(err) };
  }
}

export async function autoFillGenerationFields(prompt: string): Promise<{
  ok: boolean;
  title?: string;
  style?: string;
  lyricsPrompt?: string;
  error?: string;
}> {
  try {
    const data = await apiPost<{ title?: string; style?: string; lyricsPrompt?: string }>(
      "/api/generate/auto",
      { prompt },
    );
    return { ok: true, title: data.title, style: data.style, lyricsPrompt: data.lyricsPrompt };
  } catch (err) {
    return { ok: false, error: clientFetchErrorMessage(err) };
  }
}

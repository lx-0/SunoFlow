// Schema + size limit shared with the mobile client via @sunoflow/core.
// Re-exported so existing "@/lib/upload/request" importers keep working.
export { uploadBodySchema, MAX_BASE64_SIZE, type UploadBody } from "@sunoflow/core";
import type { UploadBody } from "@sunoflow/core";

export function buildUploadGenerationInput(body: UploadBody) {
  const { mode, title, prompt, style, instrumental } = body;

  return {
    title: title?.trim() || null,
    prompt: prompt?.trim() || `Upload ${mode}`,
    tags: style?.trim() || null,
    isInstrumental: Boolean(instrumental),
  };
}

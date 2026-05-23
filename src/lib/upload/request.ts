import { z } from "zod";

export const MAX_BASE64_SIZE = 10 * 1024 * 1024; // 10MB

export const uploadBodySchema = z.object({
  mode: z.string(),
  base64Data: z.string().optional(),
  fileUrl: z.string().optional(),
  title: z.string().optional(),
  prompt: z.string().optional(),
  style: z.string().optional(),
  instrumental: z.any().optional(),
  continueAt: z.any().optional(),
}).superRefine((body, ctx) => {
  const { mode, base64Data, fileUrl } = body;

  if (mode !== "cover" && mode !== "extend") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Mode must be "cover" or "extend"',
      path: ["mode"],
    });
    return;
  }

  if (!base64Data && !fileUrl) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Either a base64-encoded file or a file URL is required",
      path: ["base64Data"],
    });
    return;
  }

  if (base64Data && fileUrl) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Provide either base64Data or fileUrl, not both",
      path: ["base64Data"],
    });
    return;
  }

  if (!base64Data) {
    return;
  }

  const sizeBytes = Math.ceil((base64Data.length * 3) / 4);
  if (sizeBytes > MAX_BASE64_SIZE) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "File too large for base64 upload (max 10MB). Use a URL-based upload for larger files.",
      path: ["base64Data"],
    });
  }
});

export type UploadBody = z.infer<typeof uploadBodySchema>;

export function buildUploadGenerationInput(body: UploadBody) {
  const { mode, title, prompt, style, instrumental } = body;

  return {
    title: title?.trim() || null,
    prompt: prompt?.trim() || `Upload ${mode}`,
    tags: style?.trim() || null,
    isInstrumental: Boolean(instrumental),
  };
}

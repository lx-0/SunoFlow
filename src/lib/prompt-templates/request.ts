import { z } from "zod";

export const listTemplatesQuery = z.object({
  category: z.string().optional(),
  search: z.string().optional(),
});

export type ListTemplatesQuery = z.infer<typeof listTemplatesQuery>;

export const createTemplateBody = z.object({
  name: z.unknown(),
  prompt: z.unknown(),
  style: z.string().optional(),
  category: z.string().optional(),
  description: z.string().optional(),
  isInstrumental: z.boolean().optional(),
});

export type CreateTemplateBody = z.infer<typeof createTemplateBody>;

import { z } from "zod";
import { NOTIFICATION_TYPES } from "@/lib/notifications/types";

export const createNotificationRequestSchema = z.object({
  type: z.enum(NOTIFICATION_TYPES),
  title: z.string().min(1, "title is required"),
  message: z.string().min(1, "message is required"),
  href: z.string().optional().nullable(),
  songId: z.string().optional().nullable(),
});

export type CreateNotificationRequest = z.infer<typeof createNotificationRequestSchema>;

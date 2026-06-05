import { z } from "zod";

// Inspiration digest ("Today's Picks") contract — shared by the web app
// (src/lib/digest) and the mobile client (apps/mobile/src/api/digests). A digest
// is an auto-curated set of RSS-derived prompt ideas, each with a mood + topics
// and a ready-to-use suggestedPrompt the user can generate a song from.

export const digestItemSchema = z.object({
  source: z.literal("rss"),
  title: z.string(),
  link: z.string().optional(),
  mood: z.string(),
  topics: z.array(z.string()),
  suggestedPrompt: z.string(),
  feedTitle: z.string().optional(),
});

export const inspirationDigestSchema = z.object({
  id: z.string(),
  title: z.string(),
  items: z.array(digestItemSchema),
  createdAt: z.string(),
});

export type DigestItem = z.infer<typeof digestItemSchema>;
export type InspirationDigest = z.infer<typeof inspirationDigestSchema>;

/** True when the digest's createdAt falls on the same local day as `now`. */
export function isDigestFromToday(createdAt: string, now: Date): boolean {
  const d = new Date(createdAt);
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

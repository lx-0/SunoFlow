import { z } from "zod";

export const updateProfileBody = z.object({
  name: z.string().optional(),
  bio: z.string().nullable().optional(),
  avatarUrl: z.string().nullable().optional(),
  username: z.string().nullable().optional(),
  bannerUrl: z.string().nullable().optional(),
  featuredSongId: z.string().nullable().optional(),
});

export type UpdateProfileBody = z.infer<typeof updateProfileBody>;

export const deleteAccountBody = z.object({
  password: z.string(),
  confirmEmail: z.string(),
});

export type DeleteAccountBody = z.infer<typeof deleteAccountBody>;

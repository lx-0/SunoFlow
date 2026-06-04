import { z } from "zod";

// Change-password request contract — shared by the web route (server validation)
// and the mobile client (pre-send validation + matching error messages).
export const changePasswordBody = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "New password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Confirm password is required"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type ChangePasswordBody = z.infer<typeof changePasswordBody>;

import type { DefaultSession } from "next-auth";
import type { SubscriptionTier } from "@/lib/feature-gates";

/**
 * Module augmentation for the custom fields SunoFlow attaches to the
 * NextAuth session/JWT in the auth callbacks (see src/lib/auth/session.ts).
 *
 * These are UI-tier hints only — server authorization always reads the DB
 * directly. Keeping them typed here removes the `as unknown as Record<...>`
 * casts that used to bridge the untyped session.user / token.
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      onboardingCompleted: boolean;
      isAdmin: boolean;
      emailVerified: string | null;
      hasSunoApiKey: boolean;
      subscriptionTier: SubscriptionTier;
      subscriptionStatus: string;
    } & DefaultSession["user"];
  }

  interface User {
    onboardingCompleted?: boolean;
    isAdmin?: boolean;
    hasSunoApiKey?: boolean;
    subscriptionTier?: SubscriptionTier;
    subscriptionStatus?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    onboardingCompleted: boolean;
    isAdmin: boolean;
    emailVerified: string | null;
    hasSunoApiKey: boolean;
    subscriptionTier: SubscriptionTier;
    subscriptionStatus: string;
  }
}

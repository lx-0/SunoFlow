/**
 * Feature gate definitions — maps features to minimum required subscription tier.
 * Client-safe: no server imports.
 */

export type SubscriptionTier = "free" | "starter" | "pro" | "studio";

export interface FeatureGate {
  /** Minimum tier required to access this feature */
  minTier: SubscriptionTier;
  /** Human-readable name */
  name: string;
  /** Short description shown in the locked state */
  description: string;
}

export const FEATURE_GATES: Record<string, FeatureGate> = {
  mashupStudio: {
    minTier: "starter",
    name: "Mashup Studio",
    description: "Blend two songs together into a unique mashup.",
  },
  vocalSeparation: {
    minTier: "pro",
    name: "Vocal Separation",
    description: "Separate vocals and instrumentals from any track.",
  },
  priorityQueue: {
    minTier: "pro",
    name: "Priority Queue",
    description: "Skip the line — your generations are processed first.",
  },
  apiKeys: {
    minTier: "studio",
    name: "API Key Access",
    description: "Integrate SunoFlow into your own apps via API.",
  },
};

const TIER_ORDER: SubscriptionTier[] = ["free", "starter", "pro", "studio"];

/** Returns true if `tier` meets or exceeds `required`. */
export function hasAccess(tier: SubscriptionTier, required: SubscriptionTier): boolean {
  return TIER_ORDER.indexOf(tier) >= TIER_ORDER.indexOf(required);
}

/** Returns true if the user's tier allows the named feature. */
export function canUseFeature(
  featureKey: keyof typeof FEATURE_GATES,
  tier: SubscriptionTier
): boolean {
  const gate = FEATURE_GATES[featureKey];
  if (!gate) return true;
  return hasAccess(tier, gate.minTier);
}

export const TIER_LABELS: Record<SubscriptionTier, string> = {
  free: "Free",
  starter: "Starter",
  pro: "Pro",
  studio: "Studio",
};

export const TIER_BADGE_COLORS: Record<SubscriptionTier, string> = {
  free: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  starter: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  pro: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  studio: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

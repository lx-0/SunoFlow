"use client";

import Link from "next/link";
import { LockClosedIcon, ArrowRightIcon } from "@heroicons/react/24/outline";
import {
  FEATURE_GATES,
  TIER_LABELS,
  canUseFeature,
  type SubscriptionTier,
} from "@/lib/feature-gates";

interface FeatureGateProps {
  featureKey: keyof typeof FEATURE_GATES;
  tier: SubscriptionTier;
  children: React.ReactNode;
}

/**
 * Wraps a feature in a locked overlay if the user's tier doesn't meet the requirement.
 * The children are still rendered (for SEO/layout), but overlaid with an upgrade prompt.
 */
export function FeatureGate({ featureKey, tier, children }: FeatureGateProps) {
  if (canUseFeature(featureKey, tier)) {
    return <>{children}</>;
  }

  const gate = FEATURE_GATES[featureKey];

  return (
    <div className="relative">
      {/* Blur the underlying content */}
      <div className="pointer-events-none select-none opacity-30 blur-sm" aria-hidden="true">
        {children}
      </div>

      {/* Locked overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10 p-6">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl p-6 max-w-sm w-full text-center space-y-4">
          <div className="flex items-center justify-center w-12 h-12 mx-auto rounded-full bg-violet-100 dark:bg-violet-900/30">
            <LockClosedIcon className="w-6 h-6 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
              {TIER_LABELS[gate.minTier]}+ Feature
            </p>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{gate.name}</h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{gate.description}</p>
          </div>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-violet-600 hover:bg-violet-700 text-white transition-colors"
          >
            Upgrade to {TIER_LABELS[gate.minTier]}
            <ArrowRightIcon className="w-4 h-4" />
          </Link>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            You are on the <span className="font-medium">{TIER_LABELS[tier]}</span> plan.
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Inline locked state — renders a small lock prompt instead of the feature content.
 * Use for inline UI elements (buttons, menu items) rather than full-page features.
 */
interface InlineFeatureGateProps {
  featureKey: keyof typeof FEATURE_GATES;
  tier: SubscriptionTier;
  children: React.ReactNode;
}

export function InlineFeatureGate({ featureKey, tier, children }: InlineFeatureGateProps) {
  if (canUseFeature(featureKey, tier)) {
    return <>{children}</>;
  }

  const gate = FEATURE_GATES[featureKey];

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8 px-4 text-center">
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-violet-100 dark:bg-violet-900/30">
        <LockClosedIcon className="w-5 h-5 text-violet-600 dark:text-violet-400" />
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-900 dark:text-white">{gate.name}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{gate.description}</p>
      </div>
      <Link
        href="/pricing"
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white transition-colors"
      >
        Upgrade to {TIER_LABELS[gate.minTier]}
        <ArrowRightIcon className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}

"use client";

import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { AppShell } from "@/components/AppShell";
import { SkeletonText } from "@/components/Skeleton";
import { InlineFeatureGate } from "@/components/FeatureGate";
import type { SubscriptionTier } from "@/lib/feature-gates";

const MashupStudio = dynamic(
  () => import("@/components/MashupStudio").then((mod) => mod.MashupStudio),
  {
    loading: () => (
      <div className="px-4 py-6">
        <SkeletonText lines={8} />
      </div>
    ),
    ssr: false,
  }
);

export default function MashupPage() {
  const { data: session } = useSession();
  const tier = ((session?.user as unknown as Record<string, unknown>)?.subscriptionTier as SubscriptionTier) ?? "free";

  return (
    <AppShell>
      <InlineFeatureGate featureKey="mashupStudio" tier={tier}>
        <MashupStudio />
      </InlineFeatureGate>
    </AppShell>
  );
}

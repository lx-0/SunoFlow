"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import {
  CreditCardIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import {
  TIER_LABELS,
  TIER_BADGE_COLORS,
  type SubscriptionTier,
} from "@/lib/feature-gates";

interface SubscriptionData {
  tier: SubscriptionTier;
  status: string;
  creditsPerMonth: number;
  generationsPerHour: number;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  trialEnd: string | null;
}

interface CreditUsage {
  budget: number;
  creditsUsedThisMonth: number;
  creditsRemaining: number;
  usagePercent: number;
  isLow: boolean;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    active: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    trialing: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    past_due: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    canceled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    unpaid: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };
  const label: Record<string, string> = {
    active: "Active",
    trialing: "Trial",
    past_due: "Past Due",
    canceled: "Canceled",
    unpaid: "Unpaid",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${colorMap[status] ?? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"}`}>
      {label[status] ?? status}
    </span>
  );
}

export default function BillingPage() {
  const searchParams = useSearchParams();
  const [sub, setSub] = useState<SubscriptionData | null>(null);
  const [credits, setCredits] = useState<CreditUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const successParam = searchParams.get("success");
  const cancelledParam = searchParams.get("cancelled");

  const fetchData = useCallback(async () => {
    try {
      const [subRes, creditRes] = await Promise.all([
        fetch("/api/billing/subscription"),
        fetch("/api/credits"),
      ]);
      if (subRes.ok) setSub(await subRes.json());
      if (creditRes.ok) setCredits(await creditRes.json());
    } catch {
      // keep existing
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleManage() {
    setPortalLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      if (!res.ok) {
        const body = await res.json();
        setError(body.error ?? "Could not open billing portal");
        return;
      }
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setPortalLoading(false);
    }
  }

  const tier = (sub?.tier ?? "free") as SubscriptionTier;
  const isPaid = tier !== "free";

  return (
    <AppShell>
      <div className="px-4 py-6 max-w-2xl mx-auto space-y-6">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <CreditCardIcon className="w-6 h-6 text-violet-500" />
          Billing &amp; Subscription
        </h1>

        {/* Success / cancel banners */}
        {successParam && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 text-sm">
            <CheckCircleIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Subscription activated!</p>
              <p>Your plan has been upgraded. It may take a moment for the changes to reflect.</p>
            </div>
          </div>
        )}
        {cancelledParam && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 text-sm">
            <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p>Checkout was cancelled. Your plan was not changed.</p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-violet-400" />
          </div>
        ) : (
          <>
            {/* Current plan card */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200">Current Plan</h2>
                {sub && <StatusBadge status={sub.status} />}
              </div>

              <div className="flex items-center gap-3">
                <span className={`px-2.5 py-1 rounded-lg text-sm font-bold uppercase tracking-wide ${TIER_BADGE_COLORS[tier]}`}>
                  {TIER_LABELS[tier]}
                </span>
                {sub?.cancelAtPeriodEnd && (
                  <span className="text-xs text-amber-600 dark:text-amber-400">
                    Cancels on {formatDate(sub.currentPeriodEnd)}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Credits/month</p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {sub?.creditsPerMonth.toLocaleString() ?? "200"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Generations/hour</p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {sub?.generationsPerHour ?? 5}
                  </p>
                </div>
                {sub?.currentPeriodStart && (
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Period start</p>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {formatDate(sub.currentPeriodStart)}
                    </p>
                  </div>
                )}
                {sub?.currentPeriodEnd && (
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">
                      {sub.cancelAtPeriodEnd ? "Expires" : "Renews"}
                    </p>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {formatDate(sub.currentPeriodEnd)}
                    </p>
                  </div>
                )}
              </div>

              {error && (
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              )}

              <div className="flex flex-col sm:flex-row gap-3 pt-1">
                {isPaid ? (
                  <button
                    onClick={handleManage}
                    disabled={portalLoading}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-violet-600 hover:bg-violet-700 text-white transition-colors disabled:opacity-60"
                  >
                    {portalLoading ? (
                      <ArrowPathIcon className="w-4 h-4 animate-spin" />
                    ) : (
                      <CreditCardIcon className="w-4 h-4" />
                    )}
                    Manage subscription
                  </button>
                ) : (
                  <Link
                    href="/pricing"
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-violet-600 hover:bg-violet-700 text-white transition-colors"
                  >
                    Upgrade plan
                    <ChevronRightIcon className="w-4 h-4" />
                  </Link>
                )}
              </div>
            </div>

            {/* Credit usage card */}
            {credits && (
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 space-y-4">
                <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200">Credit Usage This Month</h2>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      {credits.creditsUsedThisMonth.toLocaleString()} / {credits.budget.toLocaleString()} used
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {credits.creditsRemaining.toLocaleString()} remaining
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        credits.isLow
                          ? "bg-amber-500"
                          : credits.usagePercent > 50
                            ? "bg-violet-500"
                            : "bg-green-500"
                      }`}
                      style={{ width: `${Math.min(100, credits.usagePercent)}%` }}
                    />
                  </div>
                </div>

                {credits.isLow && !isPaid && (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-sm text-amber-700 dark:text-amber-400">
                    <ExclamationTriangleIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Running low on credits</p>
                      <p>
                        Upgrade to get more credits and avoid interruptions.{" "}
                        <Link href="/pricing" className="underline font-medium">View plans</Link>
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Plans comparison link */}
            {!isPaid && (
              <div className="text-center">
                <Link
                  href="/pricing"
                  className="inline-flex items-center gap-1 text-sm text-violet-600 dark:text-violet-400 hover:underline font-medium"
                >
                  View all plans &amp; features
                  <ChevronRightIcon className="w-4 h-4" />
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}

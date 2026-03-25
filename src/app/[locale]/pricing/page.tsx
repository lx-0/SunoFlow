"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { CheckIcon, XMarkIcon } from "@heroicons/react/24/solid";
import { SparklesIcon } from "@heroicons/react/24/outline";

interface Tier {
  id: "free" | "starter" | "pro" | "studio";
  name: string;
  price: string;
  priceNote: string;
  credits: string;
  generations: string;
  downloads: string;
  featured: boolean;
  cta: string;
  features: Array<{ label: string; included: boolean }>;
}

const TIERS: Tier[] = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    priceNote: "forever",
    credits: "200 credits/mo",
    generations: "5 gen/hr",
    downloads: "20 downloads/hr",
    featured: false,
    cta: "Get started",
    features: [
      { label: "200 monthly credits", included: true },
      { label: "5 generations/hour", included: true },
      { label: "20 downloads/hour", included: true },
      { label: "Library & playlists", included: true },
      { label: "Mashup Studio", included: false },
      { label: "Priority Queue", included: false },
      { label: "Vocal Separation", included: false },
      { label: "API Key Access", included: false },
    ],
  },
  {
    id: "starter",
    name: "Starter",
    price: "$9.99",
    priceNote: "per month",
    credits: "1,500 credits/mo",
    generations: "25 gen/hr",
    downloads: "100 downloads/hr",
    featured: false,
    cta: "Upgrade to Starter",
    features: [
      { label: "1,500 monthly credits", included: true },
      { label: "25 generations/hour", included: true },
      { label: "100 downloads/hour", included: true },
      { label: "Library & playlists", included: true },
      { label: "Mashup Studio", included: true },
      { label: "Priority Queue", included: false },
      { label: "Vocal Separation", included: false },
      { label: "API Key Access", included: false },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$24.99",
    priceNote: "per month",
    credits: "5,000 credits/mo",
    generations: "50 gen/hr",
    downloads: "500 downloads/hr",
    featured: true,
    cta: "Upgrade to Pro",
    features: [
      { label: "5,000 monthly credits", included: true },
      { label: "50 generations/hour", included: true },
      { label: "500 downloads/hour", included: true },
      { label: "Library & playlists", included: true },
      { label: "Mashup Studio", included: true },
      { label: "Priority Queue", included: true },
      { label: "Vocal Separation", included: true },
      { label: "API Key Access", included: false },
    ],
  },
  {
    id: "studio",
    name: "Studio",
    price: "$49.99",
    priceNote: "per month",
    credits: "15,000 credits/mo",
    generations: "100 gen/hr",
    downloads: "Unlimited",
    featured: false,
    cta: "Upgrade to Studio",
    features: [
      { label: "15,000 monthly credits", included: true },
      { label: "100 generations/hour", included: true },
      { label: "Unlimited downloads", included: true },
      { label: "Library & playlists", included: true },
      { label: "Mashup Studio", included: true },
      { label: "Priority Queue", included: true },
      { label: "Vocal Separation", included: true },
      { label: "API Key Access", included: true },
    ],
  },
];

function TierCard({ tier, onUpgrade, loading }: { tier: Tier; onUpgrade: (id: string) => void; loading: string | null }) {
  const { data: session } = useSession();
  const currentTier = (session?.user as unknown as Record<string, unknown>)?.subscriptionTier as string ?? "free";
  const isCurrent = currentTier === tier.id;
  const isLoading = loading === tier.id;

  function handleCta() {
    if (tier.id === "free") return;
    if (!session) {
      window.location.href = "/register";
      return;
    }
    onUpgrade(tier.id);
  }

  return (
    <div
      className={`relative flex flex-col rounded-2xl border p-6 transition-shadow ${
        tier.featured
          ? "border-violet-500 shadow-lg shadow-violet-500/10 bg-violet-50 dark:bg-violet-950/20"
          : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"
      }`}
    >
      {tier.featured && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-violet-600 text-white shadow">
            <SparklesIcon className="w-3.5 h-3.5" />
            Most Popular
          </span>
        </div>
      )}

      <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{tier.name}</h3>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="text-3xl font-extrabold text-gray-900 dark:text-white">{tier.price}</span>
          <span className="text-sm text-gray-500 dark:text-gray-400">/{tier.priceNote}</span>
        </div>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{tier.credits}</p>
      </div>

      <ul className="space-y-2.5 flex-1 mb-6">
        {tier.features.map((f) => (
          <li key={f.label} className="flex items-center gap-2.5 text-sm">
            {f.included ? (
              <CheckIcon className="w-4 h-4 text-green-500 flex-shrink-0" />
            ) : (
              <XMarkIcon className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0" />
            )}
            <span
              className={f.included ? "text-gray-700 dark:text-gray-300" : "text-gray-400 dark:text-gray-600"}
            >
              {f.label}
            </span>
          </li>
        ))}
      </ul>

      {isCurrent ? (
        <div className="w-full text-center py-2 px-4 rounded-xl text-sm font-semibold bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
          Current plan
        </div>
      ) : tier.id === "free" ? (
        <Link
          href="/register"
          className="w-full text-center py-2 px-4 rounded-xl text-sm font-semibold border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          {tier.cta}
        </Link>
      ) : (
        <button
          onClick={handleCta}
          disabled={isLoading}
          className={`w-full py-2 px-4 rounded-xl text-sm font-semibold transition-colors ${
            tier.featured
              ? "bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-60"
              : "bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 text-white dark:text-gray-900 disabled:opacity-60"
          }`}
        >
          {isLoading ? "Redirecting…" : tier.cta}
        </button>
      )}
    </div>
  );
}

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleUpgrade(tier: string) {
    setLoading(tier);
    setError(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      if (!res.ok) {
        const body = await res.json();
        setError(body.error ?? "Failed to start checkout");
        return;
      }
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-6xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-3">
            Simple, transparent pricing
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Start free. Upgrade when you need more credits, speed, or features.
          </p>
        </div>

        {error && (
          <div className="mb-8 max-w-md mx-auto p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-400 text-center">
            {error}
          </div>
        )}

        {/* Tier cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {TIERS.map((tier) => (
            <TierCard key={tier.id} tier={tier} onUpgrade={handleUpgrade} loading={loading} />
          ))}
        </div>

        {/* Footer note */}
        <p className="mt-10 text-center text-sm text-gray-500 dark:text-gray-400">
          All plans include a 30-day grace period for existing users.{" "}
          <Link href="/settings/billing" className="text-violet-600 dark:text-violet-400 hover:underline">
            Manage your subscription
          </Link>
        </p>
      </div>
    </div>
  );
}

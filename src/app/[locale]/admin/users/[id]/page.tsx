"use client";

import { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

interface UserDetail {
  id: string;
  name: string | null;
  email: string | null;
  isAdmin: boolean;
  isDisabled: boolean;
  onboardingCompleted: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  songCount: number;
  playlistCount: number;
  favoriteCount: number;
  planTier: string;
  subscriptionStatus: string | null;
  creditBalance: number;
  creditBudget: number;
}

interface Song {
  id: string;
  title: string | null;
  prompt: string | null;
  generationStatus: string;
  audioUrl: string | null;
  duration: number | null;
  createdAt: string;
}

const TIER_OPTIONS = ["free", "starter", "pro", "studio"] as const;

const TIER_COLORS: Record<string, string> = {
  free: "bg-gray-800 text-gray-400",
  starter: "bg-blue-900/30 text-blue-400",
  pro: "bg-violet-900/30 text-violet-400",
  studio: "bg-amber-900/30 text-amber-400",
};

export default function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [user, setUser] = useState<UserDetail | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [toggling, setToggling] = useState(false);

  // Credit adjustment state
  const [creditAmount, setCreditAmount] = useState("");
  const [creditReason, setCreditReason] = useState("");
  const [adjustingCredits, setAdjustingCredits] = useState(false);
  const [creditMessage, setCreditMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Plan change state
  const [selectedTier, setSelectedTier] = useState<string>("");
  const [changingPlan, setChangingPlan] = useState(false);
  const [planMessage, setPlanMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const fetchUser = useCallback(async () => {
    const res = await fetch(`/api/admin/users/${id}`);
    if (res.ok) {
      const data = await res.json();
      setUser(data);
      setSelectedTier(data.planTier ?? "free");
    }
  }, [id]);

  const fetchHistory = useCallback(async () => {
    const res = await fetch(`/api/admin/users/${id}/history?page=${page}&limit=20`);
    if (res.ok) {
      const data = await res.json();
      setSongs(data.songs);
      setTotalPages(data.totalPages);
    }
  }, [id, page]);

  useEffect(() => {
    Promise.all([fetchUser(), fetchHistory()]).finally(() => setLoading(false));
  }, [fetchUser, fetchHistory]);

  const handleToggle = async () => {
    setToggling(true);
    await fetch(`/api/admin/users/${id}/toggle`, { method: "POST" });
    await fetchUser();
    setToggling(false);
  };

  const handleAdjustCredits = async () => {
    const amount = parseInt(creditAmount, 10);
    if (isNaN(amount) || amount === 0) {
      setCreditMessage({ type: "err", text: "Enter a non-zero integer amount." });
      return;
    }
    setAdjustingCredits(true);
    setCreditMessage(null);
    const res = await fetch(`/api/admin/users/${id}/credits`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, reason: creditReason || "Admin adjustment" }),
    });
    if (res.ok) {
      setCreditMessage({ type: "ok", text: `Credits adjusted by ${amount > 0 ? "+" : ""}${amount}.` });
      setCreditAmount("");
      setCreditReason("");
      await fetchUser();
    } else {
      const err = await res.json().catch(() => ({}));
      setCreditMessage({ type: "err", text: err.error ?? "Failed to adjust credits." });
    }
    setAdjustingCredits(false);
  };

  const handleChangePlan = async () => {
    if (!selectedTier) return;
    setChangingPlan(true);
    setPlanMessage(null);
    const res = await fetch(`/api/admin/users/${id}/plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tier: selectedTier }),
    });
    if (res.ok) {
      setPlanMessage({ type: "ok", text: `Plan updated to ${selectedTier}.` });
      await fetchUser();
    } else {
      const err = await res.json().catch(() => ({}));
      setPlanMessage({ type: "err", text: err.error ?? "Failed to change plan." });
    }
    setChangingPlan(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-400" />
      </div>
    );
  }

  if (!user) {
    return <p className="text-red-400">User not found</p>;
  }

  return (
    <div className="space-y-6">
      <Link
        href="/admin/users"
        className="inline-flex items-center gap-2 text-gray-400 hover:text-white text-sm"
      >
        <ArrowLeftIcon className="w-4 h-4" /> Back to Users
      </Link>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold">
              {user.name || "Unnamed User"}
              {user.isAdmin && (
                <span className="ml-2 text-xs bg-red-900/50 text-red-400 px-1.5 py-0.5 rounded">
                  Admin
                </span>
              )}
            </h1>
            <p className="text-gray-400 text-sm mt-1">{user.email}</p>
          </div>
          {!user.isAdmin && (
            <button
              onClick={handleToggle}
              disabled={toggling}
              className={`text-sm px-4 py-2 rounded-lg transition-colors ${
                user.isDisabled
                  ? "bg-green-900/30 text-green-400 hover:bg-green-900/50"
                  : "bg-red-900/30 text-red-400 hover:bg-red-900/50"
              } disabled:opacity-50`}
            >
              {toggling ? "..." : user.isDisabled ? "Enable Account" : "Disable Account"}
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
          <div>
            <span className="text-xs text-gray-500">Status</span>
            <p className={`font-medium ${user.isDisabled ? "text-red-400" : "text-green-400"}`}>
              {user.isDisabled ? "Disabled" : "Active"}
            </p>
          </div>
          <div>
            <span className="text-xs text-gray-500">Plan</span>
            <p>
              <span
                className={`text-xs px-2 py-1 rounded-full capitalize ${
                  TIER_COLORS[user.planTier ?? "free"] ?? "bg-gray-800 text-gray-400"
                }`}
              >
                {user.planTier ?? "free"}
              </span>
            </p>
          </div>
          <div>
            <span className="text-xs text-gray-500">Credits Remaining</span>
            <p className="font-medium tabular-nums">
              {user.creditBalance}
              <span className="text-gray-500 text-xs">/{user.creditBudget}</span>
            </p>
          </div>
          <div>
            <span className="text-xs text-gray-500">Joined</span>
            <p>{new Date(user.createdAt).toLocaleDateString()}</p>
          </div>
          <div>
            <span className="text-xs text-gray-500">Last Login</span>
            <p>
              {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : "Never"}
            </p>
          </div>
          <div>
            <span className="text-xs text-gray-500">Onboarding</span>
            <p>{user.onboardingCompleted ? "Complete" : "Incomplete"}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-800">
          <div className="text-center">
            <div className="text-2xl font-bold">{user.songCount}</div>
            <div className="text-xs text-gray-500">Songs</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{user.playlistCount}</div>
            <div className="text-xs text-gray-500">Playlists</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{user.favoriteCount}</div>
            <div className="text-xs text-gray-500">Favorites</div>
          </div>
        </div>
      </div>

      {!user.isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Credit Adjustment */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
            <h2 className="text-base font-semibold">Adjust Credits</h2>
            <p className="text-xs text-gray-500">
              Positive values add credits, negative values deduct credits.
            </p>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Amount (e.g. 100 or -50)"
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
                className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <input
              type="text"
              placeholder="Reason (optional)"
              value={creditReason}
              onChange={(e) => setCreditReason(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            {creditMessage && (
              <p className={`text-xs ${creditMessage.type === "ok" ? "text-green-400" : "text-red-400"}`}>
                {creditMessage.text}
              </p>
            )}
            <button
              onClick={handleAdjustCredits}
              disabled={adjustingCredits}
              className="px-4 py-2 bg-violet-700 hover:bg-violet-600 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
            >
              {adjustingCredits ? "Saving..." : "Apply Adjustment"}
            </button>
          </div>

          {/* Plan Change */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
            <h2 className="text-base font-semibold">Change Plan</h2>
            <p className="text-xs text-gray-500">
              Override the user&apos;s subscription tier. This does not affect Stripe billing.
            </p>
            <select
              value={selectedTier}
              onChange={(e) => setSelectedTier(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              {TIER_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
            {planMessage && (
              <p className={`text-xs ${planMessage.type === "ok" ? "text-green-400" : "text-red-400"}`}>
                {planMessage.text}
              </p>
            )}
            <button
              onClick={handleChangePlan}
              disabled={changingPlan || selectedTier === (user.planTier ?? "free")}
              className="px-4 py-2 bg-violet-700 hover:bg-violet-600 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
            >
              {changingPlan ? "Saving..." : "Update Plan"}
            </button>
          </div>
        </div>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold">Generation History</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400">
                <th className="text-left px-4 py-3">Title</th>
                <th className="text-left px-4 py-3 hidden sm:table-cell">Prompt</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Date</th>
              </tr>
            </thead>
            <tbody>
              {songs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-gray-500">
                    No generations yet
                  </td>
                </tr>
              ) : (
                songs.map((song) => (
                  <tr
                    key={song.id}
                    className="border-b border-gray-800/50 hover:bg-gray-800/30"
                  >
                    <td className="px-4 py-3 font-medium">{song.title || "Untitled"}</td>
                    <td className="px-4 py-3 hidden sm:table-cell text-gray-400 max-w-xs truncate">
                      {song.prompt || "-"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          song.generationStatus === "ready"
                            ? "bg-green-900/30 text-green-400"
                            : song.generationStatus === "error"
                            ? "bg-red-900/30 text-red-400"
                            : "bg-yellow-900/30 text-yellow-400"
                        }`}
                      >
                        {song.generationStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-gray-400">
                      {new Date(song.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="text-sm px-3 py-1.5 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-gray-400">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="text-sm px-3 py-1.5 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

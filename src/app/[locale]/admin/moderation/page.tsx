"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  MusicalNoteIcon,
  EyeSlashIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  TrashIcon,
  CheckCircleIcon,
  PlayIcon,
  PauseIcon,
  FunnelIcon,
} from "@heroicons/react/24/outline";

interface ReportItem {
  id: string;
  songId: string;
  reason: string;
  description: string | null;
  status: string;
  adminNote: string | null;
  createdAt: string;
  song: {
    id: string;
    title: string | null;
    imageUrl: string | null;
    audioUrl: string | null;
    isHidden: boolean;
    userId: string;
    user: { id: string; name: string | null; email: string | null };
  };
  reporter: { id: string; name: string | null; email: string | null };
}

const STATUS_TABS = [
  { value: "pending", label: "Pending" },
  { value: "actioned", label: "Actioned" },
  { value: "dismissed", label: "Dismissed" },
  { value: "all", label: "All" },
];

const REASON_LABELS: Record<string, string> = {
  offensive: "Offensive",
  copyright: "Copyright",
  spam: "Spam",
  other: "Other",
};

const REASON_COLORS: Record<string, string> = {
  offensive: "bg-red-900/30 text-red-400",
  copyright: "bg-yellow-900/30 text-yellow-400",
  spam: "bg-orange-900/30 text-orange-400",
  other: "bg-gray-800 text-gray-400",
};

function AudioPreview({ audioUrl }: { audioUrl: string | null }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  if (!audioUrl) return null;

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
    } else {
      el.play().catch(() => {});
      setPlaying(true);
    }
  };

  return (
    <span>
      <audio ref={audioRef} src={audioUrl} onEnded={() => setPlaying(false)} className="hidden" />
      <button
        onClick={toggle}
        className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-violet-900/30 text-violet-400 hover:bg-violet-900/50 transition-colors"
      >
        {playing ? <PauseIcon className="w-3.5 h-3.5" /> : <PlayIcon className="w-3.5 h-3.5" />}
        {playing ? "Pause" : "Preview"}
      </button>
    </span>
  );
}

export default function AdminModerationPage() {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setSelected(new Set());
    try {
      const res = await fetch(`/api/admin/reports?status=${statusFilter}&page=${page}`);
      if (!res.ok) return;
      const data = await res.json();
      setReports(data.reports);
      setTotalPages(data.totalPages);
      setTotal(data.total);
    } catch (err) {
      console.error("Failed to fetch reports", err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  async function handleAction(reportId: string, action: string) {
    setActionLoading(reportId);
    try {
      const res = await fetch(`/api/admin/reports/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) fetchReports();
    } finally {
      setActionLoading(null);
    }
  }

  async function handleBulkAction(action: string) {
    if (selected.size === 0) return;
    setBulkLoading(true);
    try {
      await fetch("/api/admin/reports/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportIds: Array.from(selected), action }),
      });
      fetchReports();
    } finally {
      setBulkLoading(false);
    }
  }

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    const pending = reports.filter((r) => r.status === "pending").map((r) => r.id);
    setSelected(new Set(pending));
  };

  const clearSelection = () => setSelected(new Set());

  const pendingReports = reports.filter((r) => r.status === "pending");

  if (loading && reports.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Content Moderation</h1>
        <span className="text-sm text-gray-400">
          {total} {statusFilter === "all" ? "total" : statusFilter} report{total !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-lg p-1">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => { setStatusFilter(tab.value); setPage(1); }}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors min-h-[44px] ${
              statusFilter === tab.value
                ? "bg-red-900/40 text-red-400"
                : "text-gray-400 hover:text-white hover:bg-gray-800"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Bulk actions bar */}
      {statusFilter === "pending" && pendingReports.length > 0 && (
        <div className="flex items-center gap-3 bg-gray-900 border border-gray-800 rounded-lg px-4 py-2.5">
          <button
            onClick={selected.size === pendingReports.length ? clearSelection : selectAll}
            className="text-xs text-gray-400 hover:text-white transition-colors"
          >
            {selected.size === pendingReports.length ? "Deselect all" : `Select all (${pendingReports.length})`}
          </button>
          {selected.size > 0 && (
            <>
              <span className="text-gray-600">|</span>
              <span className="text-xs text-gray-400">{selected.size} selected</span>
              <div className="flex gap-2 ml-auto">
                <button
                  onClick={() => handleBulkAction("dismiss")}
                  disabled={bulkLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 disabled:opacity-50"
                >
                  <XCircleIcon className="w-4 h-4" />
                  Dismiss
                </button>
                <button
                  onClick={() => handleBulkAction("warn_user")}
                  disabled={bulkLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-yellow-900/30 hover:bg-yellow-900/50 text-yellow-400 disabled:opacity-50"
                >
                  <ExclamationTriangleIcon className="w-4 h-4" />
                  Warn
                </button>
                <button
                  onClick={() => handleBulkAction("hide_song")}
                  disabled={bulkLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-red-900/30 hover:bg-red-900/50 text-red-400 disabled:opacity-50"
                >
                  <EyeSlashIcon className="w-4 h-4" />
                  Hide
                </button>
                <button
                  onClick={() => handleBulkAction("delete_song")}
                  disabled={bulkLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-red-900/50 hover:bg-red-900/70 text-red-300 disabled:opacity-50"
                >
                  <TrashIcon className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Reports list */}
      {reports.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <FunnelIcon className="w-10 h-10 mx-auto mb-2 text-gray-600" />
          <p>No {statusFilter === "all" ? "" : statusFilter} reports</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <div
              key={report.id}
              className={`bg-gray-900 border rounded-xl p-4 space-y-3 transition-colors ${
                selected.has(report.id) ? "border-violet-600/60" : "border-gray-800"
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Checkbox (pending only) */}
                {report.status === "pending" && (
                  <input
                    type="checkbox"
                    checked={selected.has(report.id)}
                    onChange={() => toggleSelect(report.id)}
                    className="mt-1 w-4 h-4 rounded border-gray-600 bg-gray-800 text-violet-500 focus:ring-violet-500 flex-shrink-0 cursor-pointer"
                  />
                )}

                {/* Song thumbnail */}
                <div className="relative flex-shrink-0 w-12 h-12 rounded-lg bg-gray-800 overflow-hidden flex items-center justify-center">
                  {report.song.imageUrl ? (
                    <Image
                      src={report.song.imageUrl}
                      alt={report.song.title ?? "Song"}
                      fill
                      className="object-cover"
                      sizes="48px"
                    />
                  ) : (
                    <MusicalNoteIcon className="w-6 h-6 text-gray-600" />
                  )}
                  {report.song.isHidden && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <EyeSlashIcon className="w-5 h-5 text-red-400" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-white truncate">
                      {report.song.title ?? "Untitled"}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${REASON_COLORS[report.reason] ?? REASON_COLORS.other}`}>
                      {REASON_LABELS[report.reason] ?? report.reason}
                    </span>
                    {report.song.isHidden && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-900/30 text-red-400">
                        Hidden
                      </span>
                    )}
                    <AudioPreview audioUrl={report.song.audioUrl} />
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    Song by {report.song.user.name ?? report.song.user.email ?? "Unknown"}
                    {" · "}
                    Reported by {report.reporter.name ?? report.reporter.email ?? "Unknown"}
                    {" · "}
                    {new Date(report.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>

                {/* Status badge */}
                <span className={`flex-shrink-0 text-xs px-2 py-1 rounded-full ${
                  report.status === "pending"
                    ? "bg-yellow-900/30 text-yellow-400"
                    : report.status === "actioned"
                    ? "bg-red-900/30 text-red-400"
                    : "bg-gray-800 text-gray-400"
                }`}>
                  {report.status}
                </span>
              </div>

              {report.description && (
                <p className="text-sm text-gray-400 bg-gray-800/50 rounded-lg px-3 py-2">
                  {report.description}
                </p>
              )}

              {report.adminNote && (
                <p className="text-xs text-gray-500 italic">Admin note: {report.adminNote}</p>
              )}

              {/* Per-item actions (pending only) */}
              {report.status === "pending" && (
                <div className="flex gap-2 pt-1 flex-wrap">
                  <button
                    onClick={() => handleAction(report.id, "dismiss")}
                    disabled={actionLoading === report.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors disabled:opacity-50"
                  >
                    <XCircleIcon className="w-4 h-4" />
                    Dismiss
                  </button>
                  <button
                    onClick={() => handleAction(report.id, "warn_user")}
                    disabled={actionLoading === report.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-yellow-900/30 hover:bg-yellow-900/50 text-yellow-400 transition-colors disabled:opacity-50"
                  >
                    <ExclamationTriangleIcon className="w-4 h-4" />
                    Warn User
                  </button>
                  <button
                    onClick={() => handleAction(report.id, "hide_song")}
                    disabled={actionLoading === report.id || report.song.isHidden}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-red-900/30 hover:bg-red-900/50 text-red-400 transition-colors disabled:opacity-50"
                  >
                    <EyeSlashIcon className="w-4 h-4" />
                    Hide Song
                  </button>
                  <button
                    onClick={() => handleAction(report.id, "delete_song")}
                    disabled={actionLoading === report.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-red-900/50 hover:bg-red-900/70 text-red-300 transition-colors disabled:opacity-50"
                  >
                    <TrashIcon className="w-4 h-4" />
                    Delete Song
                  </button>
                  <button
                    onClick={() => handleAction(report.id, "hide_song")}
                    disabled={actionLoading === report.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-green-900/30 hover:bg-green-900/50 text-green-400 transition-colors disabled:opacity-50"
                  >
                    <CheckCircleIcon className="w-4 h-4" />
                    Approve (Keep)
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-1.5 text-sm rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-sm text-gray-400">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1.5 text-sm rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

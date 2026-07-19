"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api-client";
import { Server, Music, Image, Database, RefreshCw, ChevronDown, ChevronUp, type LucideIcon } from "lucide-react";
import { Icon } from "@/components/ui/Icon";

interface MissingSong {
  id: string;
  title: string;
}

interface CacheSection {
  cached: number;
  missing: number;
  percentage: number;
  missingSongs: MissingSong[];
}

interface MirrorHealth {
  totalSongs: number;
  audio: CacheSection;
  covers: CacheSection;
  diskUsage: {
    audioBytes: number;
    coverBytes: number;
    totalBytes: number;
    formatted: string;
  };
  overallHealthPercent: number;
  lastCheckedAt: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function healthColor(percent: number): string {
  if (percent > 95) return "text-green-400";
  if (percent > 80) return "text-yellow-400";
  return "text-red-400";
}

function healthBgColor(percent: number): string {
  if (percent > 95) return "bg-green-500";
  if (percent > 80) return "bg-yellow-500";
  return "bg-red-500";
}

function PercentBar({ percent, label }: { percent: number; label: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-secondary">{label}</span>
        <span className={`text-sm font-medium ${healthColor(percent)}`}>
          {percent}%
        </span>
      </div>
      <div className="w-full h-2 bg-surface-raised rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${healthBgColor(percent)}`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
    </div>
  );
}

function CacheCard({
  title,
  icon: SectionIcon,
  section,
  diskBytes,
}: {
  title: string;
  icon: LucideIcon;
  section: CacheSection;
  diskBytes: number;
}) {
  return (
    <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-3">
        <Icon icon={SectionIcon} className="w-5 h-5 text-secondary" aria-hidden="true" />
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <div className="text-2xl font-bold">{section.cached}</div>
          <div className="text-xs text-muted">Cached</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-secondary">
            {section.cached + section.missing}
          </div>
          <div className="text-xs text-muted">Total</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-secondary">
            {formatBytes(diskBytes)}
          </div>
          <div className="text-xs text-muted">Disk</div>
        </div>
      </div>
      <PercentBar percent={section.percentage} label="Cache coverage" />
    </div>
  );
}

function MissingList({
  title,
  songs,
}: {
  title: string;
  songs: MissingSong[];
}) {
  const [expanded, setExpanded] = useState(false);

  if (songs.length === 0) return null;

  const ChevronIcon = expanded ? ChevronUp : ChevronDown;

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-800/50 transition-colors"
      >
        <span className="font-medium">
          {title}{" "}
          <span className="text-sm text-muted">({songs.length})</span>
        </span>
        <Icon icon={ChevronIcon} className="w-4 h-4 text-secondary" aria-hidden="true" />
      </button>
      {expanded && (
        <div className="border-t border-border max-h-80 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface sticky top-0">
              <tr>
                <th className="text-left px-5 py-2 text-secondary font-medium">
                  Title
                </th>
                <th className="text-left px-5 py-2 text-secondary font-medium">
                  ID
                </th>
              </tr>
            </thead>
            <tbody>
              {songs.map((song) => (
                <tr
                  key={song.id}
                  className="border-t border-border hover:bg-gray-800/30"
                >
                  <td className="px-5 py-2">{song.title}</td>
                  <td className="px-5 py-2 text-muted font-mono text-xs">
                    {song.id}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function AdminMirrorPage() {
  const [data, setData] = useState<MirrorHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recaching, setRecaching] = useState(false);
  const [recacheResult, setRecacheResult] = useState<string | null>(null);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await apiGet("/api/admin/mirror-health"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  const handleRecache = async () => {
    setRecaching(true);
    setRecacheResult(null);
    try {
      const result = await apiPost<{ cached: number; skipped: number; failed: number }>("/api/admin/backfill-images", {});
      setRecacheResult(
        `Cached ${result.cached} new images, ${result.skipped} skipped, ${result.failed} failed`
      );
      fetchHealth();
    } catch (e) {
      setRecacheResult(
        `Error: ${e instanceof Error ? e.message : "Failed"}`
      );
    } finally {
      setRecaching(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-400" />
      </div>
    );
  }

  if (error || !data) {
    return <p className="text-red-400">Failed to load mirror health: {error}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Mirror Health</h1>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted">
            Last checked:{" "}
            {new Date(data.lastCheckedAt).toLocaleTimeString()}
          </span>
          <button
            onClick={fetchHealth}
            className="p-2 rounded-lg text-secondary hover:text-primary hover:bg-surface-hover transition-colors"
            title="Refresh"
          >
            <Icon icon={RefreshCw} className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Overall health */}
      <div className="bg-surface border border-border rounded-xl p-6 flex items-center gap-6">
        <Icon
          icon={Server}
          className="w-10 h-10 text-gray-600 shrink-0"
          aria-hidden="true"
        />
        <div className="flex-1">
          <div className="text-sm text-secondary mb-1">Overall Health</div>
          <div className={`text-5xl font-bold ${healthColor(data.overallHealthPercent)}`}>
            {data.overallHealthPercent}%
          </div>
          <div className="text-sm text-muted mt-1">
            {data.totalSongs} total songs &middot;{" "}
            {data.diskUsage.formatted} on disk
          </div>
        </div>
      </div>

      {/* Cache cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CacheCard
          title="Audio Cache"
          icon={Music}
          section={data.audio}
          diskBytes={data.diskUsage.audioBytes}
        />
        <CacheCard
          title="Cover Cache"
          icon={Image}
          section={data.covers}
          diskBytes={data.diskUsage.coverBytes}
        />
      </div>

      {/* Disk usage summary */}
      <div className="bg-surface border border-border rounded-xl p-5">
        <div className="flex items-center gap-3 mb-3">
          <Icon
            icon={Database}
            className="w-5 h-5 text-secondary"
            aria-hidden="true"
          />
          <h3 className="text-lg font-semibold">Disk Usage</h3>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-xl font-bold">
              {formatBytes(data.diskUsage.audioBytes)}
            </div>
            <div className="text-xs text-muted">Audio</div>
          </div>
          <div>
            <div className="text-xl font-bold">
              {formatBytes(data.diskUsage.coverBytes)}
            </div>
            <div className="text-xs text-muted">Covers</div>
          </div>
          <div>
            <div className="text-xl font-bold">{data.diskUsage.formatted}</div>
            <div className="text-xs text-muted">Total</div>
          </div>
        </div>
      </div>

      {/* Missing items */}
      <MissingList
        title="Missing Audio"
        songs={data.audio.missingSongs}
      />
      <MissingList
        title="Missing Covers"
        songs={data.covers.missingSongs}
      />

      {/* Re-cache button */}
      {(data.covers.missing > 0) && (
        <div className="bg-surface border border-border rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Re-cache Missing Covers</h3>
              <p className="text-sm text-muted mt-1">
                Download and cache {data.covers.missing} missing cover
                {data.covers.missing === 1 ? "" : "s"} from source URLs.
              </p>
            </div>
            <button
              onClick={handleRecache}
              disabled={recaching}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:bg-gray-700 disabled:text-muted rounded-lg text-sm font-medium transition-colors"
            >
              {recaching ? "Caching…" : "Re-cache Covers"}
            </button>
          </div>
          {recacheResult && (
            <p
              className={`text-sm mt-3 ${
                recacheResult.startsWith("Error")
                  ? "text-red-400"
                  : "text-green-400"
              }`}
            >
              {recacheResult}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

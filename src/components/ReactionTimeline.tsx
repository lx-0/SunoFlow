"use client";

import { useMemo, useState } from "react";

export interface ReactionItem {
  id: string;
  emoji: string;
  timestamp: number;
  userId: string;
  username?: string;
}

interface Cluster {
  centerTimestamp: number;
  reactions: ReactionItem[];
  emojiCounts: Record<string, number>;
}

interface ReactionTimelineProps {
  reactions: ReactionItem[];
  duration: number;
}

const CLUSTER_WINDOW_S = 2;

function buildClusters(reactions: ReactionItem[]): Cluster[] {
  if (reactions.length === 0) return [];

  const sorted = [...reactions].sort((a, b) => a.timestamp - b.timestamp);
  const clusters: Cluster[] = [];
  let group: ReactionItem[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const item = sorted[i];
    const windowStart = group[0].timestamp;
    if (item.timestamp - windowStart <= CLUSTER_WINDOW_S) {
      group.push(item);
    } else {
      clusters.push(makeCluster(group));
      group = [item];
    }
  }
  clusters.push(makeCluster(group));
  return clusters;
}

function makeCluster(group: ReactionItem[]): Cluster {
  const centerTimestamp =
    group.reduce((sum, r) => sum + r.timestamp, 0) / group.length;
  const emojiCounts: Record<string, number> = {};
  for (const r of group) {
    emojiCounts[r.emoji] = (emojiCounts[r.emoji] ?? 0) + 1;
  }
  return { centerTimestamp, reactions: group, emojiCounts };
}

function ClusterMarker({
  cluster,
  leftPct,
}: {
  cluster: Cluster;
  leftPct: number;
}) {
  const [open, setOpen] = useState(false);

  const topEmoji = Object.entries(cluster.emojiCounts).sort(
    (a, b) => b[1] - a[1]
  )[0][0];
  const total = cluster.reactions.length;

  return (
    <div
      className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${leftPct}%` }}
    >
      <button
        className="relative flex min-h-[32px] min-w-[32px] items-center justify-center rounded-full bg-black/70 px-1 text-sm leading-none shadow-md backdrop-blur-sm transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        aria-label={`${total} reaction${total > 1 ? "s" : ""} at ${Math.round(cluster.centerTimestamp)}s`}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{topEmoji}</span>
        {total > 1 && (
          <span className="ml-0.5 text-[10px] font-bold text-white/80">
            {total}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 rounded-lg bg-black/90 px-2 py-1.5 text-xs shadow-xl backdrop-blur-sm">
          <div className="flex flex-wrap gap-1">
            {Object.entries(cluster.emojiCounts).map(([emoji, count]) => (
              <span key={emoji} className="whitespace-nowrap text-white">
                {emoji}
                {count > 1 && (
                  <span className="ml-0.5 text-white/60">×{count}</span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function ReactionTimeline({ reactions, duration }: ReactionTimelineProps) {
  const clusters = useMemo(() => buildClusters(reactions), [reactions]);

  if (!duration || clusters.length === 0) return null;

  return (
    <div
      className="relative h-4 w-full"
      aria-label="Reaction timeline"
      role="img"
    >
      {clusters.map((cluster, i) => {
        const leftPct = Math.min(
          99,
          Math.max(1, (cluster.centerTimestamp / duration) * 100)
        );
        return (
          <ClusterMarker key={i} cluster={cluster} leftPct={leftPct} />
        );
      })}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useAsyncForm } from "@/hooks/useAsyncForm";
import Image from "next/image";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { MessageSquare, Trash2, Clock } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { useComments } from "@/hooks/useComments";
import type { Comment, CommentUser } from "@/hooks/useComments";
import { formatRelativeTime } from "@sunoflow/core";

function fmtTimestamp(s: number): string {
  return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
}

function Avatar({ user }: { user: CommentUser }) {
  const initials = (user.name ?? "?").charAt(0).toUpperCase();
  if (user.image) {
    return (
      <Image
        src={user.image}
        alt={user.name ?? "User"}
        width={32}
        height={32}
        className="w-8 h-8 rounded-full object-cover flex-shrink-0"
      />
    );
  }
  return (
    <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center flex-shrink-0">
      <span className="text-xs font-bold text-white">{initials}</span>
    </div>
  );
}

export function CommentsSection({
  songId,
  songOwnerId,
  currentTime,
  duration,
  onSeek,
}: {
  songId: string;
  songOwnerId?: string;
  currentTime?: number;
  duration?: number;
  onSeek?: (seconds: number) => void;
}) {
  const { data: session } = useSession();
  const { comments, pagination, loading, loadingMore, postComment, deleteComment, loadMore } =
    useComments(songId);
  const [draft, setDraft] = useState("");
  const [pendingTimestamp, setPendingTimestamp] = useState<number | null>(null);
  const { execute: submitComment, submitting, error } = useAsyncForm(async () => {
    const text = draft.trim();
    if (!text) return;
    await postComment(text, pendingTimestamp);
    setDraft("");
    setPendingTimestamp(null);
  });

  // Capture current playback position as the pending timestamp
  function captureTimestamp() {
    if (currentTime !== undefined && currentTime > 0) {
      setPendingTimestamp(currentTime);
    }
  }

  function clearTimestamp() {
    setPendingTimestamp(null);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitComment();
  };

  const handleDelete = (commentId: string) => deleteComment(commentId);

  const canAttachTimestamp = currentTime !== undefined && duration !== undefined && duration > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Icon icon={MessageSquare} className="w-4 h-4 text-secondary" />
        <h2 className="text-sm font-semibold text-secondary">
          Comments{pagination ? ` (${pagination.total})` : ""}
        </h2>
      </div>

      {/* Post comment */}
      {session?.user ? (
        <form onSubmit={handleSubmit} className="space-y-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add a comment…"
            rows={2}
            maxLength={500}
            className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm text-primary placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
          />
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              {pendingTimestamp !== null ? (
                <span className="flex items-center gap-1 text-xs bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 px-2 py-0.5 rounded-full">
                  <Icon icon={Clock} className="w-3 h-3" fill="currentColor" />
                  {fmtTimestamp(pendingTimestamp)}
                  <button
                    type="button"
                    onClick={clearTimestamp}
                    className="ml-0.5 text-violet-400 hover:text-violet-600 dark:hover:text-violet-200"
                    aria-label="Remove timestamp"
                  >
                    ×
                  </button>
                </span>
              ) : canAttachTimestamp ? (
                <button
                  type="button"
                  onClick={captureTimestamp}
                  className="flex items-center gap-1 text-xs text-muted hover:text-violet-500 dark:hover:text-violet-400 transition-colors"
                >
                  <Icon icon={Clock} className="w-3 h-3" fill="currentColor" />
                  {currentTime! > 0 ? `@ ${fmtTimestamp(currentTime!)}` : "Attach timestamp"}
                </button>
              ) : null}
              <span className="text-xs text-muted">{draft.length}/500</span>
            </div>
            {error && <p className="text-xs text-red-500 flex-1">{error}</p>}
            <button
              type="submit"
              disabled={submitting || !draft.trim()}
              className="px-4 py-1.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium rounded-lg transition-colors"
            >
              {submitting ? "Posting…" : "Post"}
            </button>
          </div>
        </form>
      ) : (
        <p className="text-sm text-secondary">
          <Link href="/login" className="text-violet-500 hover:underline">Sign in</Link> to leave a comment.
        </p>
      )}

      {/* Comment list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="w-8 h-8 rounded-full bg-surface-raised flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 bg-surface-raised rounded w-24" />
                <div className="h-3 bg-surface-raised rounded w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <p className="text-sm text-muted text-center py-4">No comments yet. Be the first!</p>
      ) : (
        <ul className="space-y-4">
          {comments.map((comment) => (
            <li key={comment.id} className="flex gap-3 group">
              <Avatar user={comment.user} />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-primary">
                    {comment.user.name ?? "Anonymous"}
                  </span>
                  {comment.timestamp !== null && (
                    <button
                      type="button"
                      onClick={() => onSeek?.(comment.timestamp!)}
                      className="flex items-center gap-0.5 text-xs text-violet-500 hover:text-violet-400 font-medium transition-colors"
                      title="Jump to this moment"
                    >
                      <Icon icon={Clock} className="w-3 h-3" fill="currentColor" />
                      {fmtTimestamp(comment.timestamp)}
                    </button>
                  )}
                  <span className="text-xs text-muted">
                    {formatRelativeTime(comment.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-secondary mt-0.5 break-words">
                  {comment.body}
                </p>
              </div>
              {(session?.user?.id === comment.user.id || session?.user?.id === songOwnerId) && (
                <button
                  type="button"
                  onClick={() => handleDelete(comment.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-muted hover:text-red-500 flex-shrink-0 self-start mt-0.5"
                  aria-label="Delete comment"
                >
                  <Icon icon={Trash2} className="w-3.5 h-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Load more */}
      {pagination?.hasMore && (
        <div className="text-center">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="text-xs text-violet-500 hover:text-violet-400 disabled:opacity-50"
          >
            {loadingMore ? "Loading…" : "Load more comments"}
          </button>
        </div>
      )}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { apiDelete, apiGet, apiPost } from "@/lib/api-client";

export interface CommentUser {
  id: string;
  name: string | null;
  image: string | null;
}

export interface Comment {
  id: string;
  body: string;
  timestamp: number | null;
  createdAt: string;
  user: CommentUser;
}

interface Pagination {
  page: number;
  totalPages: number;
  total: number;
  hasMore: boolean;
}

export function useComments(songId: string) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchComments = useCallback(
    async (page: number, append = false) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      try {
        const data = await apiGet<{ comments: Comment[]; pagination: Pagination }>(
          `/api/songs/${songId}/comments?page=${page}`
        );
        setComments((prev) =>
          append ? [...prev, ...data.comments] : data.comments,
        );
        setPagination(data.pagination);
      } catch {
        // ignore
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [songId],
  );

  useEffect(() => {
    fetchComments(1);
  }, [fetchComments]);

  const postComment = useCallback(
    async (body: string, timestamp: number | null) => {
      const data = await apiPost<Comment>(`/api/songs/${songId}/comments`, { body, timestamp });
      setComments((prev) => {
        const next = [data, ...prev];
        return next.sort((a, b) => {
          if (a.timestamp !== null && b.timestamp !== null)
            return a.timestamp - b.timestamp;
          if (a.timestamp !== null) return -1;
          if (b.timestamp !== null) return 1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
      });
      setPagination((prev) =>
        prev ? { ...prev, total: prev.total + 1 } : prev,
      );
    },
    [songId],
  );

  const deleteComment = useCallback(
    async (commentId: string) => {
      try {
        await apiDelete(`/api/songs/${songId}/comments/${commentId}`);
        setComments((prev) => prev.filter((c) => c.id !== commentId));
        setPagination((prev) =>
          prev ? { ...prev, total: Math.max(0, prev.total - 1) } : prev,
        );
      } catch {
        // non-fatal
      }
    },
    [songId],
  );

  const loadMore = useCallback(() => {
    if (pagination?.hasMore) {
      fetchComments(pagination.page + 1, true);
    }
  }, [fetchComments, pagination]);

  return {
    comments,
    pagination,
    loading,
    loadingMore,
    postComment,
    deleteComment,
    loadMore,
  };
}

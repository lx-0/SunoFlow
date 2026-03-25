"use client";

import { useEffect, useState, useCallback } from "react";
import { FlagIcon } from "@heroicons/react/24/outline";
import { FlagIcon as FlagSolidIcon } from "@heroicons/react/24/solid";

interface Song {
  id: string;
  title: string | null;
  generationStatus: string;
  isPublic: boolean;
  isHidden: boolean;
  createdAt: string;
  creator: { id: string; name: string | null; email: string | null };
  pendingReports: number;
}

type Filter = "all" | "flagged" | "public";

export default function AdminContentPage() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [toggling, setToggling] = useState<string | null>(null);

  const fetchSongs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ filter, page: String(page), limit: "20" });
    const res = await fetch(`/api/admin/content?${params}`);
    const data = await res.json();
    setSongs(data.songs);
    setTotalPages(data.totalPages);
    setTotal(data.total);
    setLoading(false);
  }, [filter, page]);

  useEffect(() => {
    fetchSongs();
  }, [fetchSongs]);

  const handleFlag = async (songId: string) => {
    setToggling(songId);
    await fetch(`/api/admin/content/${songId}/flag`, { method: "POST" });
    await fetchSongs();
    setToggling(null);
  };

  const filters: { label: string; value: Filter }[] = [
    { label: "All", value: "all" },
    { label: "Flagged", value: "flagged" },
    { label: "Public", value: "public" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Content</h1>
        <span className="text-sm text-gray-400">{total} items</span>
      </div>

      <div className="flex gap-2">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => {
              setFilter(f.value);
              setPage(1);
            }}
            className={`text-sm px-4 py-2 rounded-lg transition-colors ${
              filter === f.value
                ? "bg-red-900/30 text-red-400"
                : "bg-gray-800 text-gray-400 hover:text-white"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400">
                <th className="text-left px-4 py-3">Title</th>
                <th className="text-left px-4 py-3 hidden sm:table-cell">Creator</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Status</th>
                <th className="text-left px-4 py-3 hidden sm:table-cell">Reports</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Date</th>
                <th className="text-right px-4 py-3">Flag</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : songs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-500">
                    No content found
                  </td>
                </tr>
              ) : (
                songs.map((song) => (
                  <tr
                    key={song.id}
                    className={`border-b border-gray-800/50 hover:bg-gray-800/30 ${
                      song.isHidden ? "opacity-60" : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium">
                        {song.title || "Untitled"}
                        {song.isHidden && (
                          <span className="ml-2 text-xs bg-red-900/40 text-red-400 px-1.5 py-0.5 rounded">
                            hidden
                          </span>
                        )}
                        {song.isPublic && !song.isHidden && (
                          <span className="ml-2 text-xs bg-green-900/40 text-green-400 px-1.5 py-0.5 rounded">
                            public
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-gray-400 text-xs">
                      <div>{song.creator.name || "Unnamed"}</div>
                      <div className="text-gray-600">{song.creator.email}</div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
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
                    <td className="px-4 py-3 hidden sm:table-cell">
                      {song.pendingReports > 0 ? (
                        <span className="text-xs bg-orange-900/30 text-orange-400 px-2 py-1 rounded-full">
                          {song.pendingReports}
                        </span>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-gray-400">
                      {new Date(song.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleFlag(song.id)}
                        disabled={toggling === song.id}
                        title={song.isHidden ? "Unflag (make visible)" : "Flag (hide content)"}
                        className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${
                          song.isHidden
                            ? "text-red-400 hover:bg-red-900/20"
                            : "text-gray-500 hover:text-red-400 hover:bg-red-900/20"
                        }`}
                      >
                        {song.isHidden ? (
                          <FlagSolidIcon className="w-4 h-4" />
                        ) : (
                          <FlagIcon className="w-4 h-4" />
                        )}
                      </button>
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

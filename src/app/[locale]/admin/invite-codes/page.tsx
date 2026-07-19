"use client";

import { useEffect, useState } from "react";
import { Ticket, Clipboard, Check } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { apiGet, apiPost } from "@/lib/api-client";
import { HttpError } from "@/components/QueryProvider";

interface InviteCode {
  id: string;
  code: string;
  note: string | null;
  expiresAt: string | null;
  usedAt: string | null;
  createdAt: string;
  usedByUser: { email: string | null; name: string | null } | null;
}

function statusOf(c: InviteCode): { label: string; className: string } {
  if (c.usedByUser) return { label: "Used", className: "bg-gray-700 text-gray-300" };
  if (c.expiresAt && new Date(c.expiresAt).getTime() < Date.now())
    return { label: "Expired", className: "bg-red-900/50 text-red-300" };
  return { label: "Available", className: "bg-green-900/50 text-green-300" };
}

export default function InviteCodesPage() {
  const [codes, setCodes] = useState<InviteCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [count, setCount] = useState(1);
  const [note, setNote] = useState("");
  const [expiresInDays, setExpiresInDays] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await apiGet<{ codes: InviteCode[] }>("/api/admin/invite-codes");
      setCodes(data.codes ?? []);
    } catch {
      setError("Failed to load invite codes");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setGenerating(true);
    try {
      await apiPost("/api/admin/invite-codes", {
        count,
        note: note.trim() || undefined,
        expiresInDays: expiresInDays ? Number(expiresInDays) : undefined,
      });
      setNote("");
      setExpiresInDays("");
      setCount(1);
      await load();
    } catch (err) {
      setError(err instanceof HttpError ? err.message : "Failed to generate codes");
    } finally {
      setGenerating(false);
    }
  }

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      setError("Clipboard not available");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Icon icon={Ticket} className="w-6 h-6 text-violet-400" />
        <h1 className="text-2xl font-bold">Invite Codes</h1>
      </div>
      <p className="text-sm text-secondary">
        Single-use codes required for self-serve registration during closed beta. Admin emails bypass the gate.
      </p>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <form onSubmit={handleGenerate} className="bg-surface border border-border rounded-xl p-5 space-y-4">
        <h2 className="text-lg font-semibold">Generate codes</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="count" className="block text-sm text-secondary mb-1">Count</label>
            <input
              id="count"
              type="number"
              min={1}
              max={50}
              value={count}
              onChange={(e) => setCount(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
              className="w-full px-3 py-2 rounded-lg bg-surface-raised border border-border text-primary focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div>
            <label htmlFor="note" className="block text-sm text-secondary mb-1">Note (optional)</label>
            <input
              id="note"
              type="text"
              maxLength={200}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. for @friend"
              className="w-full px-3 py-2 rounded-lg bg-surface-raised border border-border text-primary focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div>
            <label htmlFor="expiresInDays" className="block text-sm text-secondary mb-1">Expires in (days, optional)</label>
            <input
              id="expiresInDays"
              type="number"
              min={1}
              max={365}
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(e.target.value)}
              placeholder="never"
              className="w-full px-3 py-2 rounded-lg bg-surface-raised border border-border text-primary focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={generating}
          className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:bg-violet-800 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
        >
          {generating ? "Generating…" : "Generate"}
        </button>
      </form>

      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-violet-400" />
          </div>
        ) : codes.length === 0 ? (
          <p className="text-muted text-sm p-5">No invite codes yet. Generate one above.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-secondary border-b border-border">
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Note</th>
                <th className="px-4 py-3 font-medium">Used by</th>
                <th className="px-4 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {codes.map((c) => {
                const status = statusOf(c);
                return (
                  <tr key={c.id} className="border-b border-gray-800/60 last:border-0">
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => copyCode(c.code)}
                        className="inline-flex items-center gap-2 font-mono tracking-wider text-primary hover:text-violet-300"
                        title="Copy to clipboard"
                      >
                        {c.code}
                        {copied === c.code ? (
                          <Icon icon={Check} className="w-4 h-4 text-green-400" />
                        ) : (
                          <Icon icon={Clipboard} className="w-4 h-4 text-muted" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${status.className}`}>{status.label}</span>
                    </td>
                    <td className="px-4 py-3 text-secondary">{c.note ?? "—"}</td>
                    <td className="px-4 py-3 text-secondary">
                      {c.usedByUser ? (c.usedByUser.email ?? c.usedByUser.name ?? "—") : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted">{new Date(c.createdAt).toLocaleDateString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { TrashIcon, PencilIcon, CheckIcon, XMarkIcon, ArrowDownTrayIcon, UserCircleIcon, Cog6ToothIcon, ShieldCheckIcon, ChartBarIcon, ExclamationTriangleIcon, CommandLineIcon, ClipboardDocumentIcon, LockClosedIcon } from "@heroicons/react/24/outline";
import { canUseFeature, type SubscriptionTier } from "@/lib/feature-gates";
import { Toast, FieldError } from "./ui";
import { useAutoDismissToast } from "./use-auto-dismiss-toast";
import { ApiKeySection, PersonalApiKeysSection } from "./api-key-sections";
import { OnboardingSection, ExportDataSection } from "./account-info-sections";
import { ProfileTab } from "./profile-tab";
import { PreferencesTab } from "./preferences-tab";

type Tab = "profile" | "preferences" | "account";

function PersonalApiKeysSectionGated() {
  const { data: session } = useSession();
  const tier = ((session?.user as unknown as Record<string, unknown>)?.subscriptionTier as SubscriptionTier) ?? "free";
  const allowed = canUseFeature("apiKeys", tier);

  if (!allowed) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <LockClosedIcon className="w-4 h-4 text-violet-500" />
          Personal API Keys
          <span className="ml-1 px-1.5 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Studio</span>
        </h3>
        <div className="flex flex-col gap-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-sm">
          <p className="text-gray-600 dark:text-gray-400">
            Generate API keys to integrate SunoFlow into your own applications.
            Available on the <span className="font-semibold text-gray-900 dark:text-white">Studio</span> plan.
          </p>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-1.5 self-start px-3 py-1.5 rounded-lg text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white transition-colors"
          >
            Upgrade to Studio
          </Link>
        </div>
      </div>
    );
  }

  return <PersonalApiKeysSection />;
}

function AccountTab() {
  return (
    <div className="space-y-6">
      <PasswordSection />
      <div className="border-t border-gray-200 dark:border-gray-800" />
      <ApiKeySection />
      <div className="border-t border-gray-200 dark:border-gray-800" />
      <PersonalApiKeysSectionGated />
      <div className="border-t border-gray-200 dark:border-gray-800" />
      <AgentSkillSection />
      <div className="border-t border-gray-200 dark:border-gray-800" />
      <RateLimitSection />
      <div className="border-t border-gray-200 dark:border-gray-800" />
      <OnboardingSection />
      <div className="border-t border-gray-200 dark:border-gray-800" />
      <ExportDataSection />
      <div className="border-t border-gray-200 dark:border-gray-800" />
      <TagManagementSection />
      <div className="border-t border-gray-200 dark:border-gray-800" />
      <DeleteAccountSection />
    </div>
  );
}

function PasswordSection() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const { toast, showToast } = useAutoDismissToast();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!currentPassword) errs.currentPassword = "Current password is required";
    if (!newPassword) errs.newPassword = "New password is required";
    else if (newPassword.length < 8) errs.newPassword = "Must be at least 8 characters";
    if (!confirmPassword) errs.confirmPassword = "Please confirm your password";
    else if (newPassword !== confirmPassword) errs.confirmPassword = "Passwords do not match";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setPwLoading(true);
    try {
      const res = await fetch("/api/profile/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error ?? "Failed to change password", "error");
      } else {
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setErrors({});
        showToast("Password changed successfully", "success");
      }
    } catch {
      showToast("Network error", "error");
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} />}
      <section className="space-y-3">
        <div>
          <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200">Change Password</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Update your account password.</p>
        </div>
        <form onSubmit={handlePasswordChange} className="space-y-2">
          <div>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => { setCurrentPassword(e.target.value); setErrors((p) => ({ ...p, currentPassword: "" })); }}
              placeholder="Current password"
              autoComplete="current-password"
              className={`w-full bg-white dark:bg-gray-900 border rounded-lg px-3 py-2 text-base text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent ${
                errors.currentPassword ? "border-red-500" : "border-gray-300 dark:border-gray-700"
              }`}
            />
            <FieldError error={errors.currentPassword} />
          </div>
          <div>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => { setNewPassword(e.target.value); setErrors((p) => ({ ...p, newPassword: "" })); }}
              placeholder="New password (min 8 chars)"
              autoComplete="new-password"
              className={`w-full bg-white dark:bg-gray-900 border rounded-lg px-3 py-2 text-base text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent ${
                errors.newPassword ? "border-red-500" : "border-gray-300 dark:border-gray-700"
              }`}
            />
            <FieldError error={errors.newPassword} />
          </div>
          <div>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setErrors((p) => ({ ...p, confirmPassword: "" })); }}
              placeholder="Confirm new password"
              autoComplete="new-password"
              className={`w-full bg-white dark:bg-gray-900 border rounded-lg px-3 py-2 text-base text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent ${
                errors.confirmPassword ? "border-red-500" : "border-gray-300 dark:border-gray-700"
              }`}
            />
            <FieldError error={errors.confirmPassword} />
          </div>
          <button
            type="submit"
            disabled={pwLoading}
            className="w-full py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
          >
            {pwLoading ? "Updating..." : "Update password"}
          </button>
        </form>
      </section>
    </>
  );
}

function AgentSkillSection() {
  const [copied, setCopied] = useState(false);

  const installCommand = "claude skill add --url /api/agent-skill";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(installCommand);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: do nothing
    }
  };

  const handleDownload = () => {
    window.location.href = "/api/agent-skill";
  };

  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
          <CommandLineIcon className="w-5 h-5 text-violet-500" />
          Connect Your Agent
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          Let AI agents (like Claude Code) manage your music library, generate songs, and organize playlists using the SunoFlow API.
        </p>
      </div>

      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-3 border border-gray-200 dark:border-gray-700">
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">1. Download the Claude Code skill file</p>
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-violet-600 text-white hover:bg-violet-700 transition-colors min-h-[44px]"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            Download Claude Skill
          </button>
        </div>

        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">2. Or install directly via CLI</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-gray-900 dark:bg-gray-950 text-green-400 text-xs px-3 py-2.5 rounded-lg font-mono overflow-x-auto">
              {installCommand}
            </code>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-3 py-2.5 rounded-lg text-sm font-medium border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors min-h-[44px]"
            >
              {copied ? (
                <>
                  <CheckIcon className="w-4 h-4 text-green-500" />
                  Copied
                </>
              ) : (
                <>
                  <ClipboardDocumentIcon className="w-4 h-4" />
                  Copy
                </>
              )}
            </button>
          </div>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400">
          Make sure you have an API key created above. See the{" "}
          <a
            href="https://docs.anthropic.com/en/docs/claude-code"
            target="_blank"
            rel="noopener noreferrer"
            className="text-violet-600 dark:text-violet-400 hover:underline"
          >
            Claude Code docs
          </a>{" "}
          for setup help.
        </p>
      </div>
    </section>
  );
}

function RateLimitSection() {
  const [data, setData] = useState<{
    remaining: number;
    limit: number;
    used: number;
    percentUsed: number;
    resetAt: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/rate-limit/status")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <section className="space-y-3">
        <div className="h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
      </section>
    );
  }

  if (!data) return null;

  const resetDate = data.resetAt ? new Date(data.resetAt) : null;
  const barColor = data.percentUsed >= 90 ? "bg-red-500" : data.percentUsed >= 70 ? "bg-yellow-500" : "bg-violet-500";

  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200">Rate Limits</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Your current API usage and limits.</p>
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ChartBarIcon className="w-4 h-4 text-gray-400 dark:text-gray-500" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">Generations</span>
          </div>
          <span className="text-sm text-gray-600 dark:text-gray-300">
            {data.used} / {data.limit}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${barColor}`}
            style={{ width: `${Math.min(data.percentUsed, 100)}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>{data.remaining} remaining</span>
          {resetDate && (
            <span>Resets {resetDate.toLocaleDateString()} {resetDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
          )}
        </div>

        {data.percentUsed >= 90 && (
          <div className="flex items-center gap-2 text-xs text-red-500 dark:text-red-400">
            <ExclamationTriangleIcon className="w-4 h-4 flex-shrink-0" />
            <span>You&apos;re running low on generations. Consider waiting for the reset.</span>
          </div>
        )}
      </div>
    </section>
  );
}

function DeleteAccountSection() {
  const { data: session } = useSession();
  const [showForm, setShowForm] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [deleting, setDeleting] = useState(false);
  const { toast, showToast } = useAutoDismissToast();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!password) errs.password = "Password is required";
    if (!confirmEmail) errs.confirmEmail = "Please confirm your email";
    else if (confirmEmail !== session?.user?.email) errs.confirmEmail = "Email does not match your account";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setDeleting(true);
    try {
      const res = await fetch("/api/profile", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, confirmEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error ?? "Failed to delete account", "error");
      } else {
        // Redirect to home after deletion
        window.location.href = "/";
      }
    } catch {
      showToast("Network error", "error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} />}
      <section className="space-y-3">
        <div>
          <h3 className="text-base font-semibold text-red-600 dark:text-red-400">Delete Account</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Permanently delete your account and all associated data. This cannot be undone.
          </p>
        </div>

        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-lg transition-colors min-h-[44px]"
          >
            Delete my account
          </button>
        ) : (
          <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm text-red-700 dark:text-red-300 font-medium">
              <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0" />
              This will permanently delete all your songs, playlists, and data.
            </div>
            <form onSubmit={handleDelete} className="space-y-2">
              <div>
                <input
                  type="email"
                  value={confirmEmail}
                  onChange={(e) => { setConfirmEmail(e.target.value); setErrors((p) => ({ ...p, confirmEmail: "" })); }}
                  placeholder="Type your email to confirm"
                  autoComplete="off"
                  className={`w-full bg-white dark:bg-gray-900 border rounded-lg px-3 py-2 text-base text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent ${
                    errors.confirmEmail ? "border-red-500" : "border-gray-300 dark:border-gray-700"
                  }`}
                />
                <FieldError error={errors.confirmEmail} />
              </div>
              <div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: "" })); }}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className={`w-full bg-white dark:bg-gray-900 border rounded-lg px-3 py-2 text-base text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent ${
                    errors.password ? "border-red-500" : "border-gray-300 dark:border-gray-700"
                  }`}
                />
                <FieldError error={errors.password} />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={deleting}
                  className="flex-1 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {deleting ? "Deleting..." : "Permanently delete account"}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setPassword(""); setConfirmEmail(""); setErrors({}); }}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </section>
    </>
  );
}

interface TagItem {
  id: string;
  name: string;
  color: string;
  _count: { songTags: number };
}

function TagManagementSection() {
  const [tags, setTags] = useState<TagItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const { toast, showToast } = useAutoDismissToast();
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/tags")
      .then((r) => r.json())
      .then((data) => { if (data.tags) setTags(data.tags); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function startEdit(tag: TagItem) {
    setEditingId(tag.id);
    setEditName(tag.name);
    setEditColor(tag.color);
  }

  async function saveEdit(tagId: string) {
    try {
      const res = await fetch(`/api/tags/${tagId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim(), color: editColor }),
      });
      if (!res.ok) {
        const data = await res.json();
        showToast(data.error ?? "Failed to update tag", "error");
        return;
      }
      const data = await res.json();
      setTags((prev) => prev.map((t) => (t.id === tagId ? { ...t, name: data.tag.name, color: data.tag.color } : t)));
      setEditingId(null);
      showToast("Tag updated", "success");
    } catch {
      showToast("Network error", "error");
    }
  }

  async function deleteTag(tagId: string) {
    try {
      const res = await fetch(`/api/tags/${tagId}`, { method: "DELETE" });
      if (!res.ok) {
        showToast("Failed to delete tag", "error");
        return;
      }
      setTags((prev) => prev.filter((t) => t.id !== tagId));
      setDeleteConfirm(null);
      showToast("Tag deleted", "success");
    } catch {
      showToast("Network error", "error");
    }
  }

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} />}
      <section className="space-y-3">
        <div>
          <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200">Tags</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Manage your song tags. Rename, recolor, or delete tags here.
          </p>
        </div>

        {loading ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
        ) : tags.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No tags yet. Add tags from any song detail page.</p>
        ) : (
          <ul className="space-y-2">
            {tags.map((tag) => (
              <li
                key={tag.id}
                className="flex items-center gap-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2"
              >
                {editingId === tag.id ? (
                  <>
                    <input
                      type="color"
                      value={editColor}
                      onChange={(e) => setEditColor(e.target.value)}
                      className="w-6 h-6 rounded border-0 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") saveEdit(tag.id); if (e.key === "Escape") setEditingId(null); }}
                      className="flex-1 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-2 py-1 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-violet-500"
                      autoFocus
                    />
                    <button onClick={() => saveEdit(tag.id)} className="min-w-[44px] min-h-[44px] flex items-center justify-center text-green-500 hover:text-green-400" aria-label="Save">
                      <CheckIcon className="w-4 h-4" />
                    </button>
                    <button onClick={() => setEditingId(null)} className="min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300" aria-label="Cancel">
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color }} />
                    <span className="flex-1 text-sm text-gray-900 dark:text-white">{tag.name}</span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">{tag._count.songTags} song{tag._count.songTags !== 1 ? "s" : ""}</span>
                    <button onClick={() => startEdit(tag)} className="min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-violet-400 transition-colors" aria-label="Edit tag">
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    {deleteConfirm === tag.id ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => deleteTag(tag.id)} className="text-xs text-red-500 hover:text-red-400 min-h-[44px] px-2">Delete</button>
                        <button onClick={() => setDeleteConfirm(null)} className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 min-h-[44px] px-2">Cancel</button>
                      </div>
                    ) : (
                      <button onClick={() => setDeleteConfirm(tag.id)} className="min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-red-400 transition-colors" aria-label="Delete tag">
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

// ─── Main Settings Page ───

const tabs: { key: Tab; label: string; icon: typeof UserCircleIcon }[] = [
  { key: "profile", label: "Profile", icon: UserCircleIcon },
  { key: "preferences", label: "Preferences", icon: Cog6ToothIcon },
  { key: "account", label: "Account", icon: ShieldCheckIcon },
];

function SettingsContent() {
  const [activeTab, setActiveTab] = useState<Tab>("profile");

  return (
    <div className="px-4 py-6 space-y-6">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white">Settings</h2>

      {/* Tab navigation */}
      <div className="flex border-b border-gray-200 dark:border-gray-800 overflow-x-auto">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors min-h-[44px] ${
              activeTab === key
                ? "border-violet-600 text-violet-600 dark:text-violet-400 dark:border-violet-400"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === "profile" && <ProfileTab />}
        {activeTab === "preferences" && <PreferencesTab />}
        {activeTab === "account" && <AccountTab />}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <AppShell>
      <SettingsContent />
    </AppShell>
  );
}

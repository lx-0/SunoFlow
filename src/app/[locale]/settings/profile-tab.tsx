"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { CircleUserRound } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { validateProfile } from "@/lib/settings/profile-validation";
import { apiGet, apiPatch } from "@/lib/api-client";
import { ConnectedAccountsSection, SubscriptionSummarySection } from "./account-info-sections";
import { FieldError, Toast } from "./ui";
import { useAutoDismissToast } from "./use-auto-dismiss-toast";

interface ProfileSong {
  id: string;
  title: string | null;
}

export function ProfileTab() {
  const { data: session, update: updateSession } = useSession();
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [featuredSongId, setFeaturedSongId] = useState("");
  const [songs, setSongs] = useState<ProfileSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast, showToast } = useAutoDismissToast();
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    Promise.all([
      apiGet<{ name?: string; username?: string; bio?: string; avatarUrl?: string; bannerUrl?: string; featuredSongId?: string }>("/api/profile"),
      apiGet<{ songs: ProfileSong[] }>("/api/songs?limit=50").catch(() => ({ songs: [] })),
    ])
      .then(([profile, songsData]) => {
        setDisplayName(profile.name ?? "");
        setUsername(profile.username ?? "");
        setBio(profile.bio ?? "");
        setAvatarUrl(profile.avatarUrl ?? "");
        setBannerUrl(profile.bannerUrl ?? "");
        setFeaturedSongId(profile.featuredSongId ?? "");
        setSongs(songsData.songs ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const validate = useCallback(() => {
    const errs = validateProfile({ displayName, bio, avatarUrl, bannerUrl, username });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [displayName, bio, avatarUrl, bannerUrl, username]);

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const data = await apiPatch<{ name?: string }>("/api/profile", {
        name: displayName.trim(),
        username: username.trim().toLowerCase() || null,
        bio: bio.trim() || null,
        avatarUrl: avatarUrl.trim() || null,
        bannerUrl: bannerUrl.trim() || null,
        featuredSongId: featuredSongId || null,
      });
      await updateSession({ name: data.name });
      showToast("Profile saved", "success");
    } catch {
      showToast("Network error", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
        <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
      </div>
    );
  }

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} />}
      <div className="space-y-6">
        <section className="space-y-3">
          <h3 className="text-base font-semibold text-primary">Profile Picture</h3>
          <div className="flex items-center gap-4">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt="Avatar"
                width={64}
                height={64}
                className="rounded-full object-cover border-2 border-border"
                unoptimized
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                <Icon icon={CircleUserRound} className="w-10 h-10 text-violet-400" />
              </div>
            )}
            <div className="flex-1 space-y-1">
              <label className="text-xs text-secondary">Avatar URL</label>
              <input
                type="url"
                value={avatarUrl}
                onChange={(e) => {
                  setAvatarUrl(e.target.value);
                  setErrors((p) => ({ ...p, avatarUrl: "" }));
                }}
                placeholder="https://example.com/avatar.jpg"
                className={`w-full bg-surface-raised border rounded-lg px-3 py-2 text-sm text-primary placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent ${
                  errors.avatarUrl ? "border-red-500" : "border-border"
                }`}
              />
              <FieldError error={errors.avatarUrl} />
            </div>
          </div>
        </section>

        <div className="border-t border-border" />

        <section className="space-y-3">
          <h3 className="text-base font-semibold text-primary">Display Name</h3>
          <div className="space-y-1">
            <input
              type="text"
              value={displayName}
              onChange={(e) => {
                setDisplayName(e.target.value);
                setErrors((p) => ({ ...p, displayName: "" }));
              }}
              placeholder="Your name"
              className={`w-full bg-surface-raised border rounded-lg px-3 py-2 text-base text-primary placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent ${
                errors.displayName ? "border-red-500" : "border-border"
              }`}
            />
            <FieldError error={errors.displayName} />
          </div>
        </section>

        <div className="border-t border-border" />

        <section className="space-y-3">
          <h3 className="text-base font-semibold text-primary">Username</h3>
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <span className="text-sm text-muted flex-shrink-0">/u/</span>
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value.toLowerCase());
                  setErrors((p) => ({ ...p, username: "" }));
                }}
                placeholder="yourhandle"
                maxLength={30}
                className={`flex-1 bg-surface-raised border rounded-lg px-3 py-2 text-base text-primary placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent ${
                  errors.username ? "border-red-500" : "border-border"
                }`}
              />
            </div>
            <p className="text-xs text-muted">Lowercase letters, numbers, and underscores only.</p>
            <FieldError error={errors.username} />
          </div>
        </section>

        <div className="border-t border-border" />

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-primary">Bio</h3>
            <span className={`text-xs ${bio.length > 500 ? "text-red-500" : "text-muted"}`}>
              {bio.length}/500
            </span>
          </div>
          <div className="space-y-1">
            <textarea
              value={bio}
              onChange={(e) => {
                setBio(e.target.value);
                setErrors((p) => ({ ...p, bio: "" }));
              }}
              placeholder="Tell others about yourself..."
              rows={3}
              className={`w-full bg-surface-raised border rounded-lg px-3 py-2 text-base text-primary placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none ${
                errors.bio ? "border-red-500" : "border-border"
              }`}
            />
            <FieldError error={errors.bio} />
          </div>
        </section>

        <div className="border-t border-border" />

        <section className="space-y-3">
          <h3 className="text-base font-semibold text-primary">Profile Banner</h3>
          {bannerUrl && (
            <div className="w-full h-20 rounded-lg overflow-hidden bg-surface-raised">
              <Image
                src={bannerUrl}
                alt="Banner preview"
                width={600}
                height={80}
                className="w-full h-full object-cover"
                unoptimized
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
          )}
          <div className="space-y-1">
            <label className="text-xs text-secondary">Banner URL</label>
            <input
              type="url"
              value={bannerUrl}
              onChange={(e) => {
                setBannerUrl(e.target.value);
                setErrors((p) => ({ ...p, bannerUrl: "" }));
              }}
              placeholder="https://example.com/banner.jpg"
              className={`w-full bg-surface-raised border rounded-lg px-3 py-2 text-sm text-primary placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent ${
                errors.bannerUrl ? "border-red-500" : "border-border"
              }`}
            />
            <FieldError error={errors.bannerUrl} />
          </div>
        </section>

        <div className="border-t border-border" />

        {songs.length > 0 && (
          <>
            <section className="space-y-3">
              <h3 className="text-base font-semibold text-primary">Featured Song</h3>
              <p className="text-xs text-secondary">Pin one of your public songs to the top of your profile.</p>
              <select
                value={featuredSongId}
                onChange={(e) => setFeaturedSongId(e.target.value)}
                className="w-full bg-surface-raised border border-border rounded-lg px-3 py-2 text-base text-primary focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              >
                <option value="">None</option>
                {songs.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title ?? "Untitled"}
                  </option>
                ))}
              </select>
            </section>

            <div className="border-t border-border" />
          </>
        )}

        <section className="space-y-3">
          <h3 className="text-base font-semibold text-primary">Email</h3>
          <input
            type="email"
            value={session?.user?.email ?? ""}
            readOnly
            className="w-full bg-surface-raised border border-border rounded-lg px-3 py-2 text-base text-secondary cursor-not-allowed"
          />
          <p className="text-xs text-muted">Email cannot be changed.</p>
        </section>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors min-h-[44px]"
        >
          {saving ? "Saving..." : "Save Profile"}
        </button>

        {username && (
          <div className="text-center">
            <Link href={`/u/${username}`} className="text-sm text-violet-500 hover:text-violet-400 transition-colors">
              View public profile →
            </Link>
          </div>
        )}

        <div className="border-t border-border" />

        <ConnectedAccountsSection />

        <div className="border-t border-border" />

        <SubscriptionSummarySection />
      </div>
    </>
  );
}

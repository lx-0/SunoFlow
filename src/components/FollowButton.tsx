"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { UserPlus, UserMinus } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { apiPost, apiDelete } from "@/lib/api-client";

interface FollowButtonProps {
  userId: string;
  initialIsFollowing?: boolean;
  onFollowChange?: (isFollowing: boolean) => void;
}

export function FollowButton({
  userId,
  initialIsFollowing = false,
  onFollowChange,
}: FollowButtonProps) {
  const { data: session, status } = useSession();
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [loading, setLoading] = useState(false);

  // Don't show the button for the current user's own profile
  if (session?.user?.id === userId) return null;

  if (status === "unauthenticated") {
    return (
      <Link
        href="/login"
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-violet-500 text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-colors"
      >
        <Icon icon={UserPlus} className="w-3.5 h-3.5" />
        Follow
      </Link>
    );
  }

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);
    const newState = !isFollowing;
    try {
      if (newState) {
        await apiPost(`/api/users/${userId}/follow`, {});
      } else {
        await apiDelete(`/api/users/${userId}/follow`);
      }
      setIsFollowing(newState);
      onFollowChange?.(newState);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors disabled:opacity-50 ${
        isFollowing
          ? "border-border-strong text-secondary hover:border-red-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20"
          : "border-violet-500 text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-950/30"
      }`}
      aria-label={isFollowing ? "Unfollow" : "Follow"}
    >
      {isFollowing ? (
        <>
          <Icon icon={UserMinus} className="w-3.5 h-3.5" />
          Following
        </>
      ) : (
        <>
          <Icon icon={UserPlus} className="w-3.5 h-3.5" />
          Follow
        </>
      )}
    </button>
  );
}

"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { UserPlusIcon, UserMinusIcon } from "@heroicons/react/24/outline";

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
        <UserPlusIcon className="w-3.5 h-3.5" />
        Follow
      </Link>
    );
  }

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);
    const newState = !isFollowing;
    try {
      const res = await fetch(`/api/users/${userId}/follow`, {
        method: newState ? "POST" : "DELETE",
      });
      if (res.ok) {
        setIsFollowing(newState);
        onFollowChange?.(newState);
      }
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
          ? "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-red-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20"
          : "border-violet-500 text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-950/30"
      }`}
      aria-label={isFollowing ? "Unfollow" : "Follow"}
    >
      {isFollowing ? (
        <>
          <UserMinusIcon className="w-3.5 h-3.5" />
          Following
        </>
      ) : (
        <>
          <UserPlusIcon className="w-3.5 h-3.5" />
          Follow
        </>
      )}
    </button>
  );
}

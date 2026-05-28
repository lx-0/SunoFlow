"use client";

import { useState } from "react";
import Image from "next/image";
import {
  UserGroupIcon,
  UserPlusIcon,
  LinkIcon,
} from "@heroicons/react/24/outline";
import type { PlaylistCollaboratorItem } from "./types";

interface PlaylistCollaboratorsPanelProps {
  playlistId: string;
  isCollaborative: boolean;
  isTogglingCollab: boolean;
  collaborators: PlaylistCollaboratorItem[];
  onToggleCollaborative: () => void;
  onRemoveCollaborator: (collaboratorId: string) => void;
  onInviteByUsername: (username: string, role: "editor" | "viewer") => Promise<void>;
  onGenerateInvite: () => void;
  isGeneratingInvite: boolean;
  inviteLink: string | null;
  onCopyInviteLink: () => void;
}

export function PlaylistCollaboratorsPanel({
  isCollaborative,
  isTogglingCollab,
  collaborators,
  onToggleCollaborative,
  onRemoveCollaborator,
  onInviteByUsername,
  onGenerateInvite,
  isGeneratingInvite,
  inviteLink,
  onCopyInviteLink,
}: PlaylistCollaboratorsPanelProps) {
  const [inviteUsername, setInviteUsername] = useState("");
  const [inviteRole, setInviteRole] = useState<"editor" | "viewer">("editor");
  const [isInviting, setIsInviting] = useState(false);

  async function handleSubmitInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteUsername.trim() || isInviting) return;
    setIsInviting(true);
    try {
      await onInviteByUsername(inviteUsername.trim(), inviteRole);
      setInviteUsername("");
    } finally {
      setIsInviting(false);
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UserGroupIcon className={`w-4 h-4 ${isCollaborative ? "text-violet-500" : "text-gray-400 dark:text-gray-500"}`} />
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {isCollaborative ? "Collaborative mode on" : "Collaborative mode off"}
          </span>
        </div>
        <button
          onClick={onToggleCollaborative}
          disabled={isTogglingCollab}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900 disabled:opacity-50 ${
            isCollaborative ? "bg-violet-600" : "bg-gray-400 dark:bg-gray-600"
          }`}
          role="switch"
          aria-checked={isCollaborative}
          aria-label="Toggle collaborative mode"
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              isCollaborative ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {isCollaborative && (
        <div className="space-y-3">
          <form onSubmit={handleSubmitInvite} className="space-y-2">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Invite by username</p>
            <div className="flex gap-2">
              <input
                type="text"
                aria-label="Username to invite"
                placeholder="@username"
                value={inviteUsername}
                onChange={(e) => setInviteUsername(e.target.value)}
                className="flex-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-700 dark:text-gray-300 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
              <select
                aria-label="Collaborator role"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as "editor" | "viewer")}
                className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-2 text-xs text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-violet-500"
              >
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </select>
              <button
                type="submit"
                disabled={!inviteUsername.trim() || isInviting}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-violet-600 hover:bg-violet-500 rounded-lg transition-colors disabled:opacity-50"
              >
                <UserPlusIcon className="w-3.5 h-3.5" />
                {isInviting ? "Adding..." : "Add"}
              </button>
            </div>
          </form>

          <div className="space-y-2">
            <button
              onClick={onGenerateInvite}
              disabled={isGeneratingInvite}
              className="flex items-center gap-2 text-sm font-medium text-violet-600 dark:text-violet-400 hover:text-violet-500 transition-colors disabled:opacity-50"
            >
              <LinkIcon className="w-4 h-4" />
              {isGeneratingInvite ? "Generating..." : "Generate invite link"}
            </button>

            {inviteLink && (
              <div className="flex gap-2">
                <input
                  readOnly
                  aria-label="Invite link"
                  value={inviteLink}
                  className="flex-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
                <button
                  onClick={onCopyInviteLink}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-lg hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-colors whitespace-nowrap"
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                  Copy
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {isCollaborative && collaborators.filter((c) => c.user).length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Current collaborators</p>
          {collaborators.filter((c) => c.user).map((c) => (
            <div key={c.id} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-violet-100 dark:bg-violet-900 flex items-center justify-center text-xs font-medium text-violet-700 dark:text-violet-300 overflow-hidden flex-shrink-0">
                  {(c.user?.avatarUrl ?? c.user?.image) ? (
                    <Image
                      src={(c.user?.avatarUrl ?? c.user?.image)!}
                      alt={c.user?.name ?? ""}
                      width={28}
                      height={28}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    (c.user?.name?.[0] ?? "?").toUpperCase()
                  )}
                </div>
                <div>
                  <span className="text-sm text-gray-900 dark:text-white">{c.user?.name ?? "Unknown"}</span>
                  <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-medium ${c.role === "viewer" ? "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400" : "bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400"}`}>
                    {c.role ?? "editor"}
                  </span>
                </div>
              </div>
              <button
                onClick={() => onRemoveCollaborator(c.id)}
                aria-label={`Remove ${c.user?.name ?? "collaborator"}`}
                className="text-xs text-red-500 hover:text-red-600 transition-colors"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

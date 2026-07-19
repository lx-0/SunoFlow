"use client";

import Image from "next/image";
import { Link, UserPlus, UsersRound } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import type { PlaylistCollaboratorItem } from "@/hooks/usePlaylistCollaboration";

interface CollaborativePanelProps {
  collab: {
    isCollaborative: boolean;
    collaborators: PlaylistCollaboratorItem[];
    showCollabPanel: boolean;
    isTogglingCollab: boolean;
    handleToggleCollaborative: () => void;
    inviteUsername: string;
    setInviteUsername: (v: string) => void;
    inviteRole: "editor" | "viewer";
    setInviteRole: (v: "editor" | "viewer") => void;
    isInvitingByUsername: boolean;
    handleInviteByUsername: (e: React.FormEvent) => void;
    inviteLink: string | null;
    isGeneratingInvite: boolean;
    handleGenerateInvite: () => void;
    handleCopyInviteLink: () => void;
    handleRemoveCollaborator: (id: string) => void;
  };
  isEditing: boolean;
  isOwner: boolean;
}

export function CollaboratorAvatars({
  collaborators,
  isCollaborative,
  isEditing,
}: {
  collaborators: PlaylistCollaboratorItem[];
  isCollaborative: boolean;
  isEditing: boolean;
}) {
  const withUser = collaborators.filter((c) => c.user);
  if (!isCollaborative || withUser.length === 0 || isEditing) return null;

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-secondary">Collaborators:</span>
      <div className="flex -space-x-2">
        {withUser.slice(0, 5).map((c) => (
          <div
            key={c.id}
            title={c.user?.name ?? "Collaborator"}
            className="w-7 h-7 rounded-full bg-violet-200 dark:bg-violet-800 border-2 border-surface-deep overflow-hidden flex items-center justify-center text-xs font-medium text-violet-700 dark:text-violet-300 flex-shrink-0"
          >
            {(c.user?.avatarUrl ?? c.user?.image) ? (
              <Image
                src={(c.user?.avatarUrl ?? c.user?.image)!}
                alt={c.user?.name ?? "Collaborator"}
                width={28}
                height={28}
                className="object-cover w-full h-full"
              />
            ) : (
              (c.user?.name?.[0] ?? "?").toUpperCase()
            )}
          </div>
        ))}
        {withUser.length > 5 && (
          <div className="w-7 h-7 rounded-full bg-surface-hover border-2 border-surface-deep flex items-center justify-center text-xs font-medium text-secondary">
            +{withUser.length - 5}
          </div>
        )}
      </div>
    </div>
  );
}

export function CollaborativePanel({ collab, isEditing, isOwner }: CollaborativePanelProps) {
  if (!collab.showCollabPanel || !isOwner || isEditing) return null;

  const withUser = collab.collaborators.filter((c) => c.user);

  return (
    <div className="bg-surface-raised border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon icon={UsersRound} className={`w-4 h-4 ${collab.isCollaborative ? "text-violet-500" : "text-muted"}`} />
          <span className="text-sm font-medium text-primary">
            {collab.isCollaborative ? "Collaborative mode on" : "Collaborative mode off"}
          </span>
        </div>
        <button
          onClick={collab.handleToggleCollaborative}
          disabled={collab.isTogglingCollab}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-surface-raised disabled:opacity-50 ${
            collab.isCollaborative ? "bg-violet-600" : "bg-gray-400 dark:bg-gray-600"
          }`}
          role="switch"
          aria-checked={collab.isCollaborative}
          aria-label="Toggle collaborative mode"
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              collab.isCollaborative ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {collab.isCollaborative && (
        <div className="space-y-3">
          <form onSubmit={collab.handleInviteByUsername} className="space-y-2">
            <p className="text-xs font-medium text-secondary">Invite by username</p>
            <div className="flex gap-2">
              <input
                type="text"
                aria-label="Username to invite"
                placeholder="@username"
                value={collab.inviteUsername}
                onChange={(e) => collab.setInviteUsername(e.target.value)}
                className="flex-1 bg-surface border border-border rounded-lg px-3 py-2 text-xs text-secondary placeholder-muted focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
              <select
                aria-label="Collaborator role"
                value={collab.inviteRole}
                onChange={(e) => collab.setInviteRole(e.target.value as "editor" | "viewer")}
                className="bg-surface border border-border rounded-lg px-2 py-2 text-xs text-secondary focus:outline-none focus:ring-1 focus:ring-violet-500"
              >
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </select>
              <button
                type="submit"
                disabled={!collab.inviteUsername.trim() || collab.isInvitingByUsername}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-violet-600 hover:bg-violet-500 rounded-lg transition-colors disabled:opacity-50"
              >
                <Icon icon={UserPlus} className="w-3.5 h-3.5" />
                {collab.isInvitingByUsername ? "Adding…" : "Add"}
              </button>
            </div>
          </form>

          <div className="space-y-2">
            <button
              onClick={collab.handleGenerateInvite}
              disabled={collab.isGeneratingInvite}
              className="flex items-center gap-2 text-sm font-medium text-violet-600 dark:text-violet-400 hover:text-violet-500 transition-colors disabled:opacity-50"
            >
              <Icon icon={Link} className="w-4 h-4" />
              {collab.isGeneratingInvite ? "Generating…" : "Generate invite link"}
            </button>

            {collab.inviteLink && (
              <div className="flex gap-2">
                <input
                  readOnly
                  aria-label="Invite link"
                  value={collab.inviteLink}
                  className="flex-1 bg-surface border border-border rounded-lg px-3 py-2 text-xs text-secondary focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
                <button
                  onClick={collab.handleCopyInviteLink}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-lg hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-colors whitespace-nowrap"
                >
                  <Icon icon={Link} className="w-3.5 h-3.5" />
                  Copy
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {collab.isCollaborative && withUser.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-secondary">Current collaborators</p>
          {withUser.map((c) => (
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
                  <span className="text-sm text-primary">{c.user?.name ?? "Unknown"}</span>
                  <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-medium ${c.role === "viewer" ? "bg-surface-hover text-secondary" : "bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400"}`}>
                    {c.role ?? "editor"}
                  </span>
                </div>
              </div>
              <button
                onClick={() => collab.handleRemoveCollaborator(c.id)}
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

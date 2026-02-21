"use client";

import { useQuery, useMutation } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { Id } from "../../convex/_generated/dataModel";
import { formatDateTime } from "@/lib/datetime";
import Link from "next/link";

type Tab = "users" | "links";

export function AdminDashboard() {
  const { signOut } = useAuthActions();
  const users = useQuery(api.admin.listUsers);
  const links = useQuery(api.admin.listAllLinks, { limit: 200 });

  const banUser = useMutation(api.admin.banUser);
  const unbanUser = useMutation(api.admin.unbanUser);
  const deleteUser = useMutation(api.admin.deleteUser);
  const forceLogout = useMutation(api.admin.forceLogoutUser);
  const deleteLink = useMutation(api.admin.deleteLink);
  const setUserQuota = useMutation(api.admin.setUserQuota);

  const [activeTab, setActiveTab] = useState<Tab>("users");
  const [error, setError] = useState("");

  const handleBan = async (userId: Id<"users">, email: string | null) => {
    if (!confirm(`Ban ${email ?? "this user"}? Their links will be disabled and they will be signed out.`)) return;
    setError("");
    try {
      await banUser({ userId });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to ban user");
    }
  };

  const handleUnban = async (userId: Id<"users">) => {
    setError("");
    try {
      await unbanUser({ userId });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to unban user");
    }
  };

  const handleDelete = async (userId: Id<"users">, email: string | null) => {
    if (!confirm(`Permanently delete ${email ?? "this user"} and ALL their data? This cannot be undone.`)) return;
    setError("");
    try {
      await deleteUser({ userId });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete user");
    }
  };

  const handleForceLogout = async (userId: Id<"users">, email: string | null) => {
    if (!confirm(`Force logout ${email ?? "this user"}? Their active sessions will be invalidated.`)) return;
    setError("");
    try {
      await forceLogout({ userId });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to force logout");
    }
  };

  const handleSetQuota = async (userId: Id<"users">, limit: number | null) => {
    setError("");
    try {
      await setUserQuota({ userId, limit });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to set quota");
    }
  };

  const handleDeleteLink = async (linkId: Id<"links">, slug: string) => {
    if (!confirm(`Delete link /${slug} and its click data?`)) return;
    setError("");
    try {
      await deleteLink({ linkId });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete link");
    }
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-ctp-surface0">
        <div className="px-6 py-4 flex items-center justify-between max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold">
              <span className="text-ctp-mauve">snupai</span>
              <span className="text-ctp-subtext1">.link</span>
            </h1>
            <span className="text-xs font-semibold bg-ctp-red/20 text-ctp-red border border-ctp-red/30 rounded-full px-2 py-0.5">
              Admin
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-ctp-subtext0 hover:text-ctp-subtext1 text-sm transition-colors"
            >
              Dashboard
            </Link>
            <button
              onClick={() => signOut()}
              className="text-ctp-subtext0 hover:text-ctp-subtext1 text-sm transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
        <div className="px-6 max-w-5xl mx-auto">
          <nav className="flex gap-6">
            <button
              onClick={() => setActiveTab("users")}
              className={`py-4 px-1 border-b-2 font-medium transition-colors ${
                activeTab === "users"
                  ? "border-ctp-mauve text-ctp-mauve"
                  : "border-transparent text-ctp-subtext0 hover:text-ctp-subtext1"
              }`}
            >
              Users
            </button>
            <button
              onClick={() => setActiveTab("links")}
              className={`py-4 px-1 border-b-2 font-medium transition-colors ${
                activeTab === "links"
                  ? "border-ctp-mauve text-ctp-mauve"
                  : "border-transparent text-ctp-subtext0 hover:text-ctp-subtext1"
              }`}
            >
              Links
            </button>
          </nav>
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {error && (
          <div className="rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {activeTab === "users" ? (
          <UsersTab
            users={users}
            onBan={handleBan}
            onUnban={handleUnban}
            onDelete={handleDelete}
            onForceLogout={handleForceLogout}
            onSetQuota={handleSetQuota}
          />
        ) : (
          <LinksTab links={links} onDelete={handleDeleteLink} />
        )}
      </div>
    </div>
  );
}

type UserRow = NonNullable<ReturnType<typeof useQuery<typeof api.admin.listUsers>>>[number];

function UsersTab({
  users,
  onBan,
  onUnban,
  onDelete,
  onForceLogout,
  onSetQuota,
}: {
  users: UserRow[] | undefined;
  onBan: (userId: Id<"users">, email: string | null) => void;
  onUnban: (userId: Id<"users">) => void;
  onDelete: (userId: Id<"users">, email: string | null) => void;
  onForceLogout: (userId: Id<"users">, email: string | null) => void;
  onSetQuota: (userId: Id<"users">, limit: number | null) => void;
}) {
  if (!users) {
    return <div className="text-ctp-subtext0">Loading users...</div>;
  }

  if (users.length === 0) {
    return <div className="text-ctp-subtext0">No users found.</div>;
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-ctp-text">
        All Users <span className="text-ctp-overlay0 text-sm font-normal">({users.length})</span>
      </h2>
      <div className="space-y-2">
        {users.map((user) => (
          <UserCard
            key={user._id}
            user={user}
            onBan={onBan}
            onUnban={onUnban}
            onDelete={onDelete}
            onForceLogout={onForceLogout}
            onSetQuota={onSetQuota}
          />
        ))}
      </div>
    </div>
  );
}

function UserCard({
  user,
  onBan,
  onUnban,
  onDelete,
  onForceLogout,
  onSetQuota,
}: {
  user: UserRow;
  onBan: (userId: Id<"users">, email: string | null) => void;
  onUnban: (userId: Id<"users">) => void;
  onDelete: (userId: Id<"users">, email: string | null) => void;
  onForceLogout: (userId: Id<"users">, email: string | null) => void;
  onSetQuota: (userId: Id<"users">, limit: number | null) => void;
}) {
  const isAdmin = user.role === "admin";
  const [editingQuota, setEditingQuota] = useState(false);
  const [quotaInput, setQuotaInput] = useState(
    user.apiQuotaLimit != null ? String(user.apiQuotaLimit) : "",
  );

  const currentQuota = user.apiQuotaLimit ?? 25;

  const handleQuotaSave = () => {
    const trimmed = quotaInput.trim();
    if (trimmed === "" || trimmed === "25") {
      onSetQuota(user._id, null); // reset to default
    } else {
      const parsed = parseInt(trimmed, 10);
      if (!Number.isNaN(parsed) && parsed >= 1 && parsed <= 10000) {
        onSetQuota(user._id, parsed);
      }
    }
    setEditingQuota(false);
  };

  return (
    <div className="bg-ctp-mantle border border-ctp-surface0 rounded-xl p-4 hover:border-ctp-surface1 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-ctp-text font-medium truncate">
              {user.email ?? "No email"}
            </span>
            {isAdmin && (
              <span className="text-[10px] font-semibold bg-ctp-mauve/20 text-ctp-mauve border border-ctp-mauve/30 rounded-full px-2 py-0.5">
                Admin
              </span>
            )}
            {user.banned && (
              <span className="text-[10px] font-semibold bg-ctp-red/20 text-ctp-red border border-ctp-red/30 rounded-full px-2 py-0.5">
                Banned
              </span>
            )}
            {user.emailVerified ? (
              <span className="text-[10px] font-semibold bg-ctp-green/20 text-ctp-green border border-ctp-green/30 rounded-full px-2 py-0.5">
                Verified
              </span>
            ) : (
              <span className="text-[10px] font-semibold bg-ctp-yellow/20 text-ctp-yellow border border-ctp-yellow/30 rounded-full px-2 py-0.5">
                Unverified
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-ctp-overlay1">
            <span>{user.linkCount} link{user.linkCount !== 1 ? "s" : ""}</span>
            <span>Joined {formatDateTime(user.createdAt)}</span>
            {user.bannedAt && <span>Banned {formatDateTime(user.bannedAt)}</span>}
            <span className="text-ctp-overlay0">|</span>
            {editingQuota ? (
              <span className="flex items-center gap-1">
                <span className="text-ctp-subtext0">Quota:</span>
                <input
                  type="number"
                  min={1}
                  max={10000}
                  value={quotaInput}
                  onChange={(e) => setQuotaInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleQuotaSave();
                    if (e.key === "Escape") setEditingQuota(false);
                  }}
                  className="w-16 bg-ctp-base border border-ctp-surface1 rounded px-1.5 py-0.5 text-xs text-ctp-text focus:outline-none focus:border-ctp-mauve"
                  placeholder="20"
                  autoFocus
                />
                <button
                  onClick={handleQuotaSave}
                  className="text-ctp-green hover:text-ctp-green/80"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingQuota(false)}
                  className="text-ctp-overlay0 hover:text-ctp-subtext0"
                >
                  Cancel
                </button>
              </span>
            ) : (
              <button
                onClick={() => {
                  setQuotaInput(user.apiQuotaLimit != null ? String(user.apiQuotaLimit) : "");
                  setEditingQuota(true);
                }}
                className="text-ctp-subtext0 hover:text-ctp-mauve transition-colors"
                title="Click to edit API quota"
              >
                Quota: {currentQuota}/5h
              </button>
            )}
          </div>
        </div>

        {!isAdmin && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {user.banned ? (
              <button
                onClick={() => onUnban(user._id)}
                className="text-xs bg-ctp-green/10 text-ctp-green border border-ctp-green/30 hover:bg-ctp-green/20 rounded-lg px-3 py-1.5 transition-colors"
              >
                Unban
              </button>
            ) : (
              <button
                onClick={() => onBan(user._id, user.email)}
                className="text-xs bg-ctp-peach/10 text-ctp-peach border border-ctp-peach/30 hover:bg-ctp-peach/20 rounded-lg px-3 py-1.5 transition-colors"
              >
                Ban
              </button>
            )}
            <button
              onClick={() => onForceLogout(user._id, user.email)}
              className="text-xs bg-ctp-yellow/10 text-ctp-yellow border border-ctp-yellow/30 hover:bg-ctp-yellow/20 rounded-lg px-3 py-1.5 transition-colors"
            >
              Logout
            </button>
            <button
              onClick={() => onDelete(user._id, user.email)}
              className="text-xs bg-ctp-red/10 text-ctp-red border border-ctp-red/30 hover:bg-ctp-red/20 rounded-lg px-3 py-1.5 transition-colors"
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

type LinkRow = NonNullable<ReturnType<typeof useQuery<typeof api.admin.listAllLinks>>>[number];

function LinksTab({
  links,
  onDelete,
}: {
  links: LinkRow[] | undefined;
  onDelete: (linkId: Id<"links">, slug: string) => void;
}) {
  if (!links) {
    return <div className="text-ctp-subtext0">Loading links...</div>;
  }

  if (links.length === 0) {
    return <div className="text-ctp-subtext0">No links found.</div>;
  }

  // Group links by owner
  const grouped = new Map<string, { email: string; userId: string; links: LinkRow[] }>();
  for (const link of links) {
    const key = link.userId;
    if (!grouped.has(key)) {
      grouped.set(key, { email: link.ownerEmail, userId: key, links: [] });
    }
    grouped.get(key)!.links.push(link);
  }

  const groups = [...grouped.values()].sort((a, b) =>
    a.email.localeCompare(b.email),
  );

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-ctp-text">
        All Links <span className="text-ctp-overlay0 text-sm font-normal">({links.length})</span>
      </h2>
      <div className="space-y-6">
        {groups.map((group) => (
          <div key={group.userId}>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-sm font-medium text-ctp-subtext1">{group.email}</h3>
              <span className="text-xs text-ctp-overlay0">
                ({group.links.length} link{group.links.length !== 1 ? "s" : ""})
              </span>
            </div>
            <div className="space-y-2">
              {group.links.map((link) => (
                <div
                  key={link._id}
                  className="bg-ctp-mantle border border-ctp-surface0 rounded-xl p-4 hover:border-ctp-surface1 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-ctp-mauve font-medium truncate">
                        snupai.link/{link.slug}
                      </p>
                      <p className="text-ctp-subtext0 text-sm truncate">{link.url}</p>
                      <div className="mt-1 flex flex-wrap gap-3 text-xs text-ctp-overlay1">
                        <span>{link.clickCount} click{link.clickCount !== 1 ? "s" : ""}</span>
                        <span>Created {formatDateTime(link.createdAt)}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => onDelete(link._id, link.slug)}
                      className="text-xs bg-ctp-red/10 text-ctp-red border border-ctp-red/30 hover:bg-ctp-red/20 rounded-lg px-3 py-1.5 transition-colors flex-shrink-0"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

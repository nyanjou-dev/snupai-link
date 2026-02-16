"use client";

import { useQuery, useMutation } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { Id } from "../../convex/_generated/dataModel";
import { ClickDetails } from "./ClickDetails";
import { LinkQRCode } from "./LinkQRCode";

function formatDateTime(timestamp?: number) {
  if (!timestamp) return "Never";
  return new Date(timestamp).toLocaleString();
}

export function Dashboard() {
  const links = useQuery(api.links.list);
  const analytics = useQuery(api.links.analyticsOverview, { topLimit: 5, recentLimit: 15 });
  const createLink = useMutation(api.links.create);
  const removeLink = useMutation(api.links.remove);
  const { signOut } = useAuthActions();

  const [slug, setSlug] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [selectedLink, setSelectedLink] = useState<Id<"links"> | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setCreating(true);
    try {
      const trimmedSlug = slug.trim();
      await createLink({ slug: trimmedSlug || undefined, url });
      setSlug("");
      setUrl("");
    } catch (err: any) {
      setError(err.message || "Failed to create link");
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = (slug: string) => {
    navigator.clipboard.writeText(`https://snupai.link/${slug}`);
    setCopied(slug);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleDelete = async (id: Id<"links">) => {
    if (!confirm("Delete this link?")) return;
    await removeLink({ id });
    if (selectedLink === id) setSelectedLink(null);
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-ctp-surface0 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">
          <span className="text-ctp-mauve">snupai</span>
          <span className="text-ctp-subtext1">.link</span>
        </h1>
        <button
          onClick={() => signOut()}
          className="text-ctp-subtext0 hover:text-ctp-subtext1 text-sm transition-colors"
        >
          Sign out
        </button>
      </header>

      <div className="max-w-4xl mx-auto p-6 space-y-8">
        <form onSubmit={handleCreate} className="bg-ctp-mantle border border-ctp-surface0 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-ctp-text">Create Short Link</h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center bg-ctp-base border border-ctp-surface0 rounded-lg overflow-hidden flex-shrink-0">
              <span className="text-ctp-subtext0 pl-3 text-sm">snupai.link/</span>
              <input
                type="text"
                placeholder="auto"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="bg-transparent px-2 py-3 text-ctp-text placeholder-ctp-overlay0 focus:outline-none w-32"
                pattern="[a-zA-Z0-9_-]+"
                title="Leave empty for auto-generated slug"
              />
            </div>
            <input
              type="url"
              placeholder="https://example.com/long-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1 bg-ctp-base border border-ctp-surface0 rounded-lg px-4 py-3 text-ctp-text placeholder-ctp-overlay0 focus:outline-none focus:border-ctp-mauve transition-colors"
              required
            />
            <button
              type="submit"
              disabled={creating}
              className="bg-ctp-mauve hover:bg-ctp-mauve/90 disabled:opacity-50 text-white px-6 py-3 rounded-lg font-medium transition-colors whitespace-nowrap"
            >
              {creating ? "..." : "Shorten"}
            </button>
          </div>
          <p className="text-ctp-overlay0 text-xs">Leave slug empty to auto-generate one (usually 3-8 chars).</p>
          {error && <p className="text-red-400 text-sm">{error}</p>}
        </form>

        <section className="bg-ctp-mantle border border-ctp-surface0 rounded-xl p-6 space-y-6">
          <h2 className="text-lg font-semibold text-ctp-text">Analytics</h2>
          {!analytics ? (
            <div className="text-ctp-subtext0">Loading analytics…</div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <h3 className="text-sm font-medium text-ctp-subtext1 mb-3">Top links by clicks</h3>
                {analytics.topLinks.length === 0 ? (
                  <p className="text-ctp-subtext0 text-sm">No click data yet.</p>
                ) : (
                  <div className="space-y-2">
                    {analytics.topLinks.map((link) => (
                      <div
                        key={link._id}
                        className="bg-ctp-base border border-ctp-surface0 rounded-lg p-3 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <p className="text-ctp-mauve truncate">snupai.link/{link.slug}</p>
                          <p className="text-ctp-overlay1 text-xs truncate">{link.url}</p>
                        </div>
                        <p className="text-sm text-ctp-text tabular-nums">{link.clickCount}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-sm font-medium text-ctp-subtext1 mb-3">Recent clicks</h3>
                {analytics.recentClicks.length === 0 ? (
                  <p className="text-ctp-subtext0 text-sm">No recent clicks yet.</p>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {analytics.recentClicks.map((click) => (
                      <div key={click._id} className="bg-ctp-base border border-ctp-surface0 rounded-lg p-3">
                        <p className="text-ctp-text text-sm">snupai.link/{click.slug}</p>
                        <p className="text-ctp-overlay1 text-xs">{formatDateTime(click.createdAt)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-ctp-text">Your Links</h2>
          {!links ? (
            <div className="text-ctp-subtext0">Loading...</div>
          ) : links.length === 0 ? (
            <div className="text-ctp-subtext0 bg-ctp-mantle border border-ctp-surface0 rounded-xl p-8 text-center">
              No links yet. Create your first one above! ✨
            </div>
          ) : (
            <div className="space-y-2">
              {links.map((link) => (
                <div
                  key={link._id}
                  className="bg-ctp-mantle border border-ctp-surface0 rounded-xl p-4 hover:border-ctp-surface1 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCopy(link.slug)}
                          className="text-ctp-mauve hover:text-ctp-lavender font-medium truncate text-left"
                          title="Click to copy"
                        >
                          snupai.link/{link.slug}
                        </button>
                        {copied === link.slug && (
                          <span className="text-green-400 text-xs">Copied!</span>
                        )}
                      </div>
                      <p className="text-ctp-subtext0 text-sm truncate">{link.url}</p>
                      <p className="text-ctp-overlay0 text-xs mt-1">
                        Last clicked: {formatDateTime(link.lastClickedAt)}
                      </p>
                    </div>

                    <div className="flex items-start gap-4 flex-shrink-0">
                      <div className="text-center">
                        <LinkQRCode value={link.url} slug={link.slug} size={72} />
                        <p className="text-[10px] text-ctp-overlay0 mt-1">Target QR</p>
                      </div>

                      <div className="flex items-center gap-3 pt-1">
                        <button
                          onClick={() => setSelectedLink(selectedLink === link._id ? null : link._id)}
                          className="text-ctp-subtext1 hover:text-ctp-text text-sm tabular-nums transition-colors"
                        >
                          {link.clickCount} click{link.clickCount !== 1 ? "s" : ""}
                        </button>
                        <button
                          onClick={() => handleDelete(link._id)}
                          className="text-ctp-overlay0 hover:text-red-400 transition-colors"
                          title="Delete"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  </div>
                  {selectedLink === link._id && (
                    <ClickDetails linkId={link._id} slug={link.slug} targetUrl={link.url} />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

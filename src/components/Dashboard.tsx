"use client";

import { useQuery, useMutation } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { Id } from "../../convex/_generated/dataModel";
import { ClickDetails } from "./ClickDetails";

export function Dashboard() {
  const links = useQuery(api.links.list);
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
      await createLink({ slug, url });
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
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">
          <span className="text-purple-400">snupai</span>
          <span className="text-zinc-400">.link</span>
        </h1>
        <button
          onClick={() => signOut()}
          className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors"
        >
          Sign out
        </button>
      </header>

      <div className="max-w-4xl mx-auto p-6 space-y-8">
        {/* Create Link */}
        <form onSubmit={handleCreate} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-zinc-200">Create Short Link</h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden flex-shrink-0">
              <span className="text-zinc-500 pl-3 text-sm">snupai.link/</span>
              <input
                type="text"
                placeholder="my-slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="bg-transparent px-2 py-3 text-zinc-100 placeholder-zinc-600 focus:outline-none w-32"
                required
                pattern="[a-zA-Z0-9_-]+"
              />
            </div>
            <input
              type="url"
              placeholder="https://example.com/long-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-colors"
              required
            />
            <button
              type="submit"
              disabled={creating}
              className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-6 py-3 rounded-lg font-medium transition-colors whitespace-nowrap"
            >
              {creating ? "..." : "Shorten"}
            </button>
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
        </form>

        {/* Links List */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-zinc-200">Your Links</h2>
          {!links ? (
            <div className="text-zinc-500">Loading...</div>
          ) : links.length === 0 ? (
            <div className="text-zinc-500 bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
              No links yet. Create your first one above! ✨
            </div>
          ) : (
            <div className="space-y-2">
              {links.map((link) => (
                <div
                  key={link._id}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCopy(link.slug)}
                          className="text-purple-400 hover:text-purple-300 font-medium truncate text-left"
                          title="Click to copy"
                        >
                          snupai.link/{link.slug}
                        </button>
                        {copied === link.slug && (
                          <span className="text-green-400 text-xs">Copied!</span>
                        )}
                      </div>
                      <p className="text-zinc-500 text-sm truncate">{link.url}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <button
                        onClick={() => setSelectedLink(selectedLink === link._id ? null : link._id)}
                        className="text-zinc-400 hover:text-zinc-200 text-sm tabular-nums transition-colors"
                      >
                        {link.clicks} click{link.clicks !== 1 ? "s" : ""}
                      </button>
                      <button
                        onClick={() => handleDelete(link._id)}
                        className="text-zinc-600 hover:text-red-400 transition-colors"
                        title="Delete"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                  {selectedLink === link._id && <ClickDetails linkId={link._id} />}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

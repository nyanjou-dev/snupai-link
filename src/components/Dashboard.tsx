"use client";

import { useConvexAuth, useQuery, useMutation } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../convex/_generated/api";
import { useMemo, useState } from "react";
import { Id } from "../../convex/_generated/dataModel";
import { ClickDetails } from "./ClickDetails";
import { ApiKeysSection } from "./ApiKeysSection";
import { formatDateTime, formatExpiry, fromDatetimeLocalValue, toDatetimeLocalValue } from "@/lib/datetime";
import Link from "next/link";

type Tab = "links" | "api-keys";

const MIN_MAX_CLICKS = 1;
const MAX_MAX_CLICKS = 1_000_000;
const MIN_EXPIRY_MS_FROM_NOW = 60_000;

function getErrorMessage(err: unknown) {
  if (err instanceof Error && err.message) return err.message;
  return "Failed to create link";
}

export function Dashboard() {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const me = useQuery(api.session.me, isAuthenticated ? {} : "skip");
  const quota = useQuery(api.api.quotaStatus, isAuthenticated ? {} : "skip");
  const links = useQuery(api.links.list, isAuthenticated ? {} : "skip");
  const analytics = useQuery(
    api.links.analyticsOverview,
    isAuthenticated ? { topLimit: 5, recentLimit: 15 } : "skip",
  );
  const createLink = useMutation(api.links.create);
  const removeLink = useMutation(api.links.remove);
  const { signOut } = useAuthActions();

  const [slug, setSlug] = useState("");
  const [url, setUrl] = useState("");
  const [expiresAtInput, setExpiresAtInput] = useState("");
  const [maxClicksInput, setMaxClicksInput] = useState("");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [selectedLink, setSelectedLink] = useState<Id<"links"> | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("links");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);

  const authReady = !authLoading && isAuthenticated;

  const formValidationError = useMemo(() => {
    if (slug.trim() && !/^[a-zA-Z0-9-_]+$/.test(slug.trim())) {
      return "Slug must contain only letters, numbers, hyphens, and underscores.";
    }

    if (maxClicksInput.trim()) {
      const parsed = Number(maxClicksInput);
      if (!Number.isInteger(parsed)) return "Click limit must be a whole number.";
      if (parsed < MIN_MAX_CLICKS || parsed > MAX_MAX_CLICKS) {
        return `Click limit must be between ${MIN_MAX_CLICKS} and ${MAX_MAX_CLICKS.toLocaleString()}.`;
      }
    }

    if (expiresAtInput) {
      const expiry = fromDatetimeLocalValue(expiresAtInput);
      if (!expiry) return "Please enter a valid expiry date and time.";
      if (expiry < Date.now() + MIN_EXPIRY_MS_FROM_NOW) {
        return "Expiry must be at least 1 minute in the future.";
      }
    }

    return "";
  }, [expiresAtInput, maxClicksInput, slug]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (formValidationError) {
      setError(formValidationError);
      return;
    }

    setCreating(true);
    try {
      const trimmedSlug = slug.trim();
      const trimmedMaxClicks = maxClicksInput.trim();
      const expiresAt = expiresAtInput ? fromDatetimeLocalValue(expiresAtInput) : null;

      await createLink({
        slug: trimmedSlug || undefined,
        url,
        maxClicks: trimmedMaxClicks ? Number(trimmedMaxClicks) : undefined,
        expiresAt: expiresAt ?? undefined,
      });

      setSlug("");
      setUrl("");
      setMaxClicksInput("");
      setExpiresAtInput("");
    } catch (err: unknown) {
      const message = getErrorMessage(err);
      if (message.includes("Not authenticated")) {
        setError("Your session expired. Please sign in again.");
      } else {
        setError(message);
      }
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
    try {
      await removeLink({ id });
      if (selectedLink === id) setSelectedLink(null);
    } catch (err: unknown) {
      const message = getErrorMessage(err);
      if (message.includes("Not authenticated")) {
        setError("Your session expired. Please sign in again.");
        return;
      }
      setError(message);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-ctp-mauve" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center text-ctp-subtext1">
        Please sign in to view your dashboard.
      </div>
    );
  }

  if (me?.banned) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-sm">
          <h1 className="text-2xl font-bold text-ctp-red">Account Suspended</h1>
          <p className="text-ctp-subtext0 text-sm">
            Your account has been suspended. If you believe this is an error, please contact support.
          </p>
          <button
            onClick={() => signOut()}
            className="text-ctp-subtext0 hover:text-ctp-subtext1 text-sm transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="bg-ctp-mantle/40">
        <div className="px-6 py-3 flex items-center justify-between max-w-3xl mx-auto">
          <h1 className="text-xl font-bold">
            <span className="text-ctp-mauve">snupai</span>
            <span className="text-ctp-subtext1">.link</span>
          </h1>
          <div className="flex items-center gap-4">
            <nav className="flex items-center gap-4">
              <button
                onClick={() => setActiveTab("links")}
                className={`text-sm transition-colors ${
                  activeTab === "links"
                    ? "text-ctp-mauve font-medium"
                    : "text-ctp-overlay1 hover:text-ctp-text"
                }`}
              >
                Links
              </button>
              <button
                onClick={() => setActiveTab("api-keys")}
                className={`text-sm transition-colors ${
                  activeTab === "api-keys"
                    ? "text-ctp-mauve font-medium"
                    : "text-ctp-overlay1 hover:text-ctp-text"
                }`}
              >
                API Keys
              </button>
            </nav>
            {me?.role === "admin" && (
              <Link
                href="/admin"
                className="text-xs text-ctp-red hover:text-ctp-red/80 transition-colors"
              >
                Admin
              </Link>
            )}
            <button
              onClick={() => signOut()}
              className="text-ctp-subtext0 hover:text-ctp-subtext1 text-sm transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">
        {activeTab === "api-keys" ? (
          <ApiKeysSection />
        ) : (
          <>
        {quota && (
          <DashboardQuotaBar used={quota.used} limit={quota.limit} remaining={quota.remaining} resetsAt={quota.resetsAt} />
        )}
        <form onSubmit={handleCreate} className="bg-ctp-mantle/50 rounded-2xl p-5 space-y-4">
          <h2 className="text-lg font-semibold text-ctp-text">Create Short Link</h2>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center bg-ctp-base/80 border border-ctp-surface0/50 rounded-xl overflow-hidden flex-shrink-0">
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
              className="flex-1 bg-ctp-base/80 border border-ctp-surface0/50 rounded-xl px-4 py-3 text-ctp-text placeholder-ctp-overlay0 focus-ring transition-colors"
              required
            />
            <button
              type="submit"
              disabled={creating || !!formValidationError || !authReady}
              className="bg-ctp-mauve hover:bg-ctp-mauve/90 disabled:opacity-50 disabled:cursor-not-allowed text-ctp-crust px-6 py-3 rounded-xl font-medium transition-colors whitespace-nowrap"
            >
              {creating ? "Creating…" : "Shorten"}
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1.5 text-xs text-ctp-overlay1 hover:text-ctp-subtext1 transition-colors"
          >
            <span className={`inline-block transition-transform ${showAdvanced ? "rotate-90" : ""}`}>▶</span>
            Advanced options
          </button>

          {showAdvanced && (
            <div className="animate-fade-in grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label htmlFor="expiry" className="text-ctp-subtext1 text-sm">Expiry (optional)</label>
                <input
                  id="expiry"
                  type="datetime-local"
                  value={expiresAtInput}
                  min={toDatetimeLocalValue(Date.now() + MIN_EXPIRY_MS_FROM_NOW)}
                  onChange={(e) => setExpiresAtInput(e.target.value)}
                  className="w-full bg-ctp-base/80 border border-ctp-surface0/50 rounded-xl px-3 py-3 text-ctp-text focus-ring transition-colors"
                />
                <p className="text-[11px] text-ctp-overlay0">Uses your local timezone ({Intl.DateTimeFormat().resolvedOptions().timeZone}).</p>
              </div>

              <div className="space-y-1">
                <label htmlFor="maxClicks" className="text-ctp-subtext1 text-sm">Click limit (optional)</label>
                <input
                  id="maxClicks"
                  type="number"
                  min={MIN_MAX_CLICKS}
                  max={MAX_MAX_CLICKS}
                  step={1}
                  placeholder="e.g. 100"
                  value={maxClicksInput}
                  onChange={(e) => setMaxClicksInput(e.target.value)}
                  className="w-full bg-ctp-base/80 border border-ctp-surface0/50 rounded-xl px-3 py-3 text-ctp-text placeholder-ctp-overlay0 focus-ring transition-colors"
                />
                <p className="text-[11px] text-ctp-overlay0">Set between 1 and {MAX_MAX_CLICKS.toLocaleString()}.</p>
              </div>
            </div>
          )}

          <p className="text-ctp-overlay0 text-xs">Leave slug empty to auto-generate one (usually 3–8 chars).</p>
          {(error || formValidationError) && <p className="text-ctp-red/90 text-sm">{error || formValidationError}</p>}
        </form>

        <section className="space-y-4">
          <button
            onClick={() => setShowAnalytics(!showAnalytics)}
            className="flex items-center gap-1.5 text-lg font-semibold text-ctp-text hover:text-ctp-subtext1 transition-colors"
          >
            <span className={`text-sm inline-block transition-transform ${showAnalytics ? "rotate-90" : ""}`}>▶</span>
            Analytics
          </button>
          {showAnalytics && (
            <div className="animate-fade-in">
              {!analytics ? (
                <div className="text-ctp-subtext0">Loading analytics…</div>
              ) : (
                <div className="grid gap-6 lg:grid-cols-2">
                  <div>
                    <h3 className="text-sm font-medium text-ctp-subtext1 mb-3">Top links by clicks</h3>
                    {analytics.topLinks.length === 0 ? (
                      <div className="bg-ctp-mantle/40 rounded-xl p-4 text-center text-sm text-ctp-overlay0">
                        No links have been clicked yet.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {analytics.topLinks.map((link) => (
                          <div
                            key={link._id}
                            className="bg-ctp-mantle/40 rounded-lg p-3 flex items-center justify-between gap-3"
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
                      <div className="bg-ctp-mantle/40 rounded-xl p-4 text-center text-sm text-ctp-overlay0">
                        Nothing to show yet.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                        {analytics.recentClicks.map((click) => (
                          <div key={click._id} className="bg-ctp-mantle/40 rounded-lg p-3">
                            <p className="text-ctp-text text-sm">snupai.link/{click.slug}</p>
                            <p className="text-ctp-overlay1 text-xs">{formatDateTime(click.createdAt)}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-ctp-text">Your Links</h2>
          {!links ? (
            <div className="text-ctp-subtext0">Loading...</div>
          ) : links.length === 0 ? (
            <div className="text-ctp-subtext0 bg-ctp-mantle/40 rounded-2xl p-8 text-center">
              <p className="text-sm text-ctp-overlay0">No links yet. Create your first short link above.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {links.map((link) => (
                <div
                  key={link._id}
                  className="bg-ctp-mantle/40 rounded-xl p-5 hover:bg-ctp-mantle/60 transition-colors"
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
                          <span className="text-ctp-green text-xs">Copied!</span>
                        )}
                      </div>
                      <p className="text-ctp-subtext0 text-sm truncate">{link.url}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-ctp-overlay0">
                        <span>Last clicked: {formatDateTime(link.lastClickedAt)}</span>
                        {link.expiresAt && (
                          <span>Expires: {formatExpiry(link.expiresAt)}</span>
                        )}
                        {typeof link.maxClicks === "number" && (
                          <span>Limit: {link.maxClicks.toLocaleString()}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0 pt-1">
                      <button
                        onClick={() => setSelectedLink(selectedLink === link._id ? null : link._id)}
                        className="text-ctp-subtext1 hover:text-ctp-text text-sm tabular-nums transition-colors"
                      >
                        {link.clickCount} click{link.clickCount !== 1 ? "s" : ""}
                      </button>
                      <button
                        onClick={() => handleDelete(link._id)}
                        className="text-ctp-overlay0 hover:text-ctp-red transition-colors"
                        title="Delete"
                      >
                        ×
                      </button>
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
          </>
        )}
      </div>
    </div>
  );
}

function formatTimeRemaining(ms: number) {
  if (ms <= 0) return "now";
  const hours = Math.floor(ms / (60 * 60 * 1000));
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function DashboardQuotaBar({
  used,
  limit,
  remaining,
  resetsAt,
}: {
  used: number;
  limit: number;
  remaining: number;
  resetsAt: number | null;
}) {
  const pct = Math.min(100, (used / limit) * 100);
  const isNearLimit = remaining <= 3 && remaining > 0;
  const isExhausted = remaining === 0;

  const barColor = isExhausted
    ? "bg-ctp-red"
    : isNearLimit
      ? "bg-ctp-peach"
      : "bg-ctp-mauve";

  return (
    <div className="bg-ctp-mantle/50 rounded-xl px-4 py-3 space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-ctp-subtext1">
          <span className={`font-mono font-bold tabular-nums ${isExhausted ? "text-ctp-red" : "text-ctp-text"}`}>
            {used}
          </span>
          <span className="text-ctp-overlay1"> / {limit} links this window</span>
        </span>
        <span className="text-ctp-overlay1">
          {isExhausted
            ? resetsAt
              ? `Next slot in ${formatTimeRemaining(resetsAt - Date.now())}`
              : "Quota full"
            : `${remaining} remaining`}
        </span>
      </div>
      <div className="h-2 bg-ctp-surface0 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

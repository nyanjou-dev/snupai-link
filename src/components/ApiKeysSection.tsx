"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { Id } from "../../convex/_generated/dataModel";

interface ApiKey {
  id: Id<"apiKeys">;
  name: string;
  createdAt: number;
  lastUsedAt: number | null;
  isActive: boolean;
  identifier: string;
}

function formatTimeRemaining(ms: number) {
  if (ms <= 0) return "now";
  const hours = Math.floor(ms / (60 * 60 * 1000));
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function ApiKeysSection() {
  const apiKeys = useQuery(api.apiKeys.list);
  const quota = useQuery(api.api.quotaStatus);
  const createKey = useMutation(api.apiKeys.create);
  const removeKey = useMutation(api.apiKeys.remove);

  const [newKeyName, setNewKeyName] = useState("");
  const [showNewKey, setShowNewKey] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setCreating(true);

    try {
      const result = await createKey({ name: newKeyName });
      setCreatedKey(result.key);
      setShowNewKey(true);
      setNewKeyName("");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create API key";
      setError(message);
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = () => {
    if (createdKey) {
      navigator.clipboard.writeText(createdKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDelete = async (id: Id<"apiKeys">) => {
    try {
      await removeKey({ id });
    } catch (err: unknown) {
      console.error("Failed to delete API key:", err);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">API Keys</h2>
        <p className="text-ctp-subtext0 text-sm">
          Create API keys to programmatically create shortlinks via our API.
        </p>
      </div>

      {/* Quota status */}
      {quota && (
        <div className="bg-ctp-mantle border border-ctp-surface0 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-ctp-subtext1">API Quota</h3>
              <p className="text-xs text-ctp-overlay1 mt-0.5">
                {quota.used} / {quota.limit} links used
                {quota.resetsAt && (
                  <span>
                    {" · "}Resets in {formatTimeRemaining(quota.resetsAt - Date.now())}
                  </span>
                )}
              </p>
            </div>
            <span className={`text-sm font-mono tabular-nums ${quota.remaining === 0 ? "text-ctp-red" : "text-ctp-green"}`}>
              {quota.remaining} remaining
            </span>
          </div>
          <div className="mt-2 h-1.5 bg-ctp-surface0 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${quota.remaining === 0 ? "bg-ctp-red" : "bg-ctp-mauve"}`}
              style={{ width: `${(quota.used / quota.limit) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Create new API key form */}
      <form onSubmit={handleCreate} className="bg-ctp-surface0 rounded-lg p-4">
        <h3 className="font-semibold mb-3">Create new API key</h3>
        {error && (
          <div className="mb-3 p-3 bg-ctp-red/20 border border-ctp-red text-ctp-red rounded text-sm">
            {error}
          </div>
        )}
        <div className="flex gap-3">
          <input
            type="text"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder="Key name (e.g., 'My App', 'Production')"
            className="flex-1 px-3 py-2 bg-ctp-base border border-ctp-surface1 rounded focus:outline-none focus:border-ctp-mauve"
            disabled={creating}
            required
          />
          <button
            type="submit"
            disabled={creating || !newKeyName.trim()}
            className="px-4 py-2 bg-ctp-mauve hover:bg-ctp-mauve/80 disabled:opacity-50 disabled:cursor-not-allowed rounded font-medium transition-colors"
          >
            {creating ? "Creating..." : "Create Key"}
          </button>
        </div>
      </form>

      {/* Show created key */}
      {showNewKey && createdKey && (
        <div className="bg-ctp-green/20 border border-ctp-green text-ctp-text rounded-lg p-4">
          <h3 className="font-semibold mb-2">🔑 API Key Created!</h3>
          <p className="text-sm text-ctp-subtext0 mb-3">
            Copy this key now. You won't be able to see it again.
          </p>
          <div className="flex gap-2">
            <code className="flex-1 px-3 py-2 bg-ctp-base rounded text-sm font-mono break-all">
              {createdKey}
            </code>
            <button
              onClick={handleCopy}
              className="px-4 py-2 bg-ctp-green hover:bg-ctp-green/80 rounded font-medium transition-colors"
            >
              {copied ? "✓ Copied!" : "Copy"}
            </button>
          </div>
          <button
            onClick={() => {
              setShowNewKey(false);
              setCreatedKey(null);
            }}
            className="mt-3 text-sm text-ctp-subtext0 hover:text-ctp-text underline"
          >
            Done
          </button>
        </div>
      )}

      {/* API keys list */}
      <div className="bg-ctp-surface0 rounded-lg">
        {apiKeys && apiKeys.length > 0 ? (
          <div className="divide-y divide-ctp-surface1">
            {apiKeys.map((key) => (
              <div key={key.id} className="p-4 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h4 className="font-medium">{key.name}</h4>
                    {!key.isActive && (
                      <span className="px-2 py-0.5 bg-ctp-red/20 text-ctp-red text-xs rounded">
                        Inactive
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-ctp-subtext0 mt-1">
                    <code className="bg-ctp-base px-2 py-0.5 rounded">
                      {key.identifier}
                    </code>
                  </div>
                  <div className="text-xs text-ctp-overlay0 mt-1">
                    Created: {new Date(key.createdAt).toLocaleDateString()}
                    {key.lastUsedAt && (
                      <span>
                        {" • Last used: "}
                        {new Date(key.lastUsedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(key.id)}
                  className="px-3 py-1.5 text-sm text-ctp-red hover:bg-ctp-red/20 rounded transition-colors"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-ctp-subtext0">
            <p className="mb-2">No API keys yet</p>
            <p className="text-sm">Create your first API key to get started</p>
          </div>
        )}
      </div>

      {/* API Documentation */}
      <div className="bg-ctp-surface0 rounded-lg p-6">
        <h3 className="font-semibold mb-3">📚 API Documentation</h3>
        <div className="space-y-4 text-sm">
          <div>
            <h4 className="font-medium text-ctp-mauve mb-2">Create a Shortlink</h4>
            <p className="text-ctp-subtext0 mb-2">
              Use your API key to create shortlinks programmatically.
            </p>
            <div className="bg-ctp-base rounded p-3 overflow-x-auto">
              <pre className="text-xs font-mono">
{`curl -X POST https://snupai.link/api/create \\
  -H "Content-Type: application/json" \\
  -d '{
    "apiKey": "snupi_xxxxxxxxxxxx",
    "slug": "my-link",
    "url": "https://example.com/very/long/url"
  }'`}
              </pre>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-ctp-mauve mb-2">Rate Limits</h4>
            <ul className="list-disc list-inside text-ctp-subtext0 space-y-1">
              <li>10 requests per 5 seconds per API key (burst)</li>
              <li>20 links per 5 hours per account (quota)</li>
              <li>Exceeded limits will return a 429 error</li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium text-ctp-mauve mb-2">Response</h4>
            <div className="bg-ctp-base rounded p-3">
              <pre className="text-xs font-mono">
{`{
  "id": "...",
  "slug": "my-link",
  "url": "https://example.com/...",
  "shortUrl": "https://snupai.link/my-link",
  "rateLimitRemaining": 9
}`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

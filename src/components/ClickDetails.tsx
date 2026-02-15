"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

export function ClickDetails({ linkId }: { linkId: Id<"links"> }) {
  const clicks = useQuery(api.links.getClicks, { linkId });

  return (
    <div className="mt-4 border-t border-zinc-800 pt-4">
      <h3 className="text-sm font-medium text-zinc-300 mb-3">Recent clicks</h3>
      {!clicks ? (
        <div className="text-zinc-500 text-sm">Loading…</div>
      ) : clicks.length === 0 ? (
        <div className="text-zinc-500 text-sm">No clicks yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-zinc-500">
                <th className="py-2 pr-4 font-medium">Time</th>
                <th className="py-2 pr-4 font-medium">Referrer</th>
                <th className="py-2 pr-4 font-medium">User agent</th>
              </tr>
            </thead>
            <tbody>
              {clicks.map((c) => (
                <tr key={c._id} className="border-t border-zinc-900">
                  <td className="py-2 pr-4 text-zinc-300 whitespace-nowrap">
                    {new Date(c.timestamp).toLocaleString()}
                  </td>
                  <td className="py-2 pr-4 text-zinc-400 max-w-[320px] truncate">
                    {c.referrer || "—"}
                  </td>
                  <td className="py-2 pr-4 text-zinc-500 max-w-[420px] truncate">
                    {c.userAgent || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { LinkQRCode } from "./LinkQRCode";

export function ClickDetails({
  linkId,
  slug,
  targetUrl,
}: {
  linkId: Id<"links">;
  slug: string;
  targetUrl: string;
}) {
  const clicks = useQuery(api.links.getClicks, { linkId });

  return (
    <div className="mt-4 border-t border-ctp-surface0 pt-4 space-y-4">
      <div>
        <h3 className="text-sm font-medium text-ctp-subtext1 mb-2">QR code (destination URL)</h3>
        <LinkQRCode value={targetUrl} slug={slug} size={160} showActions />
      </div>

      <div>
        <h3 className="text-sm font-medium text-ctp-subtext1 mb-3">Recent clicks</h3>
        {!clicks ? (
          <div className="text-ctp-subtext0 text-sm">Loading…</div>
        ) : clicks.length === 0 ? (
          <div className="text-ctp-subtext0 text-sm">No clicks yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ctp-subtext0">
                  <th className="py-2 pr-4 font-medium">Time</th>
                  <th className="py-2 pr-4 font-medium">Referrer</th>
                  <th className="py-2 pr-4 font-medium">User agent</th>
                </tr>
              </thead>
              <tbody>
                {clicks.map((c) => (
                  <tr key={c._id} className="border-t border-ctp-crust">
                    <td className="py-2 pr-4 text-ctp-subtext1 whitespace-nowrap">
                      {new Date(c.createdAt).toLocaleString()}
                    </td>
                    <td className="py-2 pr-4 text-ctp-subtext1 max-w-[320px] truncate">
                      {c.referrer || "—"}
                    </td>
                    <td className="py-2 pr-4 text-ctp-subtext0 max-w-[420px] truncate">
                      {c.ua || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

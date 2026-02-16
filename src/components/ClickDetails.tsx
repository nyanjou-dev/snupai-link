"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { LinkQRCode } from "./LinkQRCode";
import { formatDateTime } from "@/lib/datetime";

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
  const topReferrers = useQuery(api.links.topReferrersForLink, { linkId, limit: 5 });

  return (
    <div className="mt-4 border-t border-ctp-surface0 pt-4 space-y-4">
      <div>
        <h3 className="text-sm font-medium text-ctp-subtext1 mb-2">QR code (destination URL)</h3>
        <LinkQRCode value={targetUrl} slug={slug} size={160} showActions />
      </div>

      <div>
        <h3 className="text-sm font-medium text-ctp-subtext1 mb-3">Top referrers</h3>
        {!topReferrers ? (
          <div className="text-ctp-subtext0 text-sm">Loading…</div>
        ) : topReferrers.length === 0 ? (
          <div className="rounded-lg border border-ctp-surface0 bg-ctp-base p-3 text-ctp-subtext0 text-sm">
            No referrer data yet. Once people click this link, common sources will appear here.
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {topReferrers.map((item) => (
              <div
                key={item.domain}
                className="rounded-lg border border-ctp-surface0 bg-ctp-base px-3 py-2 flex items-center justify-between gap-3"
              >
                <span className="text-ctp-subtext1 text-sm truncate">{item.domain}</span>
                <span className="text-ctp-text text-sm tabular-nums">{item.count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-sm font-medium text-ctp-subtext1 mb-3">Recent clicks</h3>
        {!clicks ? (
          <div className="text-ctp-subtext0 text-sm">Loading…</div>
        ) : clicks.length === 0 ? (
          <div className="rounded-lg border border-ctp-surface0 bg-ctp-base p-3 text-ctp-subtext0 text-sm">
            No clicks recorded yet for this link.
          </div>
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
                      {formatDateTime(c.createdAt)}
                    </td>
                    <td className="py-2 pr-4 text-ctp-subtext1 max-w-[320px] truncate">
                      {c.referrer || "direct/unknown"}
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

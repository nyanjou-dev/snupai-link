"use client";

import { ConvexReactClient } from "convex/react";
import { ConvexAuthNextjsProvider } from "@convex-dev/auth/nextjs";
import { ReactNode } from "react";

const url = process.env.NEXT_PUBLIC_CONVEX_URL;
if (url == null || url === "" || url === "null") {
  throw new Error(
    "NEXT_PUBLIC_CONVEX_URL must be set to your Convex deployment URL (e.g. https://YOUR_DEPLOYMENT.eu-west-1.convex.cloud). " +
      "After `convex dev`, fix .env.local if it says 'Client URL as null'. In Vercel, set this env var to the same URL."
  );
}
const convex = new ConvexReactClient(url);

export function ConvexAuthProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexAuthNextjsProvider client={convex}>
      {children}
    </ConvexAuthNextjsProvider>
  );
}

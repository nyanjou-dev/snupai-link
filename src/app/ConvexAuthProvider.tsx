"use client";

import { ConvexReactClient } from "convex/react";
import { ConvexAuthNextjsProvider } from "@convex-dev/auth/nextjs";
import { ReactNode } from "react";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!convexUrl || convexUrl === "null") {
  throw new Error(
    "Missing NEXT_PUBLIC_CONVEX_URL. Add it to .env.local (e.g. https://YOUR_DEPLOYMENT.convex.cloud) and restart the dev server."
  );
}
const convex = new ConvexReactClient(convexUrl, { verbose: true });

export function ConvexAuthProvider({ children }: { children: ReactNode }) {
  return <ConvexAuthNextjsProvider client={convex}>{children}</ConvexAuthNextjsProvider>;
}

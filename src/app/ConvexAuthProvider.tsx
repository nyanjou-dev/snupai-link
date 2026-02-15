"use client";

import { ConvexReactClient } from "convex/react";
import { ConvexAuthProvider as ConvexAuthProviderBase } from "@convex-dev/auth/react";
import { ReactNode } from "react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function ConvexAuthProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexAuthProviderBase client={convex}>
      {children}
    </ConvexAuthProviderBase>
  );
}

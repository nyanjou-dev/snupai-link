"use client";

import { useQuery, useConvexAuth } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Dashboard } from "@/components/Dashboard";
import { Landing } from "@/components/Landing";

export default function Home() {
  const me = useQuery(api.session.me);
  const { isAuthenticated } = useConvexAuth();

  // Note: With @convex-dev/auth, user records are created automatically during sign-in
  // No need to manually call store

  if (me === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-ctp-mauve" />
      </div>
    );
  }

  if (!me) {
    return <Landing />;
  }

  return <Dashboard />;
}

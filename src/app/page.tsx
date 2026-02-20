"use client";

import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Dashboard } from "@/components/Dashboard";
import { Landing } from "@/components/Landing";
import { useEffect } from "react";

export default function Home() {
  const me = useQuery(api.session.me);
  const { isAuthenticated } = useConvexAuth();
  const storeUser = useMutation(api.auth.store);

  // Ensure user record is stored when authenticated
  useEffect(() => {
    if (isAuthenticated && me === null) {
      // User is authenticated but record doesn't exist yet, store it
      storeUser().catch(console.error);
    }
  }, [isAuthenticated, me, storeUser]);

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

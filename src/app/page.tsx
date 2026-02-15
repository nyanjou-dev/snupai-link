"use client";

import { useConvexAuth } from "convex/react";
import { Dashboard } from "@/components/Dashboard";
import { Landing } from "@/components/Landing";

export default function Home() {
  const { isAuthenticated, isLoading } = useConvexAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-purple-500" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Landing />;
  }

  return <Dashboard />;
}

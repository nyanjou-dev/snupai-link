"use client";

import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { Dashboard } from "@/components/Dashboard";
import { Landing } from "@/components/Landing";

export default function Home() {
  return (
    <>
      <AuthLoading>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-ctp-mauve" />
        </div>
      </AuthLoading>

      <Authenticated>
        <Dashboard />
      </Authenticated>

      <Unauthenticated>
        <Landing />
      </Unauthenticated>
    </>
  );
}

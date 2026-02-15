"use client";

import { AuthForm } from "@/components/AuthForm";
import { useConvexAuth } from "convex/react";
import { useEffect } from "react";

export default function LoginPage() {
  const { isAuthenticated, isLoading } = useConvexAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      window.location.href = "/";
    }
  }, [isAuthenticated, isLoading]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-ctp-mauve" />
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center text-ctp-subtext1">
        Redirecting…
      </div>
    );
  }

  return <AuthForm onBack={() => (window.location.href = "/")} />;
}

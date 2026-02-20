"use client";

import { useQuery } from "convex/react";
import { useConvexAuth } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AdminDashboard } from "@/components/AdminDashboard";

export default function AdminPage() {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const isAdmin = useQuery(api.admin.isAdmin, isAuthenticated ? {} : "skip");
  const router = useRouter();

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    if (isAdmin === false) {
      router.replace("/dashboard");
    }
  }, [authLoading, isAuthenticated, isAdmin, router]);

  if (authLoading || isAdmin === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-ctp-mauve" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return <AdminDashboard />;
}

"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function getErrorMessage(err: unknown) {
  if (err instanceof Error && err.message) return err.message;
  return "Something went wrong";
}

function readLoginParams() {
  if (typeof window === "undefined") {
    return { reason: "", next: "" };
  }

  const params = new URLSearchParams(window.location.search);
  return {
    reason: params.get("reason") ?? "",
    next: params.get("next") ?? "",
  };
}

export function AuthForm({ onBack }: { onBack?: () => void }) {
  const { signIn } = useAuthActions();
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const authDiagnostics = useQuery(api.session.authDiagnostics);
  const router = useRouter();

  const allowSignup = process.env.NEXT_PUBLIC_ALLOW_SIGNUP !== "false";

  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState("");
  const [nextPath, setNextPath] = useState("");

  const targetPath = nextPath || "/dashboard";

  const authConfigMismatch =
    authDiagnostics !== undefined && authDiagnostics !== null
      ? !authDiagnostics.authDomainMatchesConvexSite
      : false;

  useEffect(() => {
    const { reason, next } = readLoginParams();
    setReason(reason);
    setNextPath(next);
  }, []);

  useEffect(() => {
    if (!authDiagnostics) return;
    console.info("[auth] diagnostics", {
      convexSite: authDiagnostics.convexSite,
      configuredAuthDomain: authDiagnostics.configuredAuthDomain,
      authDomainMatchesConvexSite: authDiagnostics.authDomainMatchesConvexSite,
      hasSiteUrlOverride: authDiagnostics.hasSiteUrlOverride,
    });
  }, [authDiagnostics]);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    router.replace(targetPath);
  }, [authLoading, isAuthenticated, router, targetPath]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!allowSignup && flow === "signUp") {
        setError("Sign up is disabled.");
        return;
      }

      await signIn("password", { email, password, flow });
      // Redirect is handled by useConvexAuth effect once auth state updates.
    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      setError(msg);
      console.error("[auth] sign-in failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const loginMessage = reason === "session-expired" ? "Your session expired. Please sign in again." : "";

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        {onBack && (
          <button onClick={onBack} className="text-ctp-subtext0 hover:text-ctp-subtext1 text-sm">
            ← Back
          </button>
        )}
        <div className="text-center">
          <h1 className="text-3xl font-bold">
            <span className="text-ctp-mauve">snupai</span>
            <span className="text-ctp-subtext1">.link</span>
          </h1>
          <p className="text-ctp-subtext0 mt-2">
            {flow === "signIn" ? "Welcome back" : "Create your account"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {loginMessage && (
            <p className="rounded-lg border border-ctp-surface0 bg-ctp-mantle px-3 py-2 text-sm text-ctp-subtext1">
              {loginMessage}
            </p>
          )}
          {authConfigMismatch && (
            <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
              Auth configuration mismatch detected on backend. Sign-in may fail until Convex auth domain and
              CONVEX_SITE_URL match.
            </p>
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-ctp-mantle border border-ctp-surface0 rounded-lg px-4 py-3 text-ctp-text placeholder-ctp-overlay0 focus:outline-none focus:border-ctp-mauve transition-colors"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-ctp-mantle border border-ctp-surface0 rounded-lg px-4 py-3 text-ctp-text placeholder-ctp-overlay0 focus:outline-none focus:border-ctp-mauve transition-colors"
            required
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-ctp-mauve hover:bg-ctp-mauve/90 disabled:opacity-50 text-white py-3 rounded-lg font-medium transition-colors"
          >
            {loading ? "..." : flow === "signIn" ? "Sign In" : "Sign Up"}
          </button>
        </form>

        {allowSignup ? (
          <p className="text-center text-ctp-subtext0 text-sm">
            {flow === "signIn" ? "No account? " : "Already have one? "}
            <button
              type="button"
              onClick={() => setFlow(flow === "signIn" ? "signUp" : "signIn")}
              className="text-ctp-mauve hover:text-ctp-lavender"
            >
              {flow === "signIn" ? "Sign up" : "Sign in"}
            </button>
          </p>
        ) : (
          <p className="text-center text-ctp-subtext0 text-sm">Sign-ups are disabled.</p>
        )}
      </div>
    </div>
  );
}

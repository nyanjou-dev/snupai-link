"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useMutation } from "convex/react";
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
  const cleanupAuth = useMutation(api.authMaintenance.cleanupInvalidAuthReferences);
  const router = useRouter();
  const allowSignup = process.env.NEXT_PUBLIC_ALLOW_SIGNUP !== "false";
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [waitingForSession, setWaitingForSession] = useState(false);
  const [showSlowSigninHint, setShowSlowSigninHint] = useState(false);
  const [reason, setReason] = useState("");
  const [nextPath, setNextPath] = useState("");

  useEffect(() => {
    const { reason, next } = readLoginParams();
    setReason(reason);
    setNextPath(next);
  }, []);

  useEffect(() => {
    if (!waitingForSession || authLoading) return;
    if (!isAuthenticated) return;

    setWaitingForSession(false);
    setShowSlowSigninHint(false);
    router.replace(nextPath || "/dashboard");
  }, [authLoading, isAuthenticated, nextPath, router, waitingForSession]);

  useEffect(() => {
    if (!waitingForSession) {
      setShowSlowSigninHint(false);
      return;
    }

    const hintTimer = window.setTimeout(() => {
      setShowSlowSigninHint(true);
    }, 8000);

    return () => window.clearTimeout(hintTimer);
  }, [waitingForSession]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setShowSlowSigninHint(false);
    setLoading(true);
    try {
      if (!allowSignup && flow === "signUp") {
        setError("Sign up is disabled.");
        return;
      }
      const result = await signIn("password", { email, password, flow });
      if (result.signingIn) {
        setWaitingForSession(true);
      }
    } catch (err: unknown) {
      const message = getErrorMessage(err);

      if (message.includes("InvalidAccountId")) {
        try {
          await cleanupAuth();
          setError("Fixed stale auth data. Please try again.");
        } catch {
          setError("Auth data looks stale. Please refresh and try again.");
        }
      } else {
        setError(message);
      }
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
          {waitingForSession && (
            <p className="rounded-lg border border-ctp-surface0 bg-ctp-mantle px-3 py-2 text-sm text-ctp-subtext1">
              {showSlowSigninHint
                ? "Still signing you in… mobile networks can be slow. You can keep waiting or retry."
                : "Finishing sign-in…"}
            </p>
          )}
          <button
            type="submit"
            disabled={loading || waitingForSession}
            className="w-full bg-ctp-mauve hover:bg-ctp-mauve/90 disabled:opacity-50 text-white py-3 rounded-lg font-medium transition-colors"
          >
            {waitingForSession ? "Waiting for session…" : loading ? "..." : flow === "signIn" ? "Sign In" : "Sign Up"}
          </button>
          {waitingForSession && (
            <button
              type="button"
              onClick={() => {
                setWaitingForSession(false);
                setShowSlowSigninHint(false);
              }}
              className="w-full border border-ctp-surface0 hover:border-ctp-surface1 text-ctp-subtext1 py-3 rounded-lg font-medium transition-colors"
            >
              Retry sign-in
            </button>
          )}
        </form>

        {allowSignup ? (
          <p className="text-center text-ctp-subtext0 text-sm">
            {flow === "signIn" ? "No account? " : "Already have one? "}
            <button
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

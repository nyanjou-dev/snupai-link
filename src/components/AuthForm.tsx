"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useConvex, useConvexAuth, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useCallback, useEffect, useRef, useState } from "react";
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

const SESSION_RECOVERY_TIMEOUT_MS = 25000;
const SESSION_RECOVERY_POLL_MS = 2500;
const SLOW_SIGNIN_HINT_MS = 8000;

export function AuthForm({ onBack }: { onBack?: () => void }) {
  const { signIn } = useAuthActions();
  const convex = useConvex();
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
  const [showContinueFallback, setShowContinueFallback] = useState(false);
  const [phaseMessage, setPhaseMessage] = useState("");
  const [reason, setReason] = useState("");
  const [nextPath, setNextPath] = useState("");
  const waitingStartedAtRef = useRef<number | null>(null);
  const redirectInProgressRef = useRef(false);

  const targetPath = nextPath || "/dashboard";

  const verifySession = useCallback(async () => {
    try {
      const me = await convex.query(api.session.me, {});
      return Boolean(me?.userId);
    } catch {
      return false;
    }
  }, [convex]);

  const finishSignIn = useCallback(() => {
    if (redirectInProgressRef.current) return;
    redirectInProgressRef.current = true;
    setWaitingForSession(false);
    setShowSlowSigninHint(false);
    setShowContinueFallback(false);
    setPhaseMessage("Signed in. Redirecting…");
    setError("");
    router.replace(targetPath);
  }, [router, targetPath]);

  useEffect(() => {
    const { reason, next } = readLoginParams();
    setReason(reason);
    setNextPath(next);
  }, []);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    finishSignIn();
  }, [authLoading, finishSignIn, isAuthenticated]);

  useEffect(() => {
    if (!waitingForSession) {
      waitingStartedAtRef.current = null;
      setShowSlowSigninHint(false);
      if (!redirectInProgressRef.current) {
        setPhaseMessage("");
      }
      return;
    }

    waitingStartedAtRef.current = Date.now();
    setPhaseMessage("Finishing sign-in…");

    const hintTimer = window.setTimeout(() => {
      setShowSlowSigninHint(true);
      setPhaseMessage("Still waiting for your session to sync…");
    }, SLOW_SIGNIN_HINT_MS);

    const pollTimer = window.setInterval(async () => {
      const verified = await verifySession();
      if (verified) {
        finishSignIn();
        return;
      }

      const waitingStartedAt = waitingStartedAtRef.current;
      if (waitingStartedAt && Date.now() - waitingStartedAt >= SESSION_RECOVERY_TIMEOUT_MS) {
        setWaitingForSession(false);
        setShowSlowSigninHint(false);
        setShowContinueFallback(true);
        setPhaseMessage("Session sync is taking longer than expected.");
        setError("You can retry sign-in, or continue to dashboard and let the app re-check your session.");
      }
    }, SESSION_RECOVERY_POLL_MS);

    return () => {
      window.clearTimeout(hintTimer);
      window.clearInterval(pollTimer);
    };
  }, [finishSignIn, verifySession, waitingForSession]);

  const attemptSignIn = useCallback(async () => {
    waitingStartedAtRef.current = null;
    setError("");
    setWaitingForSession(false);
    setShowSlowSigninHint(false);
    setShowContinueFallback(false);
    setLoading(true);
    setPhaseMessage(flow === "signIn" ? "Signing you in…" : "Creating account…");

    try {
      if (!allowSignup && flow === "signUp") {
        setError("Sign up is disabled.");
        setPhaseMessage("");
        return;
      }

      const result = await signIn("password", { email, password, flow });
      if (result.signingIn) {
        setWaitingForSession(true);
        return;
      }

      setPhaseMessage("Verifying your session…");
      const verified = await verifySession();
      if (verified) {
        finishSignIn();
      } else {
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
      setPhaseMessage("");
    } finally {
      setLoading(false);
    }
  }, [allowSignup, cleanupAuth, email, finishSignIn, flow, password, signIn, verifySession]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await attemptSignIn();
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
          {phaseMessage && !error && (
            <p className="rounded-lg border border-ctp-surface0 bg-ctp-mantle px-3 py-2 text-sm text-ctp-subtext1">
              {phaseMessage}
            </p>
          )}
          {error && <p className="text-red-400 text-sm">{error}</p>}
          {waitingForSession && (
            <p className="rounded-lg border border-ctp-surface0 bg-ctp-mantle px-3 py-2 text-sm text-ctp-subtext1">
              {showSlowSigninHint
                ? "Still signing you in… network/session sync can be slow. You can retry anytime."
                : "Waiting for session…"}
            </p>
          )}
          <button
            type="submit"
            disabled={loading || waitingForSession}
            className="w-full bg-ctp-mauve hover:bg-ctp-mauve/90 disabled:opacity-50 text-white py-3 rounded-lg font-medium transition-colors"
          >
            {waitingForSession ? "Waiting for session…" : loading ? "..." : flow === "signIn" ? "Sign In" : "Sign Up"}
          </button>
          {(waitingForSession || showContinueFallback) && (
            <button
              type="button"
              disabled={loading}
              onClick={attemptSignIn}
              className="w-full border border-ctp-surface0 hover:border-ctp-surface1 disabled:opacity-50 text-ctp-subtext1 py-3 rounded-lg font-medium transition-colors"
            >
              Retry sign-in
            </button>
          )}
          {showContinueFallback && (
            <button
              type="button"
              onClick={() => {
                setError("");
                setPhaseMessage("Continuing to dashboard…");
                router.replace(targetPath);
              }}
              className="w-full border border-ctp-surface0 hover:border-ctp-surface1 text-ctp-subtext1 py-3 rounded-lg font-medium transition-colors"
            >
              Continue to dashboard
            </button>
          )}
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

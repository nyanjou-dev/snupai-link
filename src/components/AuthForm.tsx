"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Step = "credentials" | "verify-email" | "forgot-password" | "reset-verification";

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
  const [step, setStep] = useState<Step>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
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

      const result = await signIn("password", { email, password, flow });
      if (!result.signingIn) {
        // Verification email was sent, transition to verify step
        setStep("verify-email");
      }
      // If signingIn is true, the useConvexAuth effect handles redirect
    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      setError(msg);
      console.error("[auth] sign-in failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signIn("password", {
        email,
        code: verificationCode,
        flow: "email-verification",
      });
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setError("");
    setLoading(true);
    try {
      await signIn("password", { email, password, flow });
    } catch {
      // Expected - resend triggers the verification flow again
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signIn("password", { email, flow: "reset" });
      setStep("reset-verification");
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResetVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signIn("password", {
        email,
        code: verificationCode,
        newPassword,
        flow: "reset-verification",
      });
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResendReset = async () => {
    setError("");
    setLoading(true);
    try {
      await signIn("password", { email, flow: "reset" });
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const loginMessage = reason === "session-expired" ? "Your session expired. Please sign in again." : "";

  const inputClasses =
    "w-full bg-ctp-mantle border border-ctp-surface0 rounded-lg px-4 py-3 text-ctp-text placeholder-ctp-overlay0 focus:outline-none focus:border-ctp-mauve transition-colors";

  // --- Verify Email Step ---
  if (step === "verify-email") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold">
              <span className="text-ctp-mauve">snupai</span>
              <span className="text-ctp-subtext1">.link</span>
            </h1>
            <p className="text-ctp-subtext0 mt-2">Check your email</p>
            <p className="text-ctp-overlay1 text-sm mt-1">
              We sent a 6-digit code to <span className="text-ctp-text">{email}</span>
            </p>
          </div>

          <form onSubmit={handleVerifyEmail} className="space-y-4">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              placeholder="000000"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className={`${inputClasses} text-center text-2xl font-mono tracking-[0.3em]`}
              required
              autoFocus
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading || verificationCode.length !== 6}
              className="w-full bg-ctp-mauve hover:bg-ctp-mauve/90 disabled:opacity-50 text-white py-3 rounded-lg font-medium transition-colors"
            >
              {loading ? "..." : "Verify"}
            </button>
          </form>

          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={handleResendVerification}
              disabled={loading}
              className="text-ctp-mauve hover:text-ctp-lavender disabled:opacity-50"
            >
              Resend code
            </button>
            <button
              type="button"
              onClick={() => {
                setStep("credentials");
                setVerificationCode("");
                setError("");
              }}
              className="text-ctp-subtext0 hover:text-ctp-subtext1"
            >
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Forgot Password Step ---
  if (step === "forgot-password") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold">
              <span className="text-ctp-mauve">snupai</span>
              <span className="text-ctp-subtext1">.link</span>
            </h1>
            <p className="text-ctp-subtext0 mt-2">Reset your password</p>
          </div>

          <form onSubmit={handleForgotPassword} className="space-y-4">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClasses}
              required
              autoFocus
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-ctp-mauve hover:bg-ctp-mauve/90 disabled:opacity-50 text-white py-3 rounded-lg font-medium transition-colors"
            >
              {loading ? "..." : "Send reset code"}
            </button>
          </form>

          <p className="text-center text-sm">
            <button
              type="button"
              onClick={() => {
                setStep("credentials");
                setError("");
              }}
              className="text-ctp-subtext0 hover:text-ctp-subtext1"
            >
              Back to sign in
            </button>
          </p>
        </div>
      </div>
    );
  }

  // --- Reset Verification Step ---
  if (step === "reset-verification") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold">
              <span className="text-ctp-mauve">snupai</span>
              <span className="text-ctp-subtext1">.link</span>
            </h1>
            <p className="text-ctp-subtext0 mt-2">Enter your reset code</p>
            <p className="text-ctp-overlay1 text-sm mt-1">
              We sent a 6-digit code to <span className="text-ctp-text">{email}</span>
            </p>
          </div>

          <form onSubmit={handleResetVerification} className="space-y-4">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              placeholder="000000"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className={`${inputClasses} text-center text-2xl font-mono tracking-[0.3em]`}
              required
              autoFocus
            />
            <input
              type="password"
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={inputClasses}
              required
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading || verificationCode.length !== 6}
              className="w-full bg-ctp-mauve hover:bg-ctp-mauve/90 disabled:opacity-50 text-white py-3 rounded-lg font-medium transition-colors"
            >
              {loading ? "..." : "Reset password"}
            </button>
          </form>

          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={handleResendReset}
              disabled={loading}
              className="text-ctp-mauve hover:text-ctp-lavender disabled:opacity-50"
            >
              Resend code
            </button>
            <button
              type="button"
              onClick={() => {
                setStep("forgot-password");
                setVerificationCode("");
                setNewPassword("");
                setError("");
              }}
              className="text-ctp-subtext0 hover:text-ctp-subtext1"
            >
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Credentials Step (default) ---
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        {onBack && (
          <button onClick={onBack} className="text-ctp-subtext0 hover:text-ctp-subtext1 text-sm">
            &larr; Back
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
            className={inputClasses}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClasses}
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

        <div className="space-y-2 text-center text-sm">
          {flow === "signIn" && (
            <p>
              <button
                type="button"
                onClick={() => {
                  setStep("forgot-password");
                  setError("");
                }}
                className="text-ctp-overlay1 hover:text-ctp-subtext1"
              >
                Forgot password?
              </button>
            </p>
          )}

          {allowSignup ? (
            <p className="text-ctp-subtext0">
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
            <p className="text-ctp-subtext0">Sign-ups are disabled.</p>
          )}
        </div>
      </div>
    </div>
  );
}

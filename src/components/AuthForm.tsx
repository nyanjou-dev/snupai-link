"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";

export function AuthForm({ onBack }: { onBack?: () => void }) {
  const { signIn } = useAuthActions();
  const cleanupAuth = useMutation(api.authMaintenance.cleanupInvalidAuthReferences);
  const allowSignup = process.env.NEXT_PUBLIC_ALLOW_SIGNUP !== "false";
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
      // Send users straight to dashboard after auth.
      window.location.href = "/dashboard";
      return;
    } catch (err: any) {
      const message = String(err?.message || "Something went wrong");

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

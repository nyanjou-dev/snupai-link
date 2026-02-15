"use client";

import { useState } from "react";
import { AuthForm } from "./AuthForm";

export function Landing() {
  const [showAuth, setShowAuth] = useState(false);

  if (showAuth) return <AuthForm onBack={() => setShowAuth(false)} />;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="text-center space-y-6 max-w-lg">
        <h1 className="text-5xl font-bold tracking-tight">
          <span className="text-purple-400">snupai</span>
          <span className="text-zinc-400">.link</span>
        </h1>
        <p className="text-zinc-400 text-lg">
          Clean, fast link shortener. Track clicks, manage links, look good doing it.
        </p>
        <button
          onClick={() => setShowAuth(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-lg font-medium transition-colors text-lg"
        >
          Get Started
        </button>
      </div>
      <footer className="absolute bottom-6 text-zinc-600 text-sm">
        made with 💜 by snupai
      </footer>
    </div>
  );
}

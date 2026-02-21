"use client";

import Link from "next/link";

export function Landing() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="text-center space-y-6 max-w-lg animate-fade-in-up">
        <div className="relative inline-block">
          <div className="absolute inset-0 blur-3xl opacity-20 bg-ctp-mauve rounded-full scale-150" />
          <h1 className="relative text-5xl font-bold tracking-tight">
            <span className="text-ctp-mauve">snupai</span>
            <span className="text-ctp-subtext1">.link</span>
          </h1>
        </div>
        <p className="text-ctp-subtext1 text-lg">
          Clean, fast link shortener. Track clicks, manage links, look good doing it.
        </p>

        <Link
          href="/login"
          className="inline-flex items-center justify-center px-10 py-3.5 rounded-lg font-semibold text-lg bg-ctp-mauve text-ctp-crust hover:bg-ctp-mauve/90 transition-colors"
        >
          Get Started →
        </Link>
      </div>

      <footer className="fixed bottom-6 text-ctp-overlay0 text-sm">made with 💜 by snupai</footer>
    </div>
  );
}

"use client";

import Link from "next/link";

export function Landing() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="text-center space-y-6 max-w-lg">
        <h1 className="text-5xl font-bold tracking-tight">
          <span className="text-ctp-mauve">snupai</span>
          <span className="text-ctp-subtext1">.link</span>
        </h1>
        <p className="text-ctp-subtext1 text-lg">
          Clean, fast link shortener. Track clicks, manage links, look good doing it.
        </p>

        <Link
          href="/login"
          className="inline-flex items-center justify-center px-10 py-4 rounded-xl font-semibold text-lg shadow-sm bg-ctp-mauve text-ctp-crust hover:bg-ctp-mauve/90 transition-colors"
        >
          Get Started →
        </Link>
      </div>

      <footer className="absolute bottom-6 text-ctp-overlay0 text-sm">made with 💜 by snupai</footer>
    </div>
  );
}

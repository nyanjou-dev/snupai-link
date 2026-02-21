"use client";

import Link from "next/link";

export function Landing() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="text-center space-y-8 max-w-lg animate-fade-in-up">
        <h1 className="text-6xl sm:text-7xl font-extrabold tracking-tighter">
          <span className="text-ctp-mauve">snupai</span>
          <span className="text-ctp-subtext1">.link</span>
        </h1>
        <p className="text-ctp-overlay1 text-base">
          Clean, fast link shortener. Track clicks, manage links, look good doing it.
        </p>

        <Link
          href="/login"
          className="inline-flex items-center justify-center rounded-full px-8 py-3 text-base font-semibold bg-ctp-mauve text-ctp-crust hover:bg-ctp-mauve/90 transition-colors"
        >
          Get Started →
        </Link>
      </div>

      <footer className="mt-auto pb-8 text-ctp-overlay0 text-sm">made with 💜 by snupai</footer>
    </div>
  );
}

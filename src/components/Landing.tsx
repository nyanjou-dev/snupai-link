"use client";

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
        <a
          href="/login"
          className="inline-flex items-center justify-center px-10 py-4 rounded-xl font-semibold text-lg shadow-sm"
          style={{
            background: "var(--ctp-mauve)",
            color: "#11111b",
          }}
        >
          Get Started →
        </a>

        <div className="text-sm" style={{ color: "var(--ctp-overlay0)" }}>
          Already have an account?{" "}
          <a href="/login" className="font-medium underline underline-offset-4" style={{ color: "var(--ctp-mauve)" }}>
            Sign in
          </a>
          {" "}·{" "}
          <a href="/login" className="font-medium underline underline-offset-4" style={{ color: "var(--ctp-mauve)" }}>
            Create account
          </a>
        </div>
      </div>
      <footer className="absolute bottom-6 text-ctp-overlay0 text-sm">
        made with 💜 by snupai
      </footer>
    </div>
  );
}

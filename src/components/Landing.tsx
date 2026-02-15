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
          className="inline-flex items-center justify-center bg-ctp-mauve hover:bg-ctp-mauve/90 text-white px-8 py-3 rounded-lg font-medium transition-colors text-lg"
        >
          Get Started
        </Link>
        <div className="text-ctp-overlay0 text-sm">
          Already have an account?{" "}
          <Link href="/login" className="text-ctp-mauve hover:text-ctp-lavender">
            Sign in
          </Link>
        </div>
      </div>
      <footer className="absolute bottom-6 text-ctp-overlay0 text-sm">
        made with 💜 by snupai
      </footer>
    </div>
  );
}

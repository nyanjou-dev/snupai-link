import Link from "next/link";

type UnavailablePageProps = {
  searchParams?: Promise<{ reason?: string }>;
};

function contentForReason(reason?: string) {
  if (reason === "max-clicks") {
    return {
      badge: "Limit reached",
      title: "This short link has reached its visit limit",
      description:
        "The owner capped how many times this link can be opened. It is currently unavailable.",
    };
  }

  if (reason === "suspended") {
    return {
      badge: "Suspended",
      title: "This short link is unavailable",
      description:
        "The account that owns this link has been suspended. This link is currently disabled.",
    };
  }

  return {
    badge: "Expired",
    title: "This short link has expired",
    description:
      "The owner set an expiration date for this link, and it is no longer active.",
  };
}

export default async function UnavailablePage({ searchParams }: UnavailablePageProps) {
  const params = searchParams ? await searchParams : undefined;
  const reason = params?.reason;
  const content = contentForReason(reason);

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-ctp-base text-ctp-text">
      <div className="max-w-md w-full bg-ctp-mantle border border-ctp-surface0 rounded-2xl p-8 text-center space-y-4 shadow-lg shadow-ctp-crust/20">
        <span className="inline-flex rounded-full border border-ctp-surface1 bg-ctp-base px-3 py-1 text-xs text-ctp-subtext1">
          {content.badge}
        </span>
        <h1 className="text-2xl font-semibold leading-tight">{content.title}</h1>
        <p className="text-ctp-subtext0">{content.description}</p>
        <p className="text-ctp-overlay0 text-sm">If you still need access, ask the person who shared this link for a new one.</p>

        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-lg border border-ctp-surface1 bg-ctp-base px-4 py-2 text-sm text-ctp-subtext1 hover:text-ctp-text hover:border-ctp-mauve transition-colors"
        >
          Back to snupai.link
        </Link>
      </div>
    </main>
  );
}

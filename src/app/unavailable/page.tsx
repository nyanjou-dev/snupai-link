type UnavailablePageProps = {
  searchParams?: Promise<{ reason?: string }>;
};

export default async function UnavailablePage({ searchParams }: UnavailablePageProps) {
  const params = searchParams ? await searchParams : undefined;
  const reason = params?.reason;

  const title = reason === "max-clicks" ? "This link hit its click limit" : "This link has expired";
  const description =
    reason === "max-clicks"
      ? "The owner set a maximum number of visits for this short link."
      : "The owner set an expiration date and this short link is no longer active.";

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-ctp-base text-ctp-text">
      <div className="max-w-md w-full bg-ctp-mantle border border-ctp-surface0 rounded-2xl p-8 text-center space-y-3">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="text-ctp-subtext0">{description}</p>
        <p className="text-ctp-overlay0 text-sm">If you need access, please ask the person who shared this link.</p>
      </div>
    </main>
  );
}

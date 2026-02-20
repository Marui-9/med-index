import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

/**
 * Loading skeleton for /claims/[claimId] — matches claim detail layout.
 */
export default function ClaimDetailLoading() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto max-w-3xl px-4 py-8">
          {/* Breadcrumb */}
          <div className="mb-6 h-4 w-32 animate-pulse rounded bg-muted" />

          {/* Title + badge */}
          <div className="mb-2 flex items-center gap-2">
            <div className="h-6 w-16 animate-pulse rounded-full bg-muted" />
            <div className="h-8 w-3/4 animate-pulse rounded bg-muted" />
          </div>

          {/* Description */}
          <div className="mb-6 space-y-2">
            <div className="h-4 w-full animate-pulse rounded bg-muted" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
          </div>

          {/* Vote stats panel */}
          <div className="mb-6 rounded-lg border p-6">
            <div className="mb-3 h-5 w-32 animate-pulse rounded bg-muted" />
            <div className="h-4 w-full animate-pulse rounded-full bg-muted" />
            <div className="mt-2 flex justify-between">
              <div className="h-4 w-16 animate-pulse rounded bg-muted" />
              <div className="h-4 w-16 animate-pulse rounded bg-muted" />
            </div>
          </div>

          {/* Vote buttons */}
          <div className="mb-8 flex gap-3">
            <div className="h-10 w-28 animate-pulse rounded bg-muted" />
            <div className="h-10 w-28 animate-pulse rounded bg-muted" />
          </div>

          {/* Evidence section */}
          <div className="mb-4 h-6 w-40 animate-pulse rounded bg-muted" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-lg border p-4">
                <div className="mb-2 h-5 w-3/4 animate-pulse rounded bg-muted" />
                <div className="h-4 w-full animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

/**
 * Loading skeleton for /coins — matches coin history layout.
 */
export default function CoinsLoading() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <div className="mb-2 h-9 w-40 animate-pulse rounded bg-muted" />
              <div className="h-5 w-64 animate-pulse rounded bg-muted" />
            </div>
            <div className="rounded-lg border p-4 text-center">
              <div className="mx-auto mb-1 h-4 w-24 animate-pulse rounded bg-muted" />
              <div className="mx-auto h-9 w-12 animate-pulse rounded bg-muted" />
            </div>
          </div>

          {/* Earnings grid */}
          <div className="mb-8 grid gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>

          {/* Spending grid */}
          <div className="mb-8 grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>

          {/* Transaction skeletons */}
          <div className="mb-4 h-6 w-32 animate-pulse rounded bg-muted" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-2">
                  <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-48 animate-pulse rounded bg-muted" />
                </div>
                <div className="h-5 w-12 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

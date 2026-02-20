import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

/**
 * Loading skeleton for /dashboard — matches dashboard layout.
 */
export default function DashboardLoading() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-2 h-9 w-40 animate-pulse rounded bg-muted" />
          <div className="mb-8 h-5 w-64 animate-pulse rounded bg-muted" />

          {/* Stats grid */}
          <div className="mb-8 grid gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-lg border p-4">
                <div className="mb-2 h-4 w-20 animate-pulse rounded bg-muted" />
                <div className="h-8 w-16 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>

          {/* Section skeleton */}
          <div className="mb-8">
            <div className="mb-4 h-6 w-40 animate-pulse rounded bg-muted" />
            <div className="h-32 animate-pulse rounded-lg bg-muted" />
          </div>

          <div>
            <div className="mb-4 h-6 w-48 animate-pulse rounded bg-muted" />
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

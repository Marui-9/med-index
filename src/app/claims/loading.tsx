import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

/**
 * Loading skeleton for /claims — matches ClaimsList layout.
 */
export default function ClaimsLoading() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-2 h-9 w-48 animate-pulse rounded bg-muted" />
          <div className="mb-8 h-5 w-80 animate-pulse rounded bg-muted" />

          {/* Claim card skeletons */}
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rounded-lg border p-6">
                <div className="mb-3 flex items-center gap-2">
                  <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
                  <div className="h-6 w-3/4 animate-pulse rounded bg-muted" />
                </div>
                <div className="mb-4 h-4 w-full animate-pulse rounded bg-muted" />
                <div className="flex items-center gap-4">
                  <div className="h-8 w-20 animate-pulse rounded bg-muted" />
                  <div className="h-8 w-20 animate-pulse rounded bg-muted" />
                  <div className="ml-auto h-4 w-24 animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

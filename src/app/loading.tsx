import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

/**
 * Root loading skeleton — shown during top-level navigation.
 */
export default function RootLoading() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          {/* Title skeleton */}
          <div className="mb-2 h-9 w-64 animate-pulse rounded bg-muted" />
          <div className="mb-8 h-5 w-96 animate-pulse rounded bg-muted" />

          {/* Content skeleton */}
          <div className="space-y-4">
            <div className="h-32 animate-pulse rounded-lg bg-muted" />
            <div className="h-32 animate-pulse rounded-lg bg-muted" />
            <div className="h-32 animate-pulse rounded-lg bg-muted" />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

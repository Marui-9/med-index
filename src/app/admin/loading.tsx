export default function AdminLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="h-8 w-48 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-4 w-72 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-10 w-32 animate-pulse rounded bg-muted" />
      </div>

      {/* Stats cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-4">
            <div className="mx-auto h-8 w-12 animate-pulse rounded bg-muted" />
            <div className="mx-auto mt-2 h-3 w-16 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="mb-4 flex items-center gap-3">
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        <div className="h-8 w-32 animate-pulse rounded bg-muted" />
      </div>

      {/* Table skeleton */}
      <div className="rounded-lg border">
        <div className="border-b bg-muted/50 px-4 py-3">
          <div className="flex gap-8">
            {["w-48", "w-20", "w-20", "w-16", "w-16", "w-24"].map(
              (w, i) => (
                <div
                  key={i}
                  className={`h-4 ${w} animate-pulse rounded bg-muted`}
                />
              ),
            )}
          </div>
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="border-b px-4 py-3">
            <div className="flex items-center gap-8">
              <div className="h-4 w-48 animate-pulse rounded bg-muted" />
              <div className="h-4 w-20 animate-pulse rounded bg-muted" />
              <div className="h-4 w-20 animate-pulse rounded bg-muted" />
              <div className="h-4 w-16 animate-pulse rounded bg-muted" />
              <div className="h-4 w-16 animate-pulse rounded bg-muted" />
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

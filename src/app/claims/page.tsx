import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

export default async function ClaimsPage() {
  // This page is accessible to everyone
  // Voting logic will check for session/guest in Phase 1

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          <h1 className="mb-2 text-3xl font-bold">Health Claims</h1>
          <p className="mb-8 text-muted-foreground">
            Vote on claims and test your health knowledge against AI research.
          </p>

          {/* Claims list placeholder - will be populated in Phase 1 */}
          <div className="grid gap-4">
            {/* Example claim cards - these will be dynamic in Phase 1 */}
            <div className="rounded-lg border p-6">
              <h2 className="mb-2 text-xl font-semibold">
                Vitamin D supplementation reduces the severity of common colds
              </h2>
              <p className="mb-4 text-sm text-muted-foreground">
                1,247 people voted • Medium difficulty
              </p>
              <div className="flex gap-3">
                <button className="rounded-md bg-green-600 px-6 py-2 text-sm font-medium text-white hover:bg-green-700">
                  YES (1 credit)
                </button>
                <button className="rounded-md bg-red-600 px-6 py-2 text-sm font-medium text-white hover:bg-red-700">
                  NO (1 credit)
                </button>
              </div>
            </div>

            <div className="rounded-lg border p-6">
              <h2 className="mb-2 text-xl font-semibold">
                Intermittent fasting improves insulin sensitivity
              </h2>
              <p className="mb-4 text-sm text-muted-foreground">
                892 people voted • Hard difficulty
              </p>
              <div className="flex gap-3">
                <button className="rounded-md bg-green-600 px-6 py-2 text-sm font-medium text-white hover:bg-green-700">
                  YES (1 credit)
                </button>
                <button className="rounded-md bg-red-600 px-6 py-2 text-sm font-medium text-white hover:bg-red-700">
                  NO (1 credit)
                </button>
              </div>
            </div>

            <div className="rounded-lg border p-6">
              <h2 className="mb-2 text-xl font-semibold">
                Drinking 8 glasses of water daily is necessary for optimal health
              </h2>
              <p className="mb-4 text-sm text-muted-foreground">
                2,103 people voted • Easy difficulty
              </p>
              <div className="flex gap-3">
                <button className="rounded-md bg-green-600 px-6 py-2 text-sm font-medium text-white hover:bg-green-700">
                  YES (1 credit)
                </button>
                <button className="rounded-md bg-red-600 px-6 py-2 text-sm font-medium text-white hover:bg-red-700">
                  NO (1 credit)
                </button>
              </div>
            </div>
          </div>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            More claims coming soon. Claims are curated by our research team.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}

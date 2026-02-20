import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { DailyLoginBanner } from "@/components/daily-login-banner";

export const metadata: Metadata = {
  title: "HealthProof - Verify Health & Fitness Claims with Science",
  description:
    "Vote on popular health and fitness claims. Our AI analyzes peer-reviewed research to reveal the scientific truth. Earn reputation by making correct predictions.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "HealthProof - Verify Health & Fitness Claims with Science",
    description:
      "Vote on popular health and fitness claims. Our AI analyzes peer-reviewed research to reveal the scientific truth.",
    url: "/",
  },
};

export default async function HomePage() {
  const session = await auth();

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <DailyLoginBanner />

      {/* Hero Section */}
      <main className="flex-1">
        <section className="container mx-auto px-4 py-24 text-center">
          <h1 className="mb-6 text-5xl font-bold tracking-tight">
            Health Claims,{" "}
            <span className="text-primary">Verified by Science</span>
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-xl text-muted-foreground">
            Vote on popular health claims. Our AI analyzes peer-reviewed
            research to reveal the scientific truth. Earn reputation by making
            correct predictions.
          </p>

          <div className="flex justify-center gap-4">
            <Link
              href="/claims"
              className="rounded-md bg-primary px-6 py-3 text-lg font-medium text-primary-foreground hover:bg-primary/90"
            >
              Browse Claims
            </Link>
            <Link
              href="/about"
              className="rounded-md border border-input bg-background px-6 py-3 text-lg font-medium hover:bg-accent"
            >
              How It Works
            </Link>
          </div>

          {/* Guest credits callout */}
          {!session?.user && (
            <p className="mt-8 text-sm text-muted-foreground">
              🎁 Get <strong>4 free credits</strong> to start voting now • Sign
              up for <strong>5 more</strong>
            </p>
          )}
        </section>

        {/* How It Works */}
        <section className="border-t bg-muted/30">
          <div className="container mx-auto px-4 py-16">
            <h2 className="mb-12 text-center text-3xl font-bold">
              How It Works
            </h2>
            <div className="grid gap-8 md:grid-cols-3">
              <div className="text-center">
                <div className="mb-4 flex justify-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
                    1
                  </div>
                </div>
                <h3 className="mb-2 text-xl font-semibold">Vote on Claims</h3>
                <p className="text-muted-foreground">
                  See health claims like "Vitamin D prevents colds" and vote YES
                  or NO based on your intuition.
                </p>
              </div>
              <div className="text-center">
                <div className="mb-4 flex justify-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
                    2
                  </div>
                </div>
                <h3 className="mb-2 text-xl font-semibold">Wait or Reveal</h3>
                <p className="text-muted-foreground">
                  After 6 hours, see the AI verdict for free. Or spend 5 credits
                  to reveal it immediately.
                </p>
              </div>
              <div className="text-center">
                <div className="mb-4 flex justify-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
                    3
                  </div>
                </div>
                <h3 className="mb-2 text-xl font-semibold">Earn Reputation</h3>
                <p className="text-muted-foreground">
                  Correct predictions boost your reputation. Climb the
                  leaderboard and earn bragging rights.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

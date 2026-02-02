import Link from "next/link";
import { auth } from "@/lib/auth";

export default async function HomePage() {
  const session = await auth();

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="text-xl font-bold text-primary">
            HealthProof
          </Link>
          <nav className="flex items-center gap-4">
            <Link
              href="/claims"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Browse Claims
            </Link>
            {session?.user ? (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">
                    {session.user.credits} credits
                  </span>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-muted-foreground">
                    {session.user.reputation} rep
                  </span>
                </div>
                <Link
                  href="/dashboard"
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Dashboard
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/auth/signin"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/signup"
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </nav>
        </div>
      </header>

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

      {/* Footer */}
      <footer className="border-t">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 text-sm text-muted-foreground">
          <p>© 2026 HealthProof. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-foreground">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

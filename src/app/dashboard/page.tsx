import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { DailyLoginBanner } from "@/components/daily-login-banner";
import { CoinHistory } from "@/components/coin-history";

export const metadata: Metadata = {
  title: "Dashboard",
  description:
    "View your HealthProof dashboard — track your votes, coins, and reputation across health and fitness claims.",
  robots: { index: false, follow: false },
};

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <DailyLoginBanner />

      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          <h1 className="mb-2 text-3xl font-bold">Dashboard</h1>
          <p className="mb-8 text-muted-foreground">
            Welcome back, {session.user.name || session.user.email}!
          </p>

          {/* Stats cards */}
          <div className="mb-8 grid gap-4 md:grid-cols-4">
            <Link
              href="/coins"
              className="rounded-lg border p-4 transition-colors hover:bg-accent"
            >
              <p className="text-sm text-muted-foreground">Credits</p>
              <p className="text-2xl font-bold text-amber-600">
                {session.user.credits}
              </p>
              <p className="mt-1 text-xs text-primary">View history →</p>
            </Link>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Reputation</p>
              <p className="text-2xl font-bold">{session.user.reputation}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Votes Cast</p>
              <p className="text-2xl font-bold">—</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Accuracy</p>
              <p className="text-2xl font-bold">—</p>
            </div>
          </div>

          {/* Pending reveals section */}
          <section className="mb-8">
            <h2 className="mb-4 text-xl font-semibold">Pending Reveals</h2>
            <p className="text-sm text-muted-foreground">
              Claims you've voted on that haven't been revealed yet.
            </p>
            <div className="mt-4 rounded-lg border border-dashed p-8 text-center text-muted-foreground">
              No pending reveals. Vote on some claims!
            </div>
          </section>

          {/* Recent coin activity */}
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Recent Coin Activity</h2>
              <Link
                href="/coins"
                className="text-sm text-primary hover:underline"
              >
                View all →
              </Link>
            </div>
            <CoinHistory pageSize={5} />
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}

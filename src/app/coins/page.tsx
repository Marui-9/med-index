import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { DailyLoginBanner } from "@/components/daily-login-banner";
import { CoinHistory } from "@/components/coin-history";

export const metadata = {
  title: "Coin History",
  description: "View your HealthProof coin transaction history.",
};

export default async function CoinsPage() {
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
          {/* Page header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Coin History</h1>
              <p className="mt-1 text-muted-foreground">
                Track every coin you've earned and spent.
              </p>
            </div>
            <div className="rounded-lg border p-4 text-center">
              <p className="text-sm text-muted-foreground">Current Balance</p>
              <p className="text-3xl font-bold text-amber-600">
                {session.user.credits ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">coins</p>
            </div>
          </div>

          {/* Earning opportunities */}
          <div className="mb-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border bg-green-50 p-4">
              <p className="text-sm font-medium text-green-800">Daily Login</p>
              <p className="text-xs text-green-700">+2 coins / day</p>
            </div>
            <div className="rounded-lg border bg-blue-50 p-4">
              <p className="text-sm font-medium text-blue-800">Newsletter</p>
              <p className="text-xs text-blue-700">+5 coins (one-time)</p>
            </div>
            <div className="rounded-lg border bg-purple-50 p-4">
              <p className="text-sm font-medium text-purple-800">Sign Up</p>
              <p className="text-xs text-purple-700">+5 coins (one-time)</p>
            </div>
          </div>

          {/* Spending info */}
          <div className="mb-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border p-4">
              <p className="text-sm font-medium">Vote on Claims</p>
              <p className="text-xs text-muted-foreground">
                1 coin per vote. Results revealed after 6 hours.
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm font-medium">Unlock Deep Analysis</p>
              <p className="text-xs text-muted-foreground">
                5 coins to see the full AI research breakdown instantly.
              </p>
            </div>
          </div>

          {/* Transaction history */}
          <section>
            <h2 className="mb-4 text-xl font-semibold">Transactions</h2>
            <CoinHistory />
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}

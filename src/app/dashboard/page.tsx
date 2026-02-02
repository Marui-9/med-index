import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/signin");
  }

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
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">{session.user.credits} credits</span>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground">
                {session.user.reputation} rep
              </span>
            </div>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          <h1 className="mb-2 text-3xl font-bold">Dashboard</h1>
          <p className="mb-8 text-muted-foreground">
            Welcome back, {session.user.name || session.user.email}!
          </p>

          {/* Stats cards */}
          <div className="mb-8 grid gap-4 md:grid-cols-4">
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Credits</p>
              <p className="text-2xl font-bold">{session.user.credits}</p>
            </div>
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

          {/* Recent activity */}
          <section>
            <h2 className="mb-4 text-xl font-semibold">Recent Activity</h2>
            <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
              Your voting history will appear here.
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

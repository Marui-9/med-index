import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

export const metadata = {
  title: "Page Not Found",
};

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <p className="text-6xl font-bold text-muted-foreground">404</p>
          <h1 className="mt-4 text-2xl font-semibold">Page Not Found</h1>
          <p className="mt-2 text-muted-foreground">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <div className="mt-6 flex justify-center gap-4">
            <Link
              href="/"
              className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Go Home
            </Link>
            <Link
              href="/claims"
              className="rounded-md border border-input px-6 py-2 text-sm font-medium hover:bg-accent"
            >
              Browse Claims
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

import type { Metadata } from "next";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { ClaimsList } from "@/components/claims-list";
import { DailyLoginBanner } from "@/components/daily-login-banner";

export const metadata: Metadata = {
  title: "Browse Health Claims",
  description:
    "Explore and vote on health and fitness claims. See community predictions and AI-powered scientific verdicts on popular gym, supplement, and nutrition claims.",
  alternates: { canonical: "/claims" },
  openGraph: {
    title: "Browse Health Claims | HealthProof",
    description:
      "Explore and vote on health and fitness claims backed by science.",
    url: "/claims",
  },
};

export default function ClaimsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <DailyLoginBanner />

      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          <h1 className="mb-2 text-3xl font-bold">Health Claims</h1>
          <p className="mb-8 text-muted-foreground">
            Vote on claims and test your health knowledge against AI research.
          </p>

          <ClaimsList />
        </div>
      </main>

      <Footer />
    </div>
  );
}

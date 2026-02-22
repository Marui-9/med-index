import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

export const metadata = {
  title: "About",
  description:
    "Learn how HealthProof uses AI and peer-reviewed research to verify popular health and fitness claims.",
};

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1">
        <div className="container mx-auto max-w-3xl px-4 py-12">
          <h1 className="mb-6 text-4xl font-bold">About HealthProof</h1>

          <div className="prose prose-neutral max-w-none space-y-8">
            {/* Mission */}
            <section>
              <h2 className="text-2xl font-semibold">Our Mission</h2>
              <p className="text-muted-foreground">
                Health misinformation is everywhere — social media, podcasts,
                supplement labels. HealthProof cuts through the noise by
                combining{" "}
                <strong>crowd predictions</strong> with{" "}
                <strong>AI-powered scientific analysis</strong> to verify health
                and fitness claims.
              </p>
              <p className="text-muted-foreground">
                We believe everyone deserves quick, honest answers backed by
                peer-reviewed research — not marketing hype.
              </p>
            </section>

            {/* How it works */}
            <section>
              <h2 className="text-2xl font-semibold">How It Works</h2>
              <ol className="list-decimal space-y-3 pl-6 text-muted-foreground">
                <li>
                  <strong>Browse claims</strong> — We publish popular health and
                  fitness claims like &ldquo;Creatine increases muscle mass&rdquo; or &ldquo;Cold
                  plunges speed recovery.&rdquo;
                </li>
                <li>
                  <strong>Vote YES or NO</strong> — Spend 1 coin to predict
                  whether science supports the claim. Your vote is hidden from
                  others to prevent anchoring bias.
                </li>
                <li>
                  <strong>Wait for the reveal</strong> — After 6 hours, the
                  community votes and the AI verdict are revealed together. Or
                  spend 5 coins to unlock the deep analysis immediately.
                </li>
                <li>
                  <strong>Read the evidence</strong> — Our AI cites specific
                  papers from PubMed and other databases, showing which studies
                  support or refute the claim and how confident the overall
                  evidence is.
                </li>
                <li>
                  <strong>Build reputation</strong> — Correct predictions earn
                  reputation points. The leaderboard shows who best understands
                  health science.
                </li>
              </ol>
            </section>

            {/* Coin economy */}
            <section>
              <h2 className="text-2xl font-semibold">Coins &amp; Credits</h2>
              <p className="text-muted-foreground">
                HealthProof uses a virtual coin system to encourage thoughtful
                participation:
              </p>
              <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
                <li>
                  <strong>Free starter coins</strong> — 4 coins as a guest, 5
                  more when you sign up.
                </li>
                <li>
                  <strong>Daily login bonus</strong> — 2 coins per day, just for
                  showing up.
                </li>
                <li>
                  <strong>Vote cost</strong> — 1 coin per prediction.
                </li>
                <li>
                  <strong>Deep analysis</strong> — 5 coins to skip the 6-hour
                  timer and see the full AI breakdown instantly.
                </li>
              </ul>
              <p className="text-muted-foreground">
                Coins have no monetary value. They exist to make every vote
                count and prevent spamming.
              </p>
            </section>

            {/* AI transparency */}
            <section>
              <h2 className="text-2xl font-semibold">AI Transparency</h2>
              <p className="text-muted-foreground">
                Our AI analyzes claims by searching scientific databases and
                synthesizing relevant papers. Every verdict includes:
              </p>
              <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
                <li>A clear YES / NO / MIXED verdict with confidence level</li>
                <li>
                  Cited papers you can verify yourself on PubMed
                </li>
                <li>
                  Stance labels showing whether each paper supports, refutes, or
                  is neutral toward the claim
                </li>
              </ul>
              <p className="text-muted-foreground">
                We are not a medical advice service. HealthProof is an
                educational tool to help you think critically about health
                claims.
              </p>
            </section>

            {/* Tech nerd section */}
            <section>
              <h2 className="text-2xl font-semibold">Built With</h2>
              <p className="text-muted-foreground">
                Next.js, PostgreSQL, OpenAI, PubMed API, and a lot of coffee.
                HealthProof is an independent project focused on the gym and
                fitness niche.
              </p>
            </section>

            {/* CTA */}
            <div className="flex gap-4 pt-4">
              <Link
                href="/claims"
                className="rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Browse Claims
              </Link>
              <Link
                href="/auth/signup"
                className="rounded-md border border-input px-6 py-3 text-sm font-medium hover:bg-accent"
              >
                Create Account
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

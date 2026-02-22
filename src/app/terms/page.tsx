import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

export const metadata = {
  title: "Terms of Service",
  description: "HealthProof terms of service — rules for using the platform.",
};

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1">
        <div className="container mx-auto max-w-3xl px-4 py-12">
          <h1 className="mb-2 text-4xl font-bold">Terms of Service</h1>
          <p className="mb-8 text-sm text-muted-foreground">
            Last updated: February 20, 2026
          </p>

          <div className="space-y-8 text-muted-foreground">
            <section>
              <h2 className="mb-3 text-xl font-semibold text-foreground">
                1. Acceptance of Terms
              </h2>
              <p>
                By accessing or using HealthProof (&ldquo;the Service&rdquo;), you agree to
                be bound by these Terms of Service. If you do not agree, do not
                use the Service.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-foreground">
                2. Description of Service
              </h2>
              <p>
                HealthProof is an educational platform where users predict
                whether health and fitness claims are supported by scientific
                research. AI-generated verdicts are based on peer-reviewed
                literature and are provided for informational purposes only.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-foreground">
                3. Not Medical Advice
              </h2>
              <p>
                <strong>
                  HealthProof does not provide medical advice, diagnosis, or
                  treatment.
                </strong>{" "}
                AI verdicts and cited papers are for educational and
                entertainment purposes. Always consult a qualified healthcare
                provider for medical decisions.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-foreground">
                4. User Accounts
              </h2>
              <ul className="list-disc space-y-1 pl-6">
                <li>You must be at least 13 years old to create an account.</li>
                <li>
                  You are responsible for keeping your password secure.
                </li>
                <li>
                  One account per person. Duplicate accounts to farm coins may
                  be suspended.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-foreground">
                5. Virtual Coins
              </h2>
              <ul className="list-disc space-y-1 pl-6">
                <li>
                  Coins are virtual credits with <strong>no monetary value</strong>.
                </li>
                <li>Coins cannot be exchanged for real currency.</li>
                <li>
                  We reserve the right to adjust coin balances, earning rates,
                  and costs at any time for platform health.
                </li>
                <li>
                  Abuse of the coin system (bots, multi-accounting, exploits)
                  may result in account suspension.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-foreground">
                6. Acceptable Use
              </h2>
              <p>You agree not to:</p>
              <ul className="mt-2 list-disc space-y-1 pl-6">
                <li>
                  Use automated scripts or bots to interact with the platform.
                </li>
                <li>
                  Attempt to manipulate voting outcomes or exploit platform
                  mechanics.
                </li>
                <li>
                  Upload or share content that is illegal, harmful, or
                  misleading.
                </li>
                <li>
                  Reverse-engineer, scrape, or copy substantial portions of the
                  platform.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-foreground">
                7. Intellectual Property
              </h2>
              <p>
                AI-generated verdicts and platform content are owned by
                HealthProof. Cited research papers belong to their respective
                authors and publishers. You retain ownership of any content you
                submit (e.g., proposed claims in future features).
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-foreground">
                8. Limitation of Liability
              </h2>
              <p>
                HealthProof is provided &ldquo;as is&rdquo; without warranties of any kind.
                We are not liable for decisions made based on AI verdicts,
                community votes, or cited research. Use the platform at your own
                risk.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-foreground">
                9. Account Termination
              </h2>
              <p>
                We may suspend or terminate accounts that violate these terms.
                You may delete your account at any time by contacting us.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-foreground">
                10. Changes to Terms
              </h2>
              <p>
                We may update these terms from time to time. Continued use of
                the Service after changes constitutes acceptance of the new
                terms.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-foreground">
                11. Contact
              </h2>
              <p>
                Questions about these terms? Email us at{" "}
                <strong>legal@healthproof.app</strong>.
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

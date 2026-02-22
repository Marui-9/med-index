import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

export const metadata = {
  title: "Privacy Policy",
  description: "HealthProof privacy policy — how we collect, use, and protect your data.",
};

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1">
        <div className="container mx-auto max-w-3xl px-4 py-12">
          <h1 className="mb-2 text-4xl font-bold">Privacy Policy</h1>
          <p className="mb-8 text-sm text-muted-foreground">
            Last updated: February 20, 2026
          </p>

          <div className="space-y-8 text-muted-foreground">
            <section>
              <h2 className="mb-3 text-xl font-semibold text-foreground">
                1. Information We Collect
              </h2>
              <p>When you use HealthProof, we may collect:</p>
              <ul className="mt-2 list-disc space-y-1 pl-6">
                <li>
                  <strong>Account information</strong> — email address, display
                  name, and hashed password (or OAuth profile data from Google /
                  GitHub).
                </li>
                <li>
                  <strong>Usage data</strong> — votes cast, coins earned/spent,
                  pages visited, timestamps, and IP address.
                </li>
                <li>
                  <strong>Device data</strong> — browser type, operating system,
                  and screen size (via standard HTTP headers).
                </li>
              </ul>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-foreground">
                2. How We Use Your Information
              </h2>
              <ul className="list-disc space-y-1 pl-6">
                <li>Operate and improve the HealthProof platform.</li>
                <li>
                  Display aggregated voting statistics (your individual vote is
                  never shown to other users until the reveal timer expires).
                </li>
                <li>
                  Send optional notifications (e.g., daily login reminders,
                  claim results) if you opt in.
                </li>
                <li>Prevent abuse, fraud, and spam.</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-foreground">
                3. Data Sharing
              </h2>
              <p>
                We do <strong>not</strong> sell your personal data. We may share
                data with:
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-6">
                <li>
                  <strong>Infrastructure providers</strong> — hosting (Railway),
                  database (PostgreSQL), authentication (Auth.js).
                </li>
                <li>
                  <strong>AI services</strong> — OpenAI processes claim text to
                  generate verdicts. No personally identifiable information is
                  sent to AI models.
                </li>
                <li>
                  <strong>Legal requirements</strong> — if required by law or to
                  protect rights and safety.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-foreground">
                4. Cookies &amp; Local Storage
              </h2>
              <p>
                We use session cookies for authentication and localStorage to
                remember UI preferences (e.g., daily login claim status).
                We do not use third-party tracking cookies.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-foreground">
                5. Data Retention
              </h2>
              <p>
                Account data and voting history are retained as long as your
                account is active. You may request deletion of your account and
                associated data by contacting us.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-foreground">
                6. Your Rights
              </h2>
              <p>
                You may request access to, correction of, or deletion of your
                personal data at any time. Contact us at{" "}
                <strong>privacy@healthproof.app</strong>.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-foreground">
                7. Security
              </h2>
              <p>
                Passwords are hashed with bcrypt. All traffic is encrypted via
                HTTPS. We follow industry best practices, but no system is 100%
                secure.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-foreground">
                8. Changes to This Policy
              </h2>
              <p>
                We may update this policy from time to time. Changes will be
                posted on this page with an updated &ldquo;Last updated&rdquo; date.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-foreground">
                9. Contact
              </h2>
              <p>
                Questions about this privacy policy? Email us at{" "}
                <strong>privacy@healthproof.app</strong>.
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

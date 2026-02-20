import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { cn } from "@/lib/utils";
import { SessionProvider } from "@/components/session-provider";

export const metadata: Metadata = {
  title: {
    default: "HealthProof - Verify Health Claims with Science",
    template: "%s | HealthProof",
  },
  description:
    "Predict health claim outcomes and see what scientific research says. Vote on claims, earn reputation, and discover the truth backed by peer-reviewed studies.",
  keywords: [
    "health claims",
    "scientific research",
    "prediction market",
    "evidence-based",
    "medical research",
    "health verification",
  ],
  authors: [{ name: "HealthProof" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "HealthProof",
    title: "HealthProof - Verify Health Claims with Science",
    description:
      "Predict health claim outcomes and see what scientific research says.",
  },
  twitter: {
    card: "summary_large_image",
    title: "HealthProof - Verify Health Claims with Science",
    description:
      "Predict health claim outcomes and see what scientific research says.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          GeistSans.variable,
          GeistMono.variable
        )}
      >
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}

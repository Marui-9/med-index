import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { cn } from "@/lib/utils";
import { SessionProvider } from "@/components/session-provider";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://healthproof.me",
  ),
  title: {
    default: "HealthProof - Verify Health & Fitness Claims with Science",
    template: "%s | HealthProof",
  },
  description:
    "Predict health and fitness claim outcomes and see what scientific research says. Vote on claims, earn reputation, and discover the truth backed by peer-reviewed studies.",
  keywords: [
    "health claims",
    "fitness claims",
    "scientific research",
    "prediction market",
    "evidence-based",
    "medical research",
    "health verification",
    "gym claims",
    "supplement claims",
    "nutrition science",
  ],
  authors: [{ name: "HealthProof" }],
  creator: "HealthProof",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "HealthProof",
    title: "HealthProof - Verify Health & Fitness Claims with Science",
    description:
      "Predict health and fitness claim outcomes and see what scientific research says.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "HealthProof - Verify Health Claims with Science",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "HealthProof - Verify Health & Fitness Claims with Science",
    description:
      "Predict health and fitness claim outcomes and see what scientific research says.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/favicon.ico",
  },
  alternates: {
    canonical: "/",
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

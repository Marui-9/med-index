import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

interface Props {
  params: Promise<{ claimId: string }>;
  children: React.ReactNode;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { claimId } = await params;

  const claim = await prisma.claim.findUnique({
    where: { id: claimId },
    select: { title: true, description: true },
  });

  if (!claim) {
    return {
      title: "Claim Not Found",
      description: "This health claim could not be found on HealthProof.",
    };
  }

  const description =
    claim.description?.slice(0, 160) ||
    `See community predictions and AI-powered scientific analysis for: ${claim.title.slice(0, 120)}`;

  return {
    title: claim.title,
    description,
    alternates: { canonical: `/claims/${claimId}` },
    openGraph: {
      title: `${claim.title} | HealthProof`,
      description,
      url: `/claims/${claimId}`,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: `${claim.title} | HealthProof`,
      description,
    },
  };
}

export default function ClaimLayout({ children }: Props) {
  return children;
}

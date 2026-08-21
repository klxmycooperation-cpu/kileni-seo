import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FragrancePageTemplate } from "@/src/components/FragrancePageTemplate";
import { fragrances } from "@/src/content/fragrances";
import { getFragrance, getNextFragrance } from "@/src/lib/fragrances";

export function generateStaticParams() {
  return fragrances.map((fragrance) => ({ slug: fragrance.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const fragrance = getFragrance(slug);
  if (!fragrance) return {};
  return {
    title: `${fragrance.seoTitle} — KILENI`,
    description: fragrance.seoDescription,
  };
}

export default async function FragrancePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const fragrance = getFragrance(slug);
  if (!fragrance) notFound();

  return (
    <FragrancePageTemplate
      fragrance={fragrance}
      nextFragrance={getNextFragrance(fragrance.slug)}
    />
  );
}


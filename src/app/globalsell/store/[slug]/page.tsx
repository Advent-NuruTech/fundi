import { notFound, permanentRedirect } from "next/navigation";
import { resolveStorefront } from "@/services/storefront.service";
import { storeUrl } from "@/lib/storefront-url";

export default async function LegacyStorePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const resolution = await resolveStorefront(slug);
  if (!resolution) notFound();
  permanentRedirect(storeUrl(resolution.store.publicHandle));
}

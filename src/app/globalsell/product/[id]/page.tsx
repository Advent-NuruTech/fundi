import { notFound, permanentRedirect } from "next/navigation";
import { fetchLegacyProductDestination } from "@/services/storefront.service";
import { productUrl } from "@/lib/storefront-url";

export default async function LegacyProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const destination = await fetchLegacyProductDestination(id);
  if (!destination) notFound();
  permanentRedirect(productUrl(destination.handle, destination.productSlug));
}

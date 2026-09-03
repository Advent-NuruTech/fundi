import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { JsonLd } from "@/components/shared/json-ld";
import { StoreHeader } from "@/modules/globalsell/components/store-header";
import { StorefrontCatalog } from "@/modules/globalsell/components/storefront-catalog";
import { fetchStorefrontProducts, resolveStorefront } from "@/services/storefront.service";
import { isSecureImageUrl } from "@/lib/utils";
import { SHOP_ORIGIN, storeUrl } from "@/lib/storefront-url";

type Props = { params: Promise<{ handle: string }> };

export const revalidate = 300;

function descriptionFor(storeName: string, description?: string, location?: string) {
  if (description?.trim()) return description.trim().slice(0, 160);
  return `Shop products from ${storeName}${location ? ` in ${location}` : ""} on FundiFlow.`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  const resolution = await resolveStorefront(handle);
  if (!resolution) return { title: "Store not found", robots: { index: false, follow: false } };
  const { store } = resolution;
  const canonical = storeUrl(store.publicHandle);
  const description = descriptionFor(store.storeName, store.description, store.location);
  const images = isSecureImageUrl(store.bannerUrl)
    ? [{ url: store.bannerUrl, alt: `${store.storeName} storefront` }]
    : isSecureImageUrl(store.logoUrl)
      ? [{ url: store.logoUrl, alt: store.storeName }]
      : undefined;

  return {
    metadataBase: new URL(SHOP_ORIGIN),
    title: { absolute: `${store.storeName}${store.location ? ` — ${store.location}` : ""}` },
    description,
    applicationName: store.storeName,
    alternates: { canonical },
    openGraph: {
      type: "website",
      locale: "en_KE",
      url: canonical,
      siteName: store.storeName,
      title: store.storeName,
      description,
      images,
    },
    twitter: { card: "summary_large_image", title: store.storeName, description, images: images?.map((i) => i.url) },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } },
  };
}

export default async function StorefrontPage({ params }: Props) {
  const { handle } = await params;
  const resolution = await resolveStorefront(handle);
  if (!resolution) notFound();
  const { store, isAlias } = resolution;
  if (isAlias || handle !== store.publicHandle) permanentRedirect(storeUrl(store.publicHandle));

  const products = await fetchStorefrontProducts(store);
  const canonical = storeUrl(store.publicHandle);
  const localBusiness = {
    "@context": "https://schema.org",
    "@type": store.location ? "Store" : "OnlineStore",
    "@id": `${canonical}#store`,
    name: store.storeName,
    url: canonical,
    description: store.description,
    image: isSecureImageUrl(store.bannerUrl) ? store.bannerUrl : undefined,
    logo: isSecureImageUrl(store.logoUrl) ? store.logoUrl : undefined,
    telephone: store.contactPhone || undefined,
    email: store.contactEmail || undefined,
    address: store.location
      ? { "@type": "PostalAddress", addressLocality: store.location, addressCountry: "KE" }
      : undefined,
    sameAs: [],
  };

  return (
    <main className="mx-auto max-w-7xl space-y-8 px-3 py-5 sm:px-6 sm:py-8">
      <JsonLd data={localBusiness} />
      <StoreHeader store={store} />
      <StorefrontCatalog products={products} storeName={store.storeName} />
    </main>
  );
}

import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { Package } from "lucide-react";
import { JsonLd } from "@/components/shared/json-ld";
import { StoreHeader } from "@/modules/globalsell/components/store-header";
import { ProductCard } from "@/modules/globalsell/components/product-card";
import { fetchStorefrontProducts, resolveStorefront } from "@/services/storefront.service";
import { isAllowedImageUrl } from "@/lib/utils";
import { storeUrl } from "@/lib/storefront-url";

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
  const images = isAllowedImageUrl(store.bannerUrl)
    ? [{ url: store.bannerUrl, alt: `${store.storeName} storefront` }]
    : isAllowedImageUrl(store.logoUrl)
      ? [{ url: store.logoUrl, alt: store.storeName }]
      : undefined;

  return {
    title: `${store.storeName}${store.location ? ` — ${store.location}` : ""}`,
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      url: canonical,
      siteName: "FundiFlow Marketplace",
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
    image: isAllowedImageUrl(store.bannerUrl) ? store.bannerUrl : undefined,
    logo: isAllowedImageUrl(store.logoUrl) ? store.logoUrl : undefined,
    telephone: store.contactPhone || undefined,
    email: store.contactEmail || undefined,
    address: store.location
      ? { "@type": "PostalAddress", addressLocality: store.location, addressCountry: "KE" }
      : undefined,
    sameAs: [],
  };

  return (
    <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6">
      <JsonLd data={localBusiness} />
      <StoreHeader store={store} />
      <section aria-labelledby="store-products">
        <h2 id="store-products" className="mb-4 text-lg font-bold text-slate-900">
          All Products ({products.length})
        </h2>
        {products.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 py-16 text-center">
            <Package className="mb-3 h-12 w-12 text-slate-200" />
            <p className="text-sm font-medium text-slate-500">No products listed yet</p>
            <p className="mt-1 text-xs text-slate-400">Check back soon for new products</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {products.map((product) => <ProductCard key={product.id} product={product} showStore={false} />)}
          </div>
        )}
      </section>
    </main>
  );
}


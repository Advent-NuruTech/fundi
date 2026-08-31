import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, MapPin, Package, Store } from "lucide-react";
import { notFound, permanentRedirect } from "next/navigation";
import { JsonLd } from "@/components/shared/json-ld";
import { ProductCard } from "@/modules/globalsell/components/product-card";
import { ProductPurchasePanel } from "@/modules/globalsell/components/product-purchase-panel";
import { ProductShareButton } from "@/modules/globalsell/components/product-share-button";
import { fetchStorefrontProduct, fetchStorefrontProducts, resolveStorefront } from "@/services/storefront.service";
import { truncateShareDescription } from "@/lib/product-share";
import { isAllowedImageUrl } from "@/lib/utils";
import { productUrl, shopUrl, storeUrl } from "@/lib/storefront-url";
import type { EcommerceProduct } from "@/types/ecommerce";

type Props = { params: Promise<{ handle: string; productSlug: string }> };

function shareableProductImages(product: EcommerceProduct) {
  const productImages = (product.images ?? []).map((image) => ({
    id: image.id,
    url: image.url,
    altText: image.altText,
    isPrimary: image.isPrimary,
  }));
  const variantImages = (product.variants ?? []).flatMap((variant) =>
    (variant.variantImages ?? (variant.imageUrl
      ? [{ url: variant.imageUrl, altText: variant.name, isPrimary: true }]
      : [])).map((image, index) => ({
        id: `${variant.id}-${index}`,
        url: image.url,
        altText: image.altText,
        isPrimary: image.isPrimary,
      }))
  );

  return [...productImages, ...variantImages]
    .filter((image) => isAllowedImageUrl(image.url))
    .filter((image, index, images) => images.findIndex((candidate) => candidate.url === image.url) === index);
}

export const revalidate = 300;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle, productSlug } = await params;
  const resolution = await resolveStorefront(handle);
  if (!resolution) return { title: "Product not found", robots: { index: false, follow: false } };
  const product = await fetchStorefrontProduct(resolution.store, productSlug);
  if (!product) return { title: "Product not found", robots: { index: false, follow: false } };
  const canonical = productUrl(resolution.store.publicHandle, product.slug);
  const description = truncateShareDescription(product.description) || `Buy ${product.name} from ${resolution.store.storeName} on FundiFlow.`;
  const images = shareableProductImages(product).map((image) => ({ url: image.url, alt: image.altText ?? product.name }));
  return {
    title: `${product.name} — ${resolution.store.storeName}`,
    description,
    alternates: { canonical },
    openGraph: { type: "website", url: canonical, siteName: "FundiFlow Marketplace", title: product.name, description, images },
    twitter: { card: "summary_large_image", title: product.name, description, images: images?.map((image) => image.url) },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } },
  };
}

export default async function StorefrontProductPage({ params }: Props) {
  const { handle, productSlug } = await params;
  const resolution = await resolveStorefront(handle);
  if (!resolution) notFound();
  const { store } = resolution;
  const product = await fetchStorefrontProduct(store, productSlug);
  if (!product) notFound();
  if (resolution.isAlias || handle !== store.publicHandle || productSlug !== product.slug) {
    permanentRedirect(productUrl(store.publicHandle, product.slug));
  }

  const allStoreProducts = await fetchStorefrontProducts(store);
  const related = allStoreProducts.filter((item) => item.id !== product.id).slice(0, 8);
  const images = shareableProductImages(product);
  const primaryImage = images.find((image) => image.isPrimary) ?? images[0];
  const price = product.variants?.[0]?.priceOverride ?? product.discountPrice ?? product.basePrice;
  const canonical = productUrl(store.publicHandle, product.slug);
  const inStock = !product.trackInventory || product.allowBackorder || product.totalStock > 0 || Boolean(product.variants?.some((variant) => variant.isAvailable && variant.stockQuantity > 0));
  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${canonical}#product`,
    name: product.name,
    description: product.description,
    image: images.length > 0 ? images.map((image) => image.url) : undefined,
    sku: product.sku || undefined,
    brand: product.brand ? { "@type": "Brand", name: product.brand } : undefined,
    category: product.category?.name,
    offers: {
      "@type": "Offer",
      url: canonical,
      priceCurrency: product.currency || "KES",
      price,
      availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@type": "Organization", name: store.storeName, url: storeUrl(store.publicHandle) },
    },
    aggregateRating: product.ratingCount > 0
      ? { "@type": "AggregateRating", ratingValue: product.ratingAvg, reviewCount: product.ratingCount }
      : undefined,
  };
  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Marketplace", item: shopUrl() },
      { "@type": "ListItem", position: 2, name: store.storeName, item: storeUrl(store.publicHandle) },
      { "@type": "ListItem", position: 3, name: product.name, item: canonical },
    ],
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <JsonLd data={productSchema} />
      <JsonLd data={breadcrumbs} />
      <Link href={storeUrl(store.publicHandle)} className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-emerald-600">
        <ChevronLeft className="h-4 w-4" /> Back to {store.storeName}
      </Link>
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="relative mx-auto aspect-square w-full max-w-xl overflow-hidden rounded-2xl bg-slate-100">
            {primaryImage ? <Image src={primaryImage.url} alt={primaryImage.altText ?? product.name} fill priority className="object-cover" sizes="(max-width: 1024px) 100vw, 50vw" /> : <div className="flex h-full items-center justify-center"><Package className="h-20 w-20 text-slate-300" /></div>}
          </div>
          {images.length > 1 && <div className="grid grid-cols-4 gap-2">{images.slice(1, 5).map((image) => <div key={image.id} className="relative aspect-square overflow-hidden rounded-xl bg-slate-100"><Image src={image.url} alt={image.altText ?? product.name} fill className="object-cover" sizes="15vw" /></div>)}</div>}
        </div>
        <div className="space-y-5">
          <Link href={storeUrl(store.publicHandle)} className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 hover:underline"><Store className="h-4 w-4" /> {store.storeName}</Link>
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">{product.name}</h1>
            <ProductShareButton
              name={product.name}
              description={product.description}
              productUrl={canonical}
              imageUrl={primaryImage?.url}
            />
          </div>
          {product.brand && <p className="text-sm text-slate-500">Brand: {product.brand}</p>}
          {store.location && <p className="flex items-center gap-1.5 text-sm text-slate-500"><MapPin className="h-4 w-4 text-emerald-500" /> {store.location}</p>}
          <ProductPurchasePanel product={product} />
          {product.description && <section className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="mb-2 font-semibold text-slate-900">Description</h2><p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">{product.description}</p></section>}
        </div>
      </div>
      {related.length > 0 && <section className="mt-14"><h2 className="mb-4 text-xl font-bold text-slate-900">More from {store.storeName}</h2><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{related.map((item) => <ProductCard key={item.id} product={item} showStore={false} />)}</div></section>}
    </main>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, MapPin, Store } from "lucide-react";
import { notFound, permanentRedirect } from "next/navigation";
import { JsonLd } from "@/components/shared/json-ld";
import { ProductCard } from "@/modules/globalsell/components/product-card";
import { ProductPurchasePanel } from "@/modules/globalsell/components/product-purchase-panel";
import { ProductShareButton } from "@/modules/globalsell/components/product-share-button";
import { ProductDescription } from "@/modules/globalsell/components/product-description";
import { ProductImageGallery } from "@/modules/globalsell/components/product-image-gallery";
import { ProductVariantProvider } from "@/modules/globalsell/components/product-variant-context";
import { fetchStorefrontProduct, fetchStorefrontProducts, resolveStorefront } from "@/services/storefront.service";
import { truncateShareDescription } from "@/lib/product-share";
import { isAllowedImageUrl } from "@/lib/utils";
import { productUrl, SHOP_ORIGIN, shopUrl, storeUrl } from "@/lib/storefront-url";
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
        variantId: variant.id,
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
    metadataBase: new URL(SHOP_ORIGIN),
    title: { absolute: `${product.name} — ${resolution.store.storeName}` },
    description,
    alternates: { canonical },
    openGraph: { type: "website", locale: "en_KE", url: canonical, siteName: resolution.store.storeName, title: product.name, description, images },
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
    <main className="mx-auto max-w-7xl px-4 py-8 pb-24 sm:px-6 sm:pb-8">
      <JsonLd data={productSchema} />
      <JsonLd data={breadcrumbs} />
      <Link href={storeUrl(store.publicHandle)} className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-emerald-600">
        <ChevronLeft className="h-4 w-4" /> Back to {store.storeName}
      </Link>
      <ProductVariantProvider product={product}>
        <div className="grid gap-8 lg:grid-cols-2">
          <ProductImageGallery images={images} productName={product.name} />
          <div className="space-y-5">
          <Link href={storeUrl(store.publicHandle)} className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 hover:underline"><Store className="h-4 w-4" /> {store.storeName}</Link>
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{product.name}</h1>
            <ProductShareButton
              name={product.name}
              description={product.description}
              productUrl={canonical}
              imageUrl={primaryImage?.url}
              iconOnly
            />
          </div>
          {product.brand && <p className="text-sm text-slate-500">Brand: {product.brand}</p>}
          {store.location && <p className="flex items-center gap-1.5 text-sm text-slate-500"><MapPin className="h-4 w-4 text-emerald-500" /> {store.location}</p>}
          <ProductPurchasePanel product={product} />
          {product.description && <ProductDescription description={product.description} />}
          </div>
        </div>
      </ProductVariantProvider>
      {related.length > 0 && <section className="mt-14"><h2 className="mb-4 text-xl font-bold text-slate-900">More from {store.storeName}</h2><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{related.map((item) => <ProductCard key={item.id} product={item} showStore={false} />)}</div></section>}
    </main>
  );
}

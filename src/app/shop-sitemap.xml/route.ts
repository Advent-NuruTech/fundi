import { countPublicSitemapEntries } from "@/services/storefront.service";
import { SHOP_ORIGIN } from "@/lib/storefront-url";

const PAGE_SIZE = 20_000;

function escapeXml(value: string) {
  return value.replace(/[<>&'\"]/g, (character) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    "'": "&apos;",
    '"': "&quot;",
  })[character] ?? character);
}

export async function GET() {
  const [storeCount, productCount] = await Promise.all([
    countPublicSitemapEntries("stores"),
    countPublicSitemapEntries("products"),
  ]);
  const sitemapUrls: string[] = [];
  for (let page = 1; page <= Math.max(1, Math.ceil(storeCount / PAGE_SIZE)); page += 1) {
    sitemapUrls.push(`${SHOP_ORIGIN}/sitemaps/stores-${page}.xml`);
  }
  for (let page = 1; page <= Math.max(1, Math.ceil(productCount / PAGE_SIZE)); page += 1) {
    sitemapUrls.push(`${SHOP_ORIGIN}/sitemaps/products-${page}.xml`);
  }
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapUrls
    .map((url) => `  <sitemap><loc>${escapeXml(url)}</loc></sitemap>`)
    .join("\n")}\n</sitemapindex>`;
  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}


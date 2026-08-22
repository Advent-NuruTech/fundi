import { fetchPublicSitemapPage } from "@/services/storefront.service";
import { productUrl, storeUrl } from "@/lib/storefront-url";

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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ kind: string }> }
) {
  const { kind: rawKind } = await params;
  if (rawKind !== "stores" && rawKind !== "products") {
    return new Response("Not found", { status: 404 });
  }
  const page = Math.max(1, Number.parseInt(new URL(request.url).searchParams.get("page") ?? "1", 10) || 1);
  const rows = await fetchPublicSitemapPage(rawKind, page, PAGE_SIZE);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows
    .map((row) => {
      const url = row.productSlug ? productUrl(row.handle, row.productSlug) : storeUrl(row.handle);
      return `  <url><loc>${escapeXml(url)}</loc><lastmod>${escapeXml(new Date(row.updatedAt).toISOString())}</lastmod></url>`;
    })
    .join("\n")}\n</urlset>`;
  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}


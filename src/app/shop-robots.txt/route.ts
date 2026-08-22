import { SHOP_ORIGIN } from "@/lib/storefront-url";

const PRIVATE_PATHS = [
  "/api/",
  "/auth/",
  "/cart",
  "/checkout",
  "/track",
  "/account/",
  "/portal",
  "/login",
  "/register",
  "/forgot-password",
  "/sell",
  "/dashboard",
  "/ffmanage",
];

function publicRules(agent: string) {
  return [`User-agent: ${agent}`, "Allow: /", ...PRIVATE_PATHS.map((path) => `Disallow: ${path}`)].join("\n");
}

export async function GET() {
  const body = [
    publicRules("*"),
    publicRules("OAI-SearchBot"),
    publicRules("ChatGPT-User"),
    publicRules("PerplexityBot"),
    "User-agent: GPTBot\nDisallow: /",
    `Sitemap: ${SHOP_ORIGIN}/sitemap.xml`,
  ].join("\n\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}

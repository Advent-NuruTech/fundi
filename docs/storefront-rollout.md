# Storefront domain rollout

The public commerce origin is `https://shop.fundiflow.co.ke`. Store and product
URLs are canonical only on that origin:

```text
https://shop.fundiflow.co.ke/{store-handle}
https://shop.fundiflow.co.ke/{store-handle}/p/{product-slug}
```

## Required release order

1. Apply Supabase migrations `0057` and `0058` before deploying the application.
   The application intentionally fails closed if `public_handle` is unavailable.
2. Set `NEXT_PUBLIC_SHOP_URL=https://shop.fundiflow.co.ke` in every deployment
   environment.
3. Add `shop.fundiflow.co.ke` to the hosting project and create its DNS record.
   Require HTTPS and let the hosting provider provision/renew the certificate.
4. Add both the shop login and callback URLs to the Supabase Auth redirect allowlist.
5. Deploy the application.
6. Verify these responses before announcing the change:

   - `/` on the shop host returns the marketplace.
   - `/{handle}` returns a server-rendered store with a self-canonical URL.
   - `/{handle}/p/{product}` returns Product/Offer JSON-LD.
   - old `/globalsell/store/{slug}` and `/globalsell/product/{uuid}` URLs return 308.
   - `/robots.txt` and `/sitemap.xml` on the shop host are reachable.
   - `/cart`, `/checkout`, `/track`, `/portal`, and `/api` are not interpreted as handles.

## DNS and environment

Recommended DNS record (use the exact value supplied by the hosting provider):

```text
Type: CNAME
Name: shop
Target: cname.vercel-dns.com
```

Environment variable:

```text
NEXT_PUBLIC_SHOP_URL=https://shop.fundiflow.co.ke
```

Do not set Supabase auth cookies with `Domain=.fundiflow.co.ke`. Authentication
cookies must remain host-only so a public commerce origin cannot read dashboard or
platform-admin credentials.

## Search activation

After deployment:

1. Verify the `fundiflow.co.ke` Domain property in Google Search Console.
2. Submit `https://shop.fundiflow.co.ke/sitemap.xml`.
3. Test one store and one product with URL Inspection and Rich Results Test.
4. Register the shop host in Bing Webmaster Tools.
5. Monitor canonical selection, Product rich-result errors, 404s, and legacy redirect traffic.

The shop robots policy allows search/retrieval crawlers on public catalogue pages
while excluding carts, checkout, tracking, accounts, authentication, and APIs.
Training-only GPTBot remains disallowed.

## Rollback

Application rollback is safe after the migrations: both migrations are additive
for existing IDs, slugs, products, and orders. Do not drop handle aliases during a
rollback; old links depend on them. If the shop host must be disabled, keep the old
Global Sell routes deployed until traffic has returned to zero.


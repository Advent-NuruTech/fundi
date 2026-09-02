import { MapPin, Phone, Mail, Star, Package, ShoppingCart, BadgeCheck } from "lucide-react";
import type { EcommerceStore } from "@/types/ecommerce";
import { isSecureImageUrl } from "@/lib/utils";
import { storeUrl } from "@/lib/storefront-url";
import { StoreShareButton } from "@/modules/globalsell/components/store-share-button";

interface StoreHeaderProps {
  store: EcommerceStore;
}

export function StoreHeader({ store }: StoreHeaderProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Banner */}
      <div className="relative h-36 bg-gradient-to-r from-emerald-700 to-emerald-400 sm:h-52">
        {isSecureImageUrl(store.bannerUrl) && (
          <img
            src={store.bannerUrl}
            alt={`${store.storeName} banner`}
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/10 to-transparent" />
      </div>

      {/* Store profile — cover photo and circular avatar follow the familiar social-profile pattern. */}
      <div className="px-4 pb-5 sm:px-6 sm:pb-6">
        <div className="relative z-10 -mt-12 flex items-end gap-3 sm:-mt-14 sm:gap-4">
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border-4 border-white bg-white shadow-md sm:h-28 sm:w-28">
            {isSecureImageUrl(store.logoUrl) ? (
              <img
                src={store.logoUrl}
                alt={store.storeName}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-emerald-50">
                <span className="text-2xl font-bold text-emerald-600">
                  {store.storeName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 pb-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <h1 className="break-words text-2xl font-bold leading-tight text-slate-900">{store.storeName}</h1>
              {store.isVerified && <BadgeCheck className="h-5 w-5 shrink-0 text-emerald-500" />}
            </div>
            <div className="mt-1 flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              ))}
              <span className="ml-1 text-xs text-slate-500">New Store</span>
            </div>
          </div>
          <StoreShareButton
            storeName={store.storeName}
            storeUrl={storeUrl(store.publicHandle)}
            description={store.description}
            iconOnly
            className="mb-1 h-10 w-10 shrink-0 rounded-full p-0"
          />
        </div>

        {store.description && (
          <p className="mb-4 mt-4 break-words text-sm leading-relaxed text-slate-600">{store.description}</p>
        )}

        {/* Stats */}
        <div className="mb-3 flex flex-wrap gap-x-4 gap-y-2">
          <div className="flex items-center gap-1.5 text-sm text-slate-600">
            <Package className="h-4 w-4 text-emerald-500" />
            <span>{store.totalProducts} Products</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-slate-600">
            <ShoppingCart className="h-4 w-4 text-emerald-500" />
            <span>{store.totalOrders} Orders</span>
          </div>
        </div>

        {/* Contact */}
        <div className="flex flex-wrap gap-x-3 gap-y-2">
          {store.location && (
            <span className="flex min-w-0 items-center gap-1 text-xs text-slate-500">
              <MapPin className="h-3.5 w-3.5" />
              <span className="break-words">{store.location}</span>
            </span>
          )}
          {store.contactPhone && (
            <a
              href={`tel:${store.contactPhone}`}
              className="flex min-w-0 items-center gap-1 break-all text-xs text-emerald-600 hover:underline"
            >
              <Phone className="h-3.5 w-3.5" />
              {store.contactPhone}
            </a>
          )}
          {store.contactEmail && (
            <a
              href={`mailto:${store.contactEmail}`}
              className="flex min-w-0 items-center gap-1 break-all text-xs text-emerald-600 hover:underline"
            >
              <Mail className="h-3.5 w-3.5" />
              {store.contactEmail}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

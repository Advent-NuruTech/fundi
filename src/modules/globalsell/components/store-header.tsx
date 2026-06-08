"use client";

import Image from "next/image";
import { MapPin, Phone, Mail, Star, Package, ShoppingCart, BadgeCheck } from "lucide-react";
import type { EcommerceStore } from "@/types/ecommerce";

interface StoreHeaderProps {
  store: EcommerceStore;
}

export function StoreHeader({ store }: StoreHeaderProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Banner */}
      <div className="relative h-40 bg-gradient-to-r from-emerald-600 to-emerald-400 sm:h-52">
        {store.bannerUrl && (
          <Image
            src={store.bannerUrl}
            alt={`${store.storeName} banner`}
            fill
            className="object-cover"
            priority
          />
        )}
        <div className="absolute inset-0 bg-black/20" />
      </div>

      {/* Store info */}
      <div className="px-5 pb-5">
        {/* Logo + name row */}
        <div className="flex items-end gap-4 -mt-10 mb-3">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-4 border-white bg-white shadow-md">
            {store.logoUrl ? (
              <Image
                src={store.logoUrl}
                alt={store.storeName}
                fill
                className="object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-emerald-50">
                <span className="text-2xl font-bold text-emerald-600">
                  {store.storeName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>

          <div className="pb-1">
            <div className="flex items-center gap-1.5">
              <h1 className="text-xl font-bold text-slate-900">{store.storeName}</h1>
              {store.isVerified && (
                <BadgeCheck className="h-5 w-5 text-emerald-500" />
              )}
            </div>
            {/* Rating placeholder */}
            <div className="mt-0.5 flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              ))}
              <span className="text-xs text-slate-500 ml-1">New Store</span>
            </div>
          </div>
        </div>

        {store.description && (
          <p className="text-sm text-slate-600 leading-relaxed mb-3">{store.description}</p>
        )}

        {/* Stats */}
        <div className="flex flex-wrap gap-4 mb-3">
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
        <div className="flex flex-wrap gap-3">
          {store.location && (
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <MapPin className="h-3.5 w-3.5" />
              {store.location}
            </span>
          )}
          {store.contactPhone && (
            <a
              href={`tel:${store.contactPhone}`}
              className="flex items-center gap-1 text-xs text-emerald-600 hover:underline"
            >
              <Phone className="h-3.5 w-3.5" />
              {store.contactPhone}
            </a>
          )}
          {store.contactEmail && (
            <a
              href={`mailto:${store.contactEmail}`}
              className="flex items-center gap-1 text-xs text-emerald-600 hover:underline"
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

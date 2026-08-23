"use client";

import Link from "next/link";
import { Store, ExternalLink, PackageSearch } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { shopUrl } from "@/lib/storefront-url";

export default function PortalMarketplacePage() {
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-slate-900">Marketplace</h1>
      <Card>
        <CardContent className="p-8 text-center space-y-4">
          <Store className="mx-auto h-12 w-12 text-emerald-600" />
          <div>
            <p className="text-sm font-semibold text-slate-800">FundiFlow Global Sell</p>
            <p className="text-xs text-slate-500 mt-1">
              Browse and buy from verified workshops and sellers
            </p>
          </div>

          <Link href={shopUrl()}>
            <Button className="gap-2 bg-emerald-700 hover:bg-emerald-800 w-full">
              <ExternalLink className="h-4 w-4" /> Shop Global Sell
            </Button>
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5 flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100">
            <PackageSearch className="h-4 w-4 text-emerald-700" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800">Track your Global Sell orders here</p>
            <p className="text-xs text-slate-500 mt-1">
              Every order you place on Global Sell appears under{" "}
              <Link href="/portal/orders" className="text-emerald-700 font-medium hover:underline">
                My Orders
              </Link>{" "}
              and can be tracked right from your portal.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

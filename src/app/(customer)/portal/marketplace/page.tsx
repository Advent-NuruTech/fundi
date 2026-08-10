"use client";

import Link from "next/link";
import { Store, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
              Browse tailored clothing from verified workshops
            </p>
          </div>
    
          <Link href="#" target="_blank"> 
            <Button className="gap-2 bg-emerald-700 hover:bg-emerald-800 w-full">
              <ExternalLink className="h-4 w-4" /> Open Marketplace
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );

  
}

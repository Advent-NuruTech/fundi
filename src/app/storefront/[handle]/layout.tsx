import type { ReactNode } from "react";
import { StorefrontFooter } from "@/modules/globalsell/components/storefront-footer";
import { StorefrontHeader } from "@/modules/globalsell/components/storefront-header";
import { resolveStorefront } from "@/services/storefront.service";

export default async function StorefrontLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const resolution = await resolveStorefront(handle);

  return (
    <div className="min-h-screen overflow-x-clip bg-slate-50">
      <StorefrontHeader store={resolution?.store} />
      {children}
      <StorefrontFooter store={resolution?.store} />
    </div>
  );
}

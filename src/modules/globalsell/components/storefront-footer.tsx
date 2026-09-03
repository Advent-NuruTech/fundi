import { MapPin, Mail, Phone } from "lucide-react";
import type { EcommerceStore } from "@/types/ecommerce";

interface StorefrontFooterProps {
  store?: EcommerceStore;
}

export function StorefrontFooter({ store }: StorefrontFooterProps) {
  const storeName = store?.storeName ?? "FundiFlow Store";

  return (
    <footer className="mt-16 border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-8 sm:flex-row sm:items-end sm:justify-between sm:px-6">
        <div>
          <p className="text-base font-bold text-slate-900">{storeName}</p>
          <p className="mt-1 text-sm text-slate-500">Products and services from this business.</p>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-600">
            {store?.location && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{store.location}</span>}
            {store?.contactPhone && <a className="flex items-center gap-1 hover:text-emerald-700" href={`tel:${store.contactPhone}`}><Phone className="h-3.5 w-3.5" />{store.contactPhone}</a>}
            {store?.contactEmail && <a className="flex items-center gap-1 hover:text-emerald-700" href={`mailto:${store.contactEmail}`}><Mail className="h-3.5 w-3.5" />{store.contactEmail}</a>}
          </div>
        </div>
        <p className="text-xs text-slate-400">Powered by FundiFlow</p>
      </div>
    </footer>
  );
}

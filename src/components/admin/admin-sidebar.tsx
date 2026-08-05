"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  BadgeDollarSign,
  MessageSquare,
  Server,
  FileText,
  Link2,
  Shield,
  Users,
  LogOut,
  X,
  ChevronRight,
  Cpu,
  BarChart3,
  ShieldCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";

const NAV_ITEMS = [
  {
    href: "/ffmanage/dashboard",
    icon: LayoutDashboard,
    label: "Dashboard",
    description: "Platform overview",
  },
  {
    href: "/ffmanage/businesses",
    icon: Building2,
    label: "Businesses",
    description: "Manage tenants",
  },
  {
    href: "/ffmanage/billing",
    icon: CreditCard,
    label: "Billing",
    description: "Payments & revenue",
  },
  {
    href: "/ffmanage/pricing",
    icon: BadgeDollarSign,
    label: "Pricing",
    description: "Plans & SMS fees",
  },
  {
    href: "/ffmanage/ai-billing",
    icon: Cpu,
    label: "AI Billing",
    description: "Engine & pricing config",
    exact: true,
  },
  {
    href: "/ffmanage/ai-billing/analytics",
    icon: BarChart3,
    label: "AI Analytics",
    description: "Cost & revenue insights",
  },
  {
    href: "/ffmanage/ai-billing/records",
    icon: ShieldCheck,
    label: "AI Records",
    description: "Immutable audit trail",
  },
  {
    href: "/ffmanage/sms",
    icon: MessageSquare,
    label: "SMS & Packs",
    description: "Usage, trends & pack pricing",
  },
  {
    href: "/ffmanage/support",
    icon: FileText,
    label: "Support",
    description: "Tickets & responses",
  },
  {
    href: "/ffmanage/team",
    icon: Users,
    label: "Platform Team",
    description: "Operators & roles",
  },
  {
    href: "/ffmanage/system",
    icon: Server,
    label: "System",
    description: "Health & audit logs",
  },
  {
    href: "/ffmanage/invites",
    icon: Link2,
    label: "Invite Links",
    description: "Control onboarding",
  },
];

interface Props {
  open: boolean;
  onClose: () => void;
  currentPath: string;
  adminEmail: string;
}

export function AdminSidebar({ open, onClose, currentPath, adminEmail }: Props) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/ffmanage/auth/logout", { method: "POST" });
    router.replace("/ffmanage/login");
  }

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-slate-800 bg-slate-900 transition-transform duration-200 lg:static lg:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full"
      )}
    >
      {/* Header */}
      <div className="flex h-16 items-center justify-between border-b border-slate-800 px-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600">
            <Shield className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">FundiFlow</p>
            <p className="text-[10px] text-violet-400 font-medium tracking-wider uppercase">Admin Panel</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <ul className="space-y-0.5">
          {NAV_ITEMS.map(({ href, icon: Icon, label, description, exact }) => {
            const active = exact
              ? currentPath === href
              : currentPath === href || currentPath.startsWith(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                    active
                      ? "bg-violet-600/20 text-violet-300"
                      : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0 transition-colors",
                      active ? "text-violet-400" : "text-slate-500 group-hover:text-slate-300"
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{label}</p>
                    <p className="text-[10px] text-slate-500">{description}</p>
                  </div>
                  {active && <ChevronRight className="h-3 w-3 text-violet-400" />}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-800 p-4">
        <div className="mb-3 rounded-lg bg-slate-800/60 px-3 py-2.5">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Signed in as</p>
          <p className="mt-0.5 truncate text-xs text-slate-300">{adminEmail}</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-400 transition-colors hover:bg-rose-900/30 hover:text-rose-400"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}

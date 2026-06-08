"use client";

import { Menu, Bell, ExternalLink } from "lucide-react";
import Link from "next/link";

interface Props {
  onMenuClick: () => void;
  adminEmail: string;
}

export function AdminHeader({ onMenuClick, adminEmail }: Props) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-800 bg-slate-900/80 px-4 backdrop-blur-sm sm:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="hidden sm:block">
          <p className="text-xs text-slate-500">
            System Owner •{" "}
            <span className="text-violet-400">{adminEmail}</span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">View Platform</span>
        </Link>
        <button className="relative rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white">
          <Bell className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}

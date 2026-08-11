"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { User } from "lucide-react";
import { getPortalSession } from "@/services/customer-portal.service";

export function ProfileButton() {
  const [href, setHref] = useState("/auth/customer-login");

  useEffect(() => {
    getPortalSession()
      .then((session) => {
        if (session) setHref("/portal");
      })
      .catch(() => {});
  }, []);

  return (
    <Link
      href={href}
      aria-label="Profile"
      className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
    >
      <User className="h-4.5 w-4.5" />
    </Link>
  );
}

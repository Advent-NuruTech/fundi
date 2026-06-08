import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FundiFlow Admin",
  description: "Super admin management dashboard",
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  // The root app/layout.tsx wraps this. We deliberately don't add
  // AuthProvider here so the admin panel has its own independent auth.
  return <>{children}</>;
}

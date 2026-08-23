import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Customer Portal",
  description: "Track purchases, workshop orders, payments, and support across connected FundiFlow businesses.",
  robots: { index: false, follow: false },
};

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return children;
}

import { InventoryNavigationLayout } from "@/components/dashboard/inventory-navbar";

export default function InventoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <InventoryNavigationLayout>
      {children}
    </InventoryNavigationLayout>
  );
}
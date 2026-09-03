import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Settings,
  Globe,
  Store,
  BookOpen,
} from "lucide-react";

export const sellNavigation = [
  {
    title: "My Store",
    items: [
      { label: "Store Overview", href: "/sell", icon: LayoutDashboard },
      { label: "Browse Marketplace", href: "/globalsell", icon: Globe, external: true },
    ],
  },
  {
    title: "Products",
    items: [
      { label: "My Products", href: "/sell/products", icon: Package },
      { label: "Add Product", href: "/sell/products/new", icon: Store },
      { label: "Global Sell Guide", href: "/sell/manual", icon: BookOpen },
    ],
  },
  {
    title: "Orders",
    items: [
      { label: "Incoming Orders", href: "/sell/orders", icon: ShoppingCart },
      { label: "My Purchases", href: "/sell/purchases", icon: ShoppingCart },
    ],
  },
  {
    title: "Settings",
    items: [
      { label: "Store Settings", href: "/sell/settings", icon: Settings },
    ],
  },
];

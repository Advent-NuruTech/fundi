import {
  BarChart3,
  Barcode,
  Boxes,
  ClipboardList,
  Factory,
  Package,
  Scissors,
  ShieldAlert,
  ShoppingCart,
  Ruler,
  Users,
} from "lucide-react";

export const inventoryNavigation = [
  {
    title: "Overview",
    items: [
      {
        label: "Inventory Dashboard",
        href: "/inventory",
        icon: Boxes,
      },

      {
        label: "Materials",
        href: "/inventory/materials",
        icon: Package,
      },
    ],
  },

  {
    title: "Operations",
    items: [
      {
        label: "Stock Movements",
        href: "/inventory/stock-movements",
        icon: ClipboardList,
      },

      {
        label: "Purchase Orders",
        href: "/inventory/purchase-orders",
        icon: ShoppingCart,
      },

      {
        label: "Suppliers",
        href: "/inventory/suppliers",
        icon: Users,
      },

      {
        label: "Barcode Scanner",
        href: "/inventory/barcode-scanner",
        icon: Barcode,
      },
    ],
  },

  {
    title: "Production Intelligence",
    items: [
      {
        label: "Material Consumption",
        href: "/inventory/fabric-consumption",
        icon: Factory,
      },

      {
        label: "Cutting Tracker",
        href: "/inventory/cutting-tracker",
        icon: Scissors,
      },

      {
        label: "Measurement Mapping",
        href: "/inventory/measurement-mapping",
        icon: Ruler,
      },
    ],
  },

  {
    title: "Monitoring",
    items: [
      {
        label: "Inventory Analytics",
        href: "/inventory/analytics",
        icon: BarChart3,
      },

      {
        label: "Low Stock Alerts",
        href: "/inventory/low-stock",
        icon: ShieldAlert,
      },
    ],
  },
];

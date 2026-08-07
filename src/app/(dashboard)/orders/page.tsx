import { OrdersModulePage } from "@/modules/orders/components/orders-module-page";
import { Suspense } from "react";

export default function OrdersPageRoute() {
  return (
    <Suspense fallback={null}>
      <OrdersModulePage />
    </Suspense>
  );
}

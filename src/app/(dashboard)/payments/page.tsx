import { PaymentsModulePage } from "@/modules/payments/components/payments-module-page";
import { Suspense } from "react";

export default function PaymentsRoute() {
  return (
    <Suspense fallback={null}>
      <PaymentsModulePage />
    </Suspense>
  );
}

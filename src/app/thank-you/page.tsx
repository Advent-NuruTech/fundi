import { Suspense } from "react";
import { ThankYouClient } from "./thank-you-client";

export default function ThankYouPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-emerald-50">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
        </div>
      }
    >
      <ThankYouClient />
    </Suspense>
  );
}

export function generateMetadata() {
  return {
    title: "Payment Confirmed — FundiFlow",
    robots: { index: false },
  };
}

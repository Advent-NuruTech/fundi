import { redirect } from "next/navigation";
import { isValidPlanSlug } from "@/lib/billing/constants";
import { CheckoutClient } from "./checkout-client";
import type { PlanSlug } from "@/types/billing";

interface PageProps {
  searchParams: Promise<{ plan?: string }>;
}

export default async function CheckoutPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const plan = params.plan ?? "";

  if (!isValidPlanSlug(plan)) {
    redirect("/pricing");
  }

  return <CheckoutClient planSlug={plan as PlanSlug} />;
}

export function generateMetadata() {
  return {
    title: "Checkout — FundiFlow",
    robots: { index: false },
  };
}

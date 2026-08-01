import { redirect } from "next/navigation";

/**
 * Order tracking is now handled through the Customer Portal. Customers sign in
 * with the phone number (or email) and default password they received via SMS,
 * so the old token-based public tracker is retired.
 */
export default function PublicTrackingPage() {
  redirect("/auth/customer-login");
}

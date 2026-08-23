"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { Customer } from "@/types/domain";
import {
  getPortalSession,
  getMyCustomerRecords,
  getMyPortalBusinesses,
  logoutCustomerPortal,
  relinkPortalCustomers,
  type PortalBusinessConnection,
} from "@/services/customer-portal.service";

interface CustomerPortalContextValue {
  userId: string;
  userEmail: string;
  userName: string;
  userPhone: string;
  customers: Customer[];
  businesses: PortalBusinessConnection[];
  customerIds: string[];
  primaryCustomer: Customer | null;
  isLoaded: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const CustomerPortalContext = createContext<CustomerPortalContextValue | null>(null);

export function CustomerPortalProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [businesses, setBusinesses] = useState<PortalBusinessConnection[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    getPortalSession().then(async (session) => {
      if (!session) {
        router.replace("/auth/customer-login");
        return;
      }
      if (session.user.user_metadata?.portal_type !== "customer") {
        router.replace("/sell/purchases");
        return;
      }
      setUserId(session.user.id);
      setUserEmail((session.user.user_metadata?.email as string | undefined) ?? session.user.email ?? "");
      setUserName((session.user.user_metadata?.display_name as string | undefined) ?? "");
      setUserPhone((session.user.user_metadata?.phone as string | undefined) ?? "");
      // Heal any customer records that never got linked to this portal account
      // (legacy registrations were silently blocked by RLS).
      await relinkPortalCustomers().catch(() => {});
      const recs = await getMyCustomerRecords();
      setCustomers(recs);
      setBusinesses(await getMyPortalBusinesses(recs));
      setIsLoaded(true);
    });
  }, [router]);

  const refresh = useCallback(async () => {
    await relinkPortalCustomers().catch(() => {});
    const recs = await getMyCustomerRecords();
    setCustomers(recs);
    setBusinesses(await getMyPortalBusinesses(recs));
    const session = await getPortalSession();
    if (session) {
      setUserId(session.user.id);
      setUserEmail((session.user.user_metadata?.email as string | undefined) ?? session.user.email ?? "");
      setUserName((session.user.user_metadata?.display_name as string | undefined) ?? "");
      setUserPhone((session.user.user_metadata?.phone as string | undefined) ?? "");
    }
  }, []);

  const logout = useCallback(async () => {
    await logoutCustomerPortal();
    router.replace("/auth/customer-login");
  }, [router]);

  const value = useMemo<CustomerPortalContextValue>(
    () => ({
      userId,
      userEmail,
      userName,
      userPhone,
      customers,
      businesses,
      customerIds: customers.map((c) => c.id),
      primaryCustomer: customers[0] ?? null,
      isLoaded,
      refresh,
      logout,
    }),
    [userId, userEmail, userName, userPhone, customers, businesses, isLoaded, refresh, logout]
  );

  return (
    <CustomerPortalContext.Provider value={value}>
      {children}
    </CustomerPortalContext.Provider>
  );
}

export function useCustomerPortal() {
  const ctx = useContext(CustomerPortalContext);
  if (!ctx) throw new Error("useCustomerPortal must be inside CustomerPortalProvider");
  return ctx;
}

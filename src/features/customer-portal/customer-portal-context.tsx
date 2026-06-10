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
  logoutCustomerPortal,
} from "@/services/customer-portal.service";

interface CustomerPortalContextValue {
  userId: string;
  userEmail: string;
  customers: Customer[];
  customerIds: string[];
  primaryCustomer: Customer | null;
  isLoaded: boolean;
  logout: () => Promise<void>;
}

const CustomerPortalContext = createContext<CustomerPortalContextValue | null>(null);

export function CustomerPortalProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    getPortalSession().then(async (session) => {
      if (!session) {
        router.replace("/auth/customer-login");
        return;
      }
      setUserId(session.user.id);
      setUserEmail(session.user.email ?? "");
      const recs = await getMyCustomerRecords();
      setCustomers(recs);
      setIsLoaded(true);
    });
  }, [router]);

  const logout = useCallback(async () => {
    await logoutCustomerPortal();
    router.replace("/auth/customer-login");
  }, [router]);

  const value = useMemo<CustomerPortalContextValue>(
    () => ({
      userId,
      userEmail,
      customers,
      customerIds: customers.map((c) => c.id),
      primaryCustomer: customers[0] ?? null,
      isLoaded,
      logout,
    }),
    [userId, userEmail, customers, isLoaded, logout]
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

"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Subscription } from "@/types/billing";

interface SubscriptionState {
  subscription: Subscription | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useSubscription(): SubscriptionState {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscription = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setSubscription(null);
        return;
      }

      const res = await fetch("/api/billing/subscription", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: "no-store",
      });

      if (!res.ok) {
        if (res.status === 404 || res.status === 401) {
          setSubscription(null);
          return;
        }
        throw new Error("Failed to fetch subscription");
      }

      const data = await res.json();
      setSubscription(data.subscription ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  return { subscription, loading, error, refetch: fetchSubscription };
}

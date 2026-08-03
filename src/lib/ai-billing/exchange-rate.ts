import type { SupabaseClient } from "@supabase/supabase-js";
import type { AIExchangeRateProviderId } from "@/types/ai-billing";
import { getActiveExchangeRate } from "./config-store";

/**
 * ExchangeRateProvider is the single seam between the Billing Engine and the
 * foreign-exchange market. The engine never knows (and never cares) where a
 * rate comes from — it only asks the ACTIVE provider for today's USD→KES rate
 * and stamps the source + value + timestamp on every billing record.
 *
 * Supported providers (extensible by registration):
 *   * manual             → Super Admin enters the rate by hand (recommended launch).
 *   * central_bank       → future: Central Bank of Kenya published rate.
 *   * exchange_rate_api  → future: third-party FX API.
 */
export interface ExchangeRateResult {
  rate: number;
  source: AIExchangeRateProviderId;
}

export interface ExchangeRateProvider {
  readonly id: AIExchangeRateProviderId;
  readonly name: string;
  getRate(db?: SupabaseClient): Promise<ExchangeRateResult | null>;
}

class ManualExchangeRateProvider implements ExchangeRateProvider {
  readonly id = "manual" as const;
  readonly name = "Manual Exchange Rate";

  async getRate(db?: SupabaseClient): Promise<ExchangeRateResult | null> {
    const row = await getActiveExchangeRate(db);
    if (!row) return null;
    return { rate: row.rate, source: "manual" };
  }
}

const PROVIDERS = new Map<AIExchangeRateProviderId, ExchangeRateProvider>();

export function registerExchangeRateProvider(provider: ExchangeRateProvider): void {
  PROVIDERS.set(provider.id, provider);
}

export function getExchangeRateProvider(id: AIExchangeRateProviderId): ExchangeRateProvider {
  const provider = PROVIDERS.get(id);
  if (!provider) throw new Error(`No exchange-rate provider registered for "${id}".`);
  return provider;
}

export function listExchangeRateProviders(): ExchangeRateProvider[] {
  return Array.from(PROVIDERS.values());
}

export async function getCurrentRate(
  active: AIExchangeRateProviderId,
  db?: SupabaseClient
): Promise<ExchangeRateResult | null> {
  return getExchangeRateProvider(active).getRate(db);
}

registerExchangeRateProvider(new ManualExchangeRateProvider());

-- ============================================================================
-- FUNDIFLOW - Migration 00025: Customer Portal
-- Secure order tracking tokens, customer portal auth, and RLS for customers
-- ============================================================================

-- 1. Secure tracking token on orders (application-generated, e.g. "ord_hJ82KsL9")
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_token TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS orders_tracking_token_idx
  ON orders(tracking_token) WHERE tracking_token IS NOT NULL;

-- 2. Link a Supabase auth user to a customer record (portal login)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS portal_user_id UUID
  REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS customers_portal_user_id_idx
  ON customers(portal_user_id) WHERE portal_user_id IS NOT NULL;

-- 3. Add 'customer' to user_role enum (for portal profile rows)
DO $$ BEGIN
  ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'customer';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 4. RLS - customer portal users can SELECT their own customer record(s)
DO $$ BEGIN
  CREATE POLICY customers_portal_select ON customers
    FOR SELECT USING (portal_user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 5. RLS - customer portal users can SELECT their own orders
DO $$ BEGIN
  CREATE POLICY orders_portal_select ON orders
    FOR SELECT USING (
      customer_id IN (
        SELECT id FROM customers WHERE portal_user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 6. RLS - customer portal users can SELECT their own payments
DO $$ BEGIN
  CREATE POLICY payments_portal_select ON payments
    FOR SELECT USING (
      customer_id IN (
        SELECT id FROM customers WHERE portal_user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 7. RLS - portal users can participate in conversations (support chat)
--    All UUID columns: participants UUID[], sender_uid UUID, auth.uid() UUID.
--    No ::text casts needed anywhere.
DO $$ BEGIN
  CREATE POLICY conversations_portal_participant ON conversations
    FOR SELECT USING (auth.uid() = ANY(participants));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY messages_portal_participant_select ON messages
    FOR SELECT USING (
      conversation_id IN (
        SELECT id FROM conversations WHERE auth.uid() = ANY(participants)
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY messages_portal_participant_insert ON messages
    FOR INSERT WITH CHECK (
      sender_uid = auth.uid()
      AND conversation_id IN (
        SELECT id FROM conversations WHERE auth.uid() = ANY(participants)
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 8. Allow portal profile reads (customer role profiles have no businessId)
DO $$ BEGIN
  CREATE POLICY profiles_customer_own ON profiles
    FOR SELECT USING (id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

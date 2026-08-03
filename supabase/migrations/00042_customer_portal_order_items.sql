-- ============================================================================
-- FUNDIFLOW - Migration 00042: Customer Portal Order Items
-- Portal customers could see their order header but never its line items,
-- because the only order_garments SELECT policy (00008) requires a business
-- membership. Add a portal policy mirroring orders_portal_select (00025).
-- ============================================================================

DO $$ BEGIN
  CREATE POLICY order_garments_portal_select ON order_garments
    FOR SELECT USING (
      order_id IN (
        SELECT o.id
        FROM orders o
        JOIN customers c ON c.id = o.customer_id
        WHERE c.portal_user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

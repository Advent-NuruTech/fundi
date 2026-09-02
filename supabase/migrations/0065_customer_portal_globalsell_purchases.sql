-- Customer portal: let verified purchasers see Global Sell payment history and
-- recover older purchases that were created before the portal account existed.

DO $$ BEGIN
  CREATE POLICY ecommerce_order_payments_buyer_read
    ON ecommerce_order_payments FOR SELECT
    USING (
      order_id IN (
        SELECT id FROM ecommerce_orders WHERE buyer_user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION relink_portal_ecommerce_orders(
  p_user_id UUID,
  p_phones TEXT[],
  p_emails TEXT[]
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  linked_count INTEGER;
BEGIN
  IF p_user_id IS NULL OR cardinality(p_phones) = 0 THEN
    RETURN 0;
  END IF;

  UPDATE ecommerce_orders AS purchase
  SET buyer_user_id = p_user_id
  WHERE
    regexp_replace(purchase.buyer_phone, '[^0-9]', '', 'g') IN (
      SELECT regexp_replace(matched_phone.phone, '[^0-9]', '', 'g')
      FROM unnest(p_phones) AS matched_phone(phone)
    )
    AND (
      purchase.buyer_user_id IS NULL
      OR (
        cardinality(p_emails) > 0
        AND lower(coalesce(purchase.buyer_email, '')) IN (
          SELECT lower(trim(matched_email.email))
          FROM unnest(p_emails) AS matched_email(email)
        )
      )
    );

  GET DIAGNOSTICS linked_count = ROW_COUNT;
  RETURN linked_count;
END;
$$;

REVOKE ALL ON FUNCTION relink_portal_ecommerce_orders(UUID, TEXT[], TEXT[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION relink_portal_ecommerce_orders(UUID, TEXT[], TEXT[]) TO service_role;

-- Customer portal: make legacy Global Sell purchase recovery independent of
-- whether a Kenyan number was saved as 07..., 7..., 254..., or +254....

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
  IF p_user_id IS NULL OR COALESCE(cardinality(p_phones), 0) = 0 THEN
    RETURN 0;
  END IF;

  UPDATE ecommerce_orders AS purchase
  SET buyer_user_id = p_user_id
  WHERE
    purchase.buyer_user_id IS DISTINCT FROM p_user_id
    AND length(regexp_replace(coalesce(purchase.buyer_phone, ''), '[^0-9]', '', 'g')) >= 9
    AND right(regexp_replace(purchase.buyer_phone, '[^0-9]', '', 'g'), 9) IN (
      SELECT right(regexp_replace(matched_phone.phone, '[^0-9]', '', 'g'), 9)
      FROM unnest(p_phones) AS matched_phone(phone)
      WHERE length(regexp_replace(matched_phone.phone, '[^0-9]', '', 'g')) >= 9
    )
    AND (
      purchase.buyer_user_id IS NULL
      OR (
        COALESCE(cardinality(p_emails), 0) > 0
        AND lower(trim(coalesce(purchase.buyer_email, ''))) IN (
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

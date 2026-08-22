-- =============================================================================
-- 0058_atomic_ecommerce_checkout.sql
-- Server-authoritative, idempotent checkout with atomic stock reservation.
-- =============================================================================

CREATE TABLE IF NOT EXISTS ecommerce_checkout_requests (
  idempotency_key   text PRIMARY KEY,
  buyer_user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  order_id          uuid NOT NULL REFERENCES ecommerce_orders(id) ON DELETE CASCADE,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ecommerce_checkout_requests_buyer
  ON ecommerce_checkout_requests(buyer_user_id, created_at DESC);

ALTER TABLE ecommerce_checkout_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ecommerce_checkout_requests FROM anon, authenticated;
GRANT ALL ON ecommerce_checkout_requests TO service_role;

CREATE OR REPLACE FUNCTION place_ecommerce_order(
  p_idempotency_key text,
  p_buyer_user_id uuid,
  p_buyer_business_id uuid,
  p_seller_business_id uuid,
  p_cart_items jsonb,
  p_checkout jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_order uuid;
  v_store ecommerce_stores%ROWTYPE;
  v_product ecommerce_products%ROWTYPE;
  v_variant ecommerce_product_variants%ROWTYPE;
  v_item jsonb;
  v_order_id uuid;
  v_order_number text;
  v_product_id uuid;
  v_variant_id uuid;
  v_quantity integer;
  v_unit_price numeric(12,2);
  v_line_total numeric(12,2);
  v_subtotal numeric(12,2) := 0;
BEGIN
  IF p_idempotency_key IS NULL
     OR length(p_idempotency_key) < 16
     OR length(p_idempotency_key) > 128 THEN
    RAISE EXCEPTION 'A valid idempotency key is required';
  END IF;
  IF jsonb_typeof(p_cart_items) <> 'array' OR jsonb_array_length(p_cart_items) = 0 THEN
    RAISE EXCEPTION 'Cart is empty';
  END IF;
  IF jsonb_array_length(p_cart_items) > 100 THEN
    RAISE EXCEPTION 'Cart contains too many items';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_buyer_user_id::text || ':' || p_idempotency_key, 0));

  SELECT order_id INTO v_existing_order
  FROM ecommerce_checkout_requests
  WHERE idempotency_key = p_idempotency_key
    AND buyer_user_id = p_buyer_user_id
    AND seller_business_id = p_seller_business_id;
  IF v_existing_order IS NOT NULL THEN
    RETURN v_existing_order;
  END IF;

  SELECT * INTO v_store FROM ecommerce_stores
  WHERE business_id = p_seller_business_id
    AND is_active = true
    AND is_suspended = false
  FOR UPDATE;
  IF v_store.id IS NULL THEN
    RAISE EXCEPTION 'Seller store is unavailable';
  END IF;

  IF coalesce(length(trim(p_checkout->>'buyerName')), 0) < 2
     OR coalesce(length(trim(p_checkout->>'buyerPhone')), 0) < 9
     OR coalesce(length(trim(p_checkout->>'deliveryLocation')), 0) < 5 THEN
    RAISE EXCEPTION 'Valid buyer and delivery details are required';
  END IF;

  -- Validate and lock every product before creating the order.
  FOR v_item IN
    SELECT jsonb_build_object(
      'productId', parsed.product_id,
      'variantId', parsed.variant_id,
      'quantity', sum(parsed.quantity)
    )
    FROM (
      SELECT
        (value->>'productId')::uuid AS product_id,
        nullif(value->>'variantId', '')::uuid AS variant_id,
        (value->>'quantity')::integer AS quantity
      FROM jsonb_array_elements(p_cart_items)
    ) AS parsed
    GROUP BY parsed.product_id, parsed.variant_id
    ORDER BY parsed.product_id, parsed.variant_id
  LOOP
    v_product_id := (v_item->>'productId')::uuid;
    v_variant_id := nullif(v_item->>'variantId', '')::uuid;
    v_quantity := (v_item->>'quantity')::integer;

    IF v_quantity < 1 OR v_quantity > 1000 THEN
      RAISE EXCEPTION 'Invalid item quantity';
    END IF;

    SELECT * INTO v_product FROM ecommerce_products
    WHERE id = v_product_id
      AND business_id = p_seller_business_id
      AND store_id = v_store.id
      AND status = 'published'
    FOR UPDATE;
    IF v_product.id IS NULL THEN
      RAISE EXCEPTION 'A cart product is unavailable';
    END IF;

    v_variant := NULL;
    IF v_variant_id IS NOT NULL THEN
      SELECT * INTO v_variant FROM ecommerce_product_variants
      WHERE id = v_variant_id
        AND product_id = v_product.id
        AND business_id = p_seller_business_id
        AND is_available = true
      FOR UPDATE;
      IF v_variant.id IS NULL THEN
        RAISE EXCEPTION 'A selected product option is unavailable';
      END IF;
    END IF;

    IF v_variant.id IS NOT NULL
       AND v_variant.wholesale_price IS NOT NULL
       AND v_quantity >= coalesce(v_variant.wholesale_min_qty, v_product.wholesale_min_qty, 1) THEN
      v_unit_price := v_variant.wholesale_price;
    ELSIF v_product.wholesale_price IS NOT NULL
       AND v_quantity >= coalesce(v_product.wholesale_min_qty, 1) THEN
      v_unit_price := v_product.wholesale_price;
    ELSE
      v_unit_price := coalesce(v_variant.price_override, v_product.discount_price, v_product.base_price);
    END IF;

    IF v_unit_price IS NULL OR v_unit_price < 0 THEN
      RAISE EXCEPTION 'A product has an invalid price';
    END IF;

    IF v_product.track_inventory AND NOT v_product.allow_backorder THEN
      IF v_variant.id IS NOT NULL AND v_variant.stock_quantity < v_quantity THEN
        RAISE EXCEPTION 'Insufficient stock for %', v_product.name;
      ELSIF v_variant.id IS NULL AND v_product.total_stock < v_quantity THEN
        RAISE EXCEPTION 'Insufficient stock for %', v_product.name;
      END IF;
    END IF;

    v_subtotal := v_subtotal + (v_unit_price * v_quantity);
  END LOOP;

  v_order_number := 'GS-' || to_char(clock_timestamp(), 'YYMMDDHH24MISS') || '-' ||
    upper(substr(md5(gen_random_uuid()::text), 1, 5));

  INSERT INTO ecommerce_orders (
    order_number, seller_business_id, buyer_business_id, buyer_user_id,
    buyer_name, buyer_phone, buyer_email, delivery_location, notes,
    subtotal, total, currency, status, payment_method, payment_status
  ) VALUES (
    v_order_number, p_seller_business_id, p_buyer_business_id, p_buyer_user_id,
    trim(p_checkout->>'buyerName'), trim(p_checkout->>'buyerPhone'),
    nullif(trim(p_checkout->>'buyerEmail'), ''), trim(p_checkout->>'deliveryLocation'),
    nullif(trim(p_checkout->>'notes'), ''), v_subtotal, v_subtotal, 'KES', 'pending',
    coalesce(nullif(p_checkout->>'paymentMethod', ''), 'manual')::ecommerce_payment_method,
    'unpaid'
  ) RETURNING id INTO v_order_id;

  FOR v_item IN
    SELECT jsonb_build_object(
      'productId', parsed.product_id,
      'variantId', parsed.variant_id,
      'quantity', sum(parsed.quantity)
    )
    FROM (
      SELECT
        (value->>'productId')::uuid AS product_id,
        nullif(value->>'variantId', '')::uuid AS variant_id,
        (value->>'quantity')::integer AS quantity
      FROM jsonb_array_elements(p_cart_items)
    ) AS parsed
    GROUP BY parsed.product_id, parsed.variant_id
    ORDER BY parsed.product_id, parsed.variant_id
  LOOP
    v_product_id := (v_item->>'productId')::uuid;
    v_variant_id := nullif(v_item->>'variantId', '')::uuid;
    v_quantity := (v_item->>'quantity')::integer;

    SELECT * INTO v_product FROM ecommerce_products WHERE id = v_product_id;
    v_variant := NULL;
    IF v_variant_id IS NOT NULL THEN
      SELECT * INTO v_variant FROM ecommerce_product_variants WHERE id = v_variant_id;
    END IF;

    IF v_variant.id IS NOT NULL
       AND v_variant.wholesale_price IS NOT NULL
       AND v_quantity >= coalesce(v_variant.wholesale_min_qty, v_product.wholesale_min_qty, 1) THEN
      v_unit_price := v_variant.wholesale_price;
    ELSIF v_product.wholesale_price IS NOT NULL
       AND v_quantity >= coalesce(v_product.wholesale_min_qty, 1) THEN
      v_unit_price := v_product.wholesale_price;
    ELSE
      v_unit_price := coalesce(v_variant.price_override, v_product.discount_price, v_product.base_price);
    END IF;
    v_line_total := v_unit_price * v_quantity;

    INSERT INTO ecommerce_order_items (
      order_id, product_id, variant_id, product_name, variant_name, sku,
      quantity, unit_price, total_price
    ) VALUES (
      v_order_id, v_product.id, v_variant.id, v_product.name, v_variant.name,
      coalesce(v_variant.sku, v_product.sku), v_quantity, v_unit_price, v_line_total
    );

    IF v_product.track_inventory THEN
      IF v_variant.id IS NOT NULL THEN
        UPDATE ecommerce_product_variants SET
          stock_quantity = greatest(stock_quantity - v_quantity, 0),
          reserved_quantity = reserved_quantity + v_quantity
        WHERE id = v_variant.id;
      ELSE
        UPDATE ecommerce_products SET
          total_stock = greatest(total_stock - v_quantity, 0),
          reserved_stock = reserved_stock + v_quantity
        WHERE id = v_product.id;
      END IF;
    END IF;

    INSERT INTO ecommerce_inventory_logs (
      business_id, product_id, variant_id, order_id, change_type,
      quantity_change, note
    ) VALUES (
      p_seller_business_id, v_product.id, v_variant.id, v_order_id,
      'reserved', -v_quantity, 'Reserved for order ' || v_order_number
    );
  END LOOP;

  INSERT INTO ecommerce_notifications(business_id, order_id, type, title, message, read)
  VALUES (
    p_seller_business_id, v_order_id, 'new_order', 'New Order Received',
    trim(p_checkout->>'buyerName') || ' placed order ' || v_order_number ||
      ' — KES ' || trim(to_char(v_subtotal, 'FM999999999990.00')),
    false
  );

  UPDATE ecommerce_stores
  SET total_orders = total_orders + 1
  WHERE id = v_store.id;

  INSERT INTO ecommerce_checkout_requests(
    idempotency_key, buyer_user_id, seller_business_id, order_id
  ) VALUES (
    p_idempotency_key, p_buyer_user_id, p_seller_business_id, v_order_id
  );

  RETURN v_order_id;
END;
$$;

REVOKE ALL ON FUNCTION place_ecommerce_order(text, uuid, uuid, uuid, jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION place_ecommerce_order(text, uuid, uuid, uuid, jsonb, jsonb) TO service_role;

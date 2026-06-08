-- ============================================================================
-- FUNDIFLOW - Supabase Migration: 00019_global_sell
-- Global Sell: Multi-tenant ecommerce marketplace
-- ============================================================================

-- ── Enums ──────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE ecommerce_product_status AS ENUM (
    'draft', 'published', 'archived', 'out_of_stock'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE ecommerce_order_status AS ENUM (
    'pending', 'confirmed', 'processing', 'packed',
    'shipped', 'delivered', 'cancelled', 'rejected'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE ecommerce_payment_status AS ENUM (
    'unpaid', 'paid', 'partial', 'refunded'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE ecommerce_payment_method AS ENUM (
    'manual', 'cash', 'mpesa', 'bank_transfer'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE ecommerce_inventory_change AS ENUM (
    'reserved', 'released', 'sold', 'restocked', 'adjusted'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── ecommerce_categories ────────────────────────────────────────────────────
-- Global, platform-managed categories

CREATE TABLE IF NOT EXISTS ecommerce_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  description TEXT,
  icon        TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── ecommerce_stores ────────────────────────────────────────────────────────
-- One store per business. Auto-created when a business first activates Global Sell.

CREATE TABLE IF NOT EXISTS ecommerce_stores (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id         UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  slug                TEXT NOT NULL UNIQUE,
  store_name          TEXT NOT NULL,
  description         TEXT,
  banner_url          TEXT,
  logo_url            TEXT,
  contact_phone       TEXT,
  notification_phone  TEXT,  -- receives SMS when new orders arrive
  contact_email       TEXT,
  location            TEXT,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  is_verified         BOOLEAN NOT NULL DEFAULT false,
  is_suspended        BOOLEAN NOT NULL DEFAULT false,
  total_products      INTEGER NOT NULL DEFAULT 0,
  total_orders        INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ecommerce_stores_business_unique UNIQUE (business_id)
);

-- ── ecommerce_products ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ecommerce_products (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  store_id          UUID NOT NULL REFERENCES ecommerce_stores(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  slug              TEXT NOT NULL,
  description       TEXT,
  rich_description  TEXT,
  category_id       UUID REFERENCES ecommerce_categories(id) ON DELETE SET NULL,
  brand             TEXT,
  sku               TEXT,
  base_price        NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_price    NUMERIC(12,2),
  currency          TEXT NOT NULL DEFAULT 'KES',
  status            ecommerce_product_status NOT NULL DEFAULT 'draft',
  track_inventory   BOOLEAN NOT NULL DEFAULT true,
  allow_backorder   BOOLEAN NOT NULL DEFAULT false,
  total_stock       INTEGER NOT NULL DEFAULT 0,
  reserved_stock    INTEGER NOT NULL DEFAULT 0,
  tags              TEXT[],
  shipping_weight   NUMERIC(8,2),
  shipping_info     JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_featured       BOOLEAN NOT NULL DEFAULT false,
  view_count        INTEGER NOT NULL DEFAULT 0,
  order_count       INTEGER NOT NULL DEFAULT 0,
  rating_avg        NUMERIC(3,2) NOT NULL DEFAULT 0,
  rating_count      INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(business_id, slug)
);

-- ── ecommerce_product_images ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ecommerce_product_images (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES ecommerce_products(id) ON DELETE CASCADE,
  url        TEXT NOT NULL,
  alt_text   TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── ecommerce_product_variants ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ecommerce_product_variants (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id        UUID NOT NULL REFERENCES ecommerce_products(id) ON DELETE CASCADE,
  business_id       UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  options           JSONB NOT NULL DEFAULT '{}'::jsonb,  -- { "Size": "L", "Color": "Red" }
  sku               TEXT,
  price_override    NUMERIC(12,2),
  stock_quantity    INTEGER NOT NULL DEFAULT 0,
  reserved_quantity INTEGER NOT NULL DEFAULT 0,
  image_url         TEXT,
  is_available      BOOLEAN NOT NULL DEFAULT true,
  sort_order        INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── ecommerce_orders ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ecommerce_orders (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number         TEXT NOT NULL UNIQUE,
  seller_business_id   UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  buyer_business_id    UUID REFERENCES businesses(id) ON DELETE SET NULL,
  buyer_user_id        UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Buyer info snapshot (collected at checkout)
  buyer_name           TEXT NOT NULL,
  buyer_phone          TEXT NOT NULL,
  buyer_email          TEXT,
  delivery_location    TEXT,
  notes                TEXT,

  -- Financials
  subtotal             NUMERIC(12,2) NOT NULL,
  total                NUMERIC(12,2) NOT NULL,
  currency             TEXT NOT NULL DEFAULT 'KES',

  -- Status
  status               ecommerce_order_status NOT NULL DEFAULT 'pending',
  payment_method       ecommerce_payment_method NOT NULL DEFAULT 'manual',
  payment_status       ecommerce_payment_status NOT NULL DEFAULT 'unpaid',

  -- Lifecycle timestamps
  rejection_reason     TEXT,
  cancellation_reason  TEXT,
  confirmed_at         TIMESTAMPTZ,
  shipped_at           TIMESTAMPTZ,
  delivered_at         TIMESTAMPTZ,

  -- SMS notification tracking
  sms_sent             BOOLEAN NOT NULL DEFAULT false,

  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── ecommerce_order_items ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ecommerce_order_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      UUID NOT NULL REFERENCES ecommerce_orders(id) ON DELETE CASCADE,
  product_id    UUID NOT NULL REFERENCES ecommerce_products(id) ON DELETE RESTRICT,
  variant_id    UUID REFERENCES ecommerce_product_variants(id) ON DELETE SET NULL,
  product_name  TEXT NOT NULL,   -- snapshot at order time
  variant_name  TEXT,            -- snapshot at order time
  sku           TEXT,
  quantity      INTEGER NOT NULL,
  unit_price    NUMERIC(12,2) NOT NULL,
  total_price   NUMERIC(12,2) NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── ecommerce_notifications ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ecommerce_notifications (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id  UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  order_id     UUID REFERENCES ecommerce_orders(id) ON DELETE SET NULL,
  type         TEXT NOT NULL,    -- new_order | order_status_changed | stock_low
  title        TEXT NOT NULL,
  message      TEXT NOT NULL,
  read         BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── ecommerce_inventory_logs ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ecommerce_inventory_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  product_id        UUID NOT NULL REFERENCES ecommerce_products(id) ON DELETE CASCADE,
  variant_id        UUID REFERENCES ecommerce_product_variants(id) ON DELETE SET NULL,
  order_id          UUID REFERENCES ecommerce_orders(id) ON DELETE SET NULL,
  change_type       ecommerce_inventory_change NOT NULL,
  quantity_change   INTEGER NOT NULL,
  previous_quantity INTEGER,
  new_quantity      INTEGER,
  note              TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Seed default categories ─────────────────────────────────────────────────

INSERT INTO ecommerce_categories (name, slug, icon, sort_order) VALUES
  ('Clothing & Apparel', 'clothing-apparel', 'Shirt', 1),
  ('Fabrics & Materials', 'fabrics-materials', 'Scissors', 2),
  ('Accessories', 'accessories', 'Watch', 3),
  ('Home & Decor', 'home-decor', 'Home', 4),
  ('Uniforms', 'uniforms', 'Briefcase', 5),
  ('Traditional Wear', 'traditional-wear', 'Sparkles', 6),
  ('Baby & Kids', 'baby-kids', 'Baby', 7),
  ('Sports & Active', 'sports-active', 'Dumbbell', 8),
  ('Bags & Luggage', 'bags-luggage', 'ShoppingBag', 9),
  ('Other', 'other', 'Package', 10)
ON CONFLICT (slug) DO NOTHING;

-- ── Indexes ──────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_ecommerce_stores_business_id
  ON ecommerce_stores(business_id);
CREATE INDEX IF NOT EXISTS idx_ecommerce_stores_slug
  ON ecommerce_stores(slug);
CREATE INDEX IF NOT EXISTS idx_ecommerce_stores_is_active
  ON ecommerce_stores(is_active);

CREATE INDEX IF NOT EXISTS idx_ecommerce_products_business_id
  ON ecommerce_products(business_id);
CREATE INDEX IF NOT EXISTS idx_ecommerce_products_store_id
  ON ecommerce_products(store_id);
CREATE INDEX IF NOT EXISTS idx_ecommerce_products_status
  ON ecommerce_products(status);
CREATE INDEX IF NOT EXISTS idx_ecommerce_products_category_id
  ON ecommerce_products(category_id);
CREATE INDEX IF NOT EXISTS idx_ecommerce_products_created_at
  ON ecommerce_products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ecommerce_products_base_price
  ON ecommerce_products(base_price);
CREATE INDEX IF NOT EXISTS idx_ecommerce_products_name_gin
  ON ecommerce_products USING GIN (to_tsvector('english', name || ' ' || COALESCE(description, '')));

CREATE INDEX IF NOT EXISTS idx_ecommerce_product_images_product_id
  ON ecommerce_product_images(product_id);

CREATE INDEX IF NOT EXISTS idx_ecommerce_product_variants_product_id
  ON ecommerce_product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_ecommerce_product_variants_business_id
  ON ecommerce_product_variants(business_id);

CREATE INDEX IF NOT EXISTS idx_ecommerce_orders_seller_business_id
  ON ecommerce_orders(seller_business_id);
CREATE INDEX IF NOT EXISTS idx_ecommerce_orders_buyer_business_id
  ON ecommerce_orders(buyer_business_id);
CREATE INDEX IF NOT EXISTS idx_ecommerce_orders_buyer_user_id
  ON ecommerce_orders(buyer_user_id);
CREATE INDEX IF NOT EXISTS idx_ecommerce_orders_status
  ON ecommerce_orders(status);
CREATE INDEX IF NOT EXISTS idx_ecommerce_orders_created_at
  ON ecommerce_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ecommerce_orders_order_number
  ON ecommerce_orders(order_number);
CREATE INDEX IF NOT EXISTS idx_ecommerce_orders_buyer_phone
  ON ecommerce_orders(buyer_phone);

CREATE INDEX IF NOT EXISTS idx_ecommerce_order_items_order_id
  ON ecommerce_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_ecommerce_order_items_product_id
  ON ecommerce_order_items(product_id);

CREATE INDEX IF NOT EXISTS idx_ecommerce_notifications_business_id
  ON ecommerce_notifications(business_id);
CREATE INDEX IF NOT EXISTS idx_ecommerce_notifications_read
  ON ecommerce_notifications(read);

CREATE INDEX IF NOT EXISTS idx_ecommerce_inventory_logs_business_id
  ON ecommerce_inventory_logs(business_id);
CREATE INDEX IF NOT EXISTS idx_ecommerce_inventory_logs_product_id
  ON ecommerce_inventory_logs(product_id);

-- ── Triggers ─────────────────────────────────────────────────────────────────

CREATE TRIGGER trg_ecommerce_stores_updated_at
  BEFORE UPDATE ON ecommerce_stores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_ecommerce_products_updated_at
  BEFORE UPDATE ON ecommerce_products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_ecommerce_product_variants_updated_at
  BEFORE UPDATE ON ecommerce_product_variants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_ecommerce_orders_updated_at
  BEFORE UPDATE ON ecommerce_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE ecommerce_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE ecommerce_stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE ecommerce_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE ecommerce_product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE ecommerce_product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE ecommerce_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE ecommerce_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE ecommerce_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE ecommerce_inventory_logs ENABLE ROW LEVEL SECURITY;

-- categories: public read
CREATE POLICY "ecommerce_categories_read_all"
  ON ecommerce_categories FOR SELECT USING (true);

-- stores: public read for active stores; owner can manage
CREATE POLICY "ecommerce_stores_read_public"
  ON ecommerce_stores FOR SELECT
  USING (is_active = true AND is_suspended = false);

CREATE POLICY "ecommerce_stores_owner_all"
  ON ecommerce_stores FOR ALL
  USING (
    business_id IN (
      SELECT business_id FROM business_members WHERE profile_id = auth.uid()
    )
  );

-- products: published products are publicly readable; owners manage their own
CREATE POLICY "ecommerce_products_read_published"
  ON ecommerce_products FOR SELECT
  USING (status = 'published');

CREATE POLICY "ecommerce_products_owner_read_all"
  ON ecommerce_products FOR SELECT
  USING (
    business_id IN (
      SELECT business_id FROM business_members WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "ecommerce_products_owner_write"
  ON ecommerce_products FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM business_members WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "ecommerce_products_owner_update"
  ON ecommerce_products FOR UPDATE
  USING (
    business_id IN (
      SELECT business_id FROM business_members WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "ecommerce_products_owner_delete"
  ON ecommerce_products FOR DELETE
  USING (
    business_id IN (
      SELECT business_id FROM business_members WHERE profile_id = auth.uid()
    )
  );

-- product images: public read for published products; owner write
CREATE POLICY "ecommerce_product_images_read_all"
  ON ecommerce_product_images FOR SELECT USING (true);

CREATE POLICY "ecommerce_product_images_owner_write"
  ON ecommerce_product_images FOR INSERT
  WITH CHECK (
    product_id IN (
      SELECT id FROM ecommerce_products
      WHERE business_id IN (
        SELECT business_id FROM business_members WHERE profile_id = auth.uid()
      )
    )
  );

CREATE POLICY "ecommerce_product_images_owner_delete"
  ON ecommerce_product_images FOR DELETE
  USING (
    product_id IN (
      SELECT id FROM ecommerce_products
      WHERE business_id IN (
        SELECT business_id FROM business_members WHERE profile_id = auth.uid()
      )
    )
  );

-- product variants: public read; owner write
CREATE POLICY "ecommerce_product_variants_read_all"
  ON ecommerce_product_variants FOR SELECT USING (true);

CREATE POLICY "ecommerce_product_variants_owner_write"
  ON ecommerce_product_variants FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM business_members WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "ecommerce_product_variants_owner_update"
  ON ecommerce_product_variants FOR UPDATE
  USING (
    business_id IN (
      SELECT business_id FROM business_members WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "ecommerce_product_variants_owner_delete"
  ON ecommerce_product_variants FOR DELETE
  USING (
    business_id IN (
      SELECT business_id FROM business_members WHERE profile_id = auth.uid()
    )
  );

-- orders: seller can read their orders; buyer can read their orders; anyone can insert (guest checkout)
CREATE POLICY "ecommerce_orders_seller_read"
  ON ecommerce_orders FOR SELECT
  USING (
    seller_business_id IN (
      SELECT business_id FROM business_members WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "ecommerce_orders_buyer_read"
  ON ecommerce_orders FOR SELECT
  USING (
    buyer_user_id = auth.uid()
    OR buyer_business_id IN (
      SELECT business_id FROM business_members WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "ecommerce_orders_insert_all"
  ON ecommerce_orders FOR INSERT
  WITH CHECK (true);  -- allows guest checkout; validated at app layer

CREATE POLICY "ecommerce_orders_seller_update"
  ON ecommerce_orders FOR UPDATE
  USING (
    seller_business_id IN (
      SELECT business_id FROM business_members WHERE profile_id = auth.uid()
    )
  );

-- order items: readable by seller and buyer
CREATE POLICY "ecommerce_order_items_seller_read"
  ON ecommerce_order_items FOR SELECT
  USING (
    order_id IN (
      SELECT id FROM ecommerce_orders
      WHERE seller_business_id IN (
        SELECT business_id FROM business_members WHERE profile_id = auth.uid()
      )
    )
  );

CREATE POLICY "ecommerce_order_items_buyer_read"
  ON ecommerce_order_items FOR SELECT
  USING (
    order_id IN (
      SELECT id FROM ecommerce_orders
      WHERE buyer_user_id = auth.uid()
         OR buyer_business_id IN (
           SELECT business_id FROM business_members WHERE profile_id = auth.uid()
         )
    )
  );

CREATE POLICY "ecommerce_order_items_insert_all"
  ON ecommerce_order_items FOR INSERT
  WITH CHECK (true);

-- notifications: business members read their own
CREATE POLICY "ecommerce_notifications_owner_read"
  ON ecommerce_notifications FOR SELECT
  USING (
    business_id IN (
      SELECT business_id FROM business_members WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "ecommerce_notifications_owner_update"
  ON ecommerce_notifications FOR UPDATE
  USING (
    business_id IN (
      SELECT business_id FROM business_members WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "ecommerce_notifications_insert_all"
  ON ecommerce_notifications FOR INSERT
  WITH CHECK (true);

-- inventory logs: business members read their own
CREATE POLICY "ecommerce_inventory_logs_owner_read"
  ON ecommerce_inventory_logs FOR SELECT
  USING (
    business_id IN (
      SELECT business_id FROM business_members WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "ecommerce_inventory_logs_insert_all"
  ON ecommerce_inventory_logs FOR INSERT
  WITH CHECK (true);

-- ── Grants ────────────────────────────────────────────────────────────────────

GRANT ALL ON ecommerce_categories TO service_role;
GRANT ALL ON ecommerce_stores TO service_role;
GRANT ALL ON ecommerce_products TO service_role;
GRANT ALL ON ecommerce_product_images TO service_role;
GRANT ALL ON ecommerce_product_variants TO service_role;
GRANT ALL ON ecommerce_orders TO service_role;
GRANT ALL ON ecommerce_order_items TO service_role;
GRANT ALL ON ecommerce_notifications TO service_role;
GRANT ALL ON ecommerce_inventory_logs TO service_role;

GRANT SELECT ON ecommerce_categories TO anon, authenticated;
GRANT SELECT ON ecommerce_stores TO anon, authenticated;
GRANT SELECT ON ecommerce_products TO anon, authenticated;
GRANT SELECT ON ecommerce_product_images TO anon, authenticated;
GRANT SELECT ON ecommerce_product_variants TO anon, authenticated;
GRANT INSERT ON ecommerce_orders TO anon, authenticated;
GRANT INSERT ON ecommerce_order_items TO anon, authenticated;
GRANT INSERT ON ecommerce_notifications TO anon, authenticated;
GRANT INSERT ON ecommerce_inventory_logs TO anon, authenticated;
GRANT SELECT, UPDATE ON ecommerce_orders TO authenticated;
GRANT SELECT ON ecommerce_order_items TO authenticated;
GRANT SELECT, UPDATE ON ecommerce_notifications TO authenticated;
GRANT SELECT ON ecommerce_inventory_logs TO authenticated;
GRANT INSERT, UPDATE, DELETE ON ecommerce_stores TO authenticated;
GRANT INSERT, UPDATE, DELETE ON ecommerce_products TO authenticated;
GRANT INSERT, DELETE ON ecommerce_product_images TO authenticated;
GRANT INSERT, UPDATE, DELETE ON ecommerce_product_variants TO authenticated;

-- ============================================================================
-- FUNDIFLOW - Supabase Migration: 00004_tables_relations
-- Customer, order, inventory, finance, messaging, notification, media,
-- log, and settings tables with foreign key constraints
-- ============================================================================

-- ############################################################################
-- 3. CUSTOMER TABLES
-- ############################################################################

-- -------------------------------------------------------------------
-- 3.1 customers
-- -------------------------------------------------------------------
CREATE TABLE customers (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id         UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  full_name           TEXT NOT NULL,
  phone               TEXT NOT NULL,
  email               TEXT,
  preferences         JSONB,
  notes               TEXT,
  outstanding_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_orders        INTEGER NOT NULL DEFAULT 0,
  active_orders       INTEGER NOT NULL DEFAULT 0,
  last_visit          DATE,
  last_order_at       TIMESTAMPTZ,
  added_by            UUID REFERENCES profiles(id) ON DELETE SET NULL,
  added_by_name       TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(business_id, phone)
);

-- -------------------------------------------------------------------
-- 3.2 customer_measurements - Historical body measurements per customer
-- -------------------------------------------------------------------
CREATE TABLE customer_measurements (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  bust        NUMERIC(6,1),
  waist       NUMERIC(6,1),
  hips        NUMERIC(6,1),
  height      NUMERIC(6,1),
  shoulder    NUMERIC(6,1),
  sleeve      NUMERIC(6,1),
  inseam      NUMERIC(6,1),
  length      NUMERIC(6,1),
  neck        NUMERIC(6,1),
  thigh       NUMERIC(6,1),
  notes       TEXT,
  recorded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ############################################################################
-- 4. ORDER & PRODUCTION TABLES
-- ############################################################################

-- -------------------------------------------------------------------
-- 4.1 orders
-- -------------------------------------------------------------------
CREATE TABLE orders (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id             UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  order_number            TEXT NOT NULL,
  customer_id             UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  customer_name           TEXT NOT NULL,
  customer_phone          TEXT NOT NULL,
  assigned_tailor_id      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_tailor_name    TEXT,
  measurements_snapshot   JSONB,
  design_notes            TEXT,
  stage                   production_stage NOT NULL DEFAULT 'cutting',
  delivery_status         delivery_status NOT NULL DEFAULT 'pending',
  payment_status          payment_status NOT NULL DEFAULT 'unpaid',
  status                  order_status,
  due_date                DATE NOT NULL,
  expected_ready_date     TIMESTAMPTZ,
  subtotal_amount         NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_paid             NUMERIC(12,2) NOT NULL DEFAULT 0,
  balance_amount          NUMERIC(12,2) NOT NULL DEFAULT 0,
  deposit                 NUMERIC(12,2) NOT NULL DEFAULT 0,
  production_notes        TEXT,
  ready_pickup_sms_sent   BOOLEAN NOT NULL DEFAULT false,
  ready_pickup_sms_sent_at TIMESTAMPTZ,
  delay_notification_sent_at TIMESTAMPTZ,
  created_by              UUID REFERENCES profiles(id) ON DELETE SET NULL,
  updated_by              UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(business_id, order_number)
);

-- -------------------------------------------------------------------
-- 4.2 order_garments - Line items on orders
-- -------------------------------------------------------------------
CREATE TABLE order_garments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  quantity      INTEGER NOT NULL CHECK (quantity > 0),
  agreed_price  NUMERIC(12,2) NOT NULL DEFAULT 0,
  style_notes   TEXT,
  fabric_used   NUMERIC(8,2),
  notes         TEXT,
  sort_order    INTEGER NOT NULL DEFAULT 0
);

-- -------------------------------------------------------------------
-- 4.3 order_fabric_selections - Fabric selections for each order
-- -------------------------------------------------------------------
CREATE TABLE order_fabric_selections (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  material_id     UUID,
  material_name   TEXT NOT NULL,
  color           TEXT,
  meters_required NUMERIC(8,2) NOT NULL DEFAULT 0
);

-- -------------------------------------------------------------------
-- 4.4 order_fitting_records - Fitting/adjustment records
-- -------------------------------------------------------------------
CREATE TABLE order_fitting_records (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id            UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  notes               TEXT NOT NULL,
  adjustment_summary  TEXT,
  recorded_by_uid     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  recorded_by_name    TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -------------------------------------------------------------------
-- 4.5 order_material_usage - Materials consumed per order
-- -------------------------------------------------------------------
CREATE TABLE order_material_usage (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  material_id       UUID,
  material_name     TEXT NOT NULL,
  quantity_used     NUMERIC(10,2) NOT NULL CHECK (quantity_used > 0),
  unit              TEXT NOT NULL,
  recorded_by_uid   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  recorded_by_name  TEXT,
  recorded_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -------------------------------------------------------------------
-- 4.6 order_images - Many-to-many: orders <-> images
-- -------------------------------------------------------------------
CREATE TABLE order_images (
  order_id  UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  image_id  UUID NOT NULL,
  PRIMARY KEY (order_id, image_id)
);

-- ############################################################################
-- 5. INVENTORY TABLES
-- ############################################################################

-- -------------------------------------------------------------------
-- 5.1 inventory_categories - Dynamic categories for materials
-- -------------------------------------------------------------------
CREATE TABLE inventory_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(business_id, name)
);

-- -------------------------------------------------------------------
-- 5.2 inventory_units - Dynamic measurement units for materials
-- -------------------------------------------------------------------
CREATE TABLE inventory_units (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(business_id, name)
);

-- -------------------------------------------------------------------
-- 5.3 inventory_materials - Stock items
-- -------------------------------------------------------------------
CREATE TABLE inventory_materials (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  category_id       UUID REFERENCES inventory_categories(id) ON DELETE SET NULL,
  category_name     TEXT NOT NULL DEFAULT 'Uncategorized',
  unit_id           UUID REFERENCES inventory_units(id) ON DELETE SET NULL,
  unit_name         TEXT NOT NULL,
  quantity          NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  reorder_level     NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (reorder_level >= 0),
  average_unit_cost NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (average_unit_cost >= 0),
  supplier_id       UUID,
  image_url         TEXT,
  image_public_id   TEXT,
  fabric_meta       JSONB,
  created_by        UUID REFERENCES profiles(id) ON DELETE SET NULL,
  updated_by        UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -------------------------------------------------------------------
-- 5.4 inventory_material_images - Multiple images per material
-- -------------------------------------------------------------------
CREATE TABLE inventory_material_images (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID NOT NULL REFERENCES inventory_materials(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  public_id   TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

-- -------------------------------------------------------------------
-- 5.5 inventory_material_custom_fields - Dynamic fabric metadata fields
-- -------------------------------------------------------------------
CREATE TABLE inventory_material_custom_fields (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID NOT NULL REFERENCES inventory_materials(id) ON DELETE CASCADE,
  key         TEXT NOT NULL,
  value       TEXT NOT NULL,
  UNIQUE(material_id, key)
);

-- -------------------------------------------------------------------
-- 5.6 suppliers
-- -------------------------------------------------------------------
CREATE TABLE suppliers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  phone           TEXT NOT NULL,
  contact_person  TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(business_id, name)
);

ALTER TABLE inventory_materials ADD CONSTRAINT fk_inventory_materials_supplier
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL;

ALTER TABLE order_fabric_selections ADD CONSTRAINT fk_order_fabric_selections_material
  FOREIGN KEY (material_id) REFERENCES inventory_materials(id) ON DELETE SET NULL;

ALTER TABLE order_material_usage ADD CONSTRAINT fk_order_material_usage_material
  FOREIGN KEY (material_id) REFERENCES inventory_materials(id) ON DELETE SET NULL;

-- -------------------------------------------------------------------
-- 5.7 purchase_orders
-- -------------------------------------------------------------------
CREATE TABLE purchase_orders (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  supplier_id       UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  supplier_name     TEXT NOT NULL,
  material_id       UUID REFERENCES inventory_materials(id) ON DELETE SET NULL,
  material_name     TEXT NOT NULL,
  quantity          NUMERIC(12,2) NOT NULL CHECK (quantity > 0),
  unit              TEXT NOT NULL,
  unit_cost         NUMERIC(12,2) NOT NULL CHECK (unit_cost >= 0),
  status            purchase_order_status NOT NULL DEFAULT 'pending',
  quantity_received NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (quantity_received >= 0),
  expected_date     DATE,
  image_url         TEXT,
  image_public_id   TEXT,
  created_by        UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -------------------------------------------------------------------
-- 5.8 stock_movements - Inventory movement journal
-- -------------------------------------------------------------------
CREATE TABLE stock_movements (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  movement_type     movement_type NOT NULL,
  material_id       UUID REFERENCES inventory_materials(id) ON DELETE SET NULL,
  material_name     TEXT NOT NULL,
  order_id          UUID REFERENCES orders(id) ON DELETE SET NULL,
  quantity_change   NUMERIC(12,2) NOT NULL,
  unit              TEXT NOT NULL,
  reason            TEXT NOT NULL,
  created_by_uid    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_by_name   TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ############################################################################
-- 6. PAYMENT & FINANCE TABLES
-- ############################################################################

-- -------------------------------------------------------------------
-- 6.1 payments - Customer payments
-- -------------------------------------------------------------------
CREATE TABLE payments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id       UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  customer_name     TEXT NOT NULL,
  order_id          UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  order_number      TEXT NOT NULL,
  amount            NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  method            payment_method NOT NULL,
  mpesa_code        TEXT,
  description       TEXT,
  recorded_by_uid   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  recorded_by_name  TEXT,
  recorded_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -------------------------------------------------------------------
-- 6.2 expenses - Business expenses
-- -------------------------------------------------------------------
CREATE TABLE expenses (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  category          expense_category NOT NULL,
  amount            NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  description       TEXT NOT NULL,
  notes             TEXT DEFAULT '',
  receipt_url       TEXT DEFAULT '',
  supplier_id       UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  supplier_name     TEXT DEFAULT '',
  expense_date      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by_uid    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_by_name   TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -------------------------------------------------------------------
-- 6.3 withdrawals - Owner/business withdrawals
-- -------------------------------------------------------------------
CREATE TABLE withdrawals (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  amount            NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  reason            TEXT NOT NULL,
  category          withdrawal_category NOT NULL,
  withdrawn_by_uid  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  withdrawn_by_name TEXT,
  withdrawal_date   TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes             TEXT DEFAULT '',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -------------------------------------------------------------------
-- 6.4 transactions - Unified financial transaction ledger
-- -------------------------------------------------------------------
CREATE TABLE transactions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id         UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  type                transaction_type NOT NULL,
  amount              NUMERIC(14,2) NOT NULL,
  description         TEXT NOT NULL,
  reference_id        TEXT,
  reference_type      TEXT,
  reference_label     TEXT,
  linked_entity_id    TEXT,
  linked_entity_type  TEXT,
  linked_entity_name  TEXT,
  performed_by_uid    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  performed_by_name   TEXT,
  status              transaction_status NOT NULL DEFAULT 'completed',
  notes               TEXT DEFAULT '',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -------------------------------------------------------------------
-- 6.5 consumption_reports - Material consumption snapshot per order
-- -------------------------------------------------------------------
CREATE TABLE consumption_reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  order_id      UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  order_number  TEXT NOT NULL,
  items         JSONB NOT NULL,
  total_items   INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ############################################################################
-- 7. MESSAGING TABLES
-- ############################################################################

-- -------------------------------------------------------------------
-- 7.1 conversations
-- -------------------------------------------------------------------
CREATE TABLE conversations (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id           UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  participants          UUID[] NOT NULL,
  participant_profiles  JSONB NOT NULL,
  type                  conversation_type NOT NULL DEFAULT 'direct',
  title                 TEXT DEFAULT '',
  priority              announcement_priority NOT NULL DEFAULT 'normal',
  pinned                BOOLEAN NOT NULL DEFAULT false,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -------------------------------------------------------------------
-- 7.2 messages
-- -------------------------------------------------------------------
CREATE TABLE messages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id   UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  business_id       UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  sender_uid        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sender_name       TEXT NOT NULL,
  text              TEXT NOT NULL DEFAULT '',
  attachments       JSONB DEFAULT '[]'::jsonb,
  read_by           UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  edited_at         TIMESTAMPTZ,
  deleted_at        TIMESTAMPTZ,
  deleted_by_uid    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  is_deleted        BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ############################################################################
-- 8. NOTIFICATION TABLES
-- ############################################################################

-- -------------------------------------------------------------------
-- 8.1 notifications
-- -------------------------------------------------------------------
CREATE TABLE notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  recipient_uid   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type            notification_type NOT NULL,
  title           TEXT NOT NULL,
  message         TEXT NOT NULL,
  link            TEXT DEFAULT '',
  read            BOOLEAN NOT NULL DEFAULT false,
  archived        BOOLEAN NOT NULL DEFAULT false,
  metadata        JSONB DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ############################################################################
-- 9. MEDIA TABLES
-- ############################################################################

-- -------------------------------------------------------------------
-- 9.1 images - Cloudinary image metadata
-- -------------------------------------------------------------------
CREATE TABLE images (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  order_id        UUID REFERENCES orders(id) ON DELETE SET NULL,
  customer_id     UUID REFERENCES customers(id) ON DELETE SET NULL,
  url             TEXT NOT NULL,
  public_id       TEXT NOT NULL,
  width           INTEGER NOT NULL DEFAULT 0,
  height          INTEGER NOT NULL DEFAULT 0,
  format          TEXT,
  uploaded_by_uid UUID REFERENCES profiles(id) ON DELETE SET NULL,
  uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE order_images ADD CONSTRAINT fk_order_images_image
  FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE CASCADE;

-- ############################################################################
-- 10. LOG TABLES
-- ############################################################################

-- -------------------------------------------------------------------
-- 10.1 sms_logs
-- -------------------------------------------------------------------
CREATE TABLE sms_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  order_id    UUID REFERENCES orders(id) ON DELETE SET NULL,
  recipient   TEXT NOT NULL,
  message     TEXT NOT NULL,
  type        sms_type NOT NULL,
  status      sms_status NOT NULL,
  response    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -------------------------------------------------------------------
-- 10.2 audit_logs - System-wide audit trail
-- -------------------------------------------------------------------
CREATE TABLE audit_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  actor_uid       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  actor_name      TEXT,
  action          TEXT NOT NULL,
  entity_type     TEXT NOT NULL,
  entity_id       TEXT,
  changes         JSONB,
  ip_address      INET,
  user_agent      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ############################################################################
-- 11. APPLICATION SETTINGS & STATE
-- ############################################################################

-- -------------------------------------------------------------------
-- 11.1 app_settings - Business-level configuration key-value store
-- -------------------------------------------------------------------
CREATE TABLE app_settings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  key         TEXT NOT NULL,
  value       JSONB NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(business_id, key)
);

-- -------------------------------------------------------------------
-- 11.2 weekly_reports - Weekly financial report snapshots
-- -------------------------------------------------------------------
CREATE TABLE weekly_reports (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id           UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  week_start            DATE NOT NULL,
  week_end              DATE NOT NULL,
  revenue               NUMERIC(14,2) NOT NULL DEFAULT 0,
  expenses              NUMERIC(14,2) NOT NULL DEFAULT 0,
  withdrawals           NUMERIC(14,2) NOT NULL DEFAULT 0,
  net_profit            NUMERIC(14,2) NOT NULL DEFAULT 0,
  profit_margin         NUMERIC(5,2) NOT NULL DEFAULT 0,
  order_count           INTEGER NOT NULL DEFAULT 0,
  payment_count         INTEGER NOT NULL DEFAULT 0,
  top_expense_category  TEXT,
  generated_by          UUID REFERENCES profiles(id) ON DELETE SET NULL,
  generated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(business_id, week_start)
);

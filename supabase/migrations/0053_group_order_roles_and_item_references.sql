-- Make group-order responsibilities explicit and let unified line items belong
-- to an individual recipient, with their own design/reference image.
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS representative_customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS representative_name TEXT,
  ADD COLUMN IF NOT EXISTS representative_phone TEXT,
  ADD COLUMN IF NOT EXISTS representative_email TEXT,
  ADD COLUMN IF NOT EXISTS payer_customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payer_name TEXT,
  ADD COLUMN IF NOT EXISTS payer_phone TEXT;

ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS member_customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS member_name TEXT,
  ADD COLUMN IF NOT EXISTS reference_image_url TEXT;

CREATE INDEX IF NOT EXISTS idx_order_items_member ON order_items(order_id, member_customer_id);

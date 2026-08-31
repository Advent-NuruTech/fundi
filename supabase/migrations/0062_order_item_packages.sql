-- A priced parent line (for example, "Suit") can contain non-billable pieces
-- (shirt, trouser, half coat). Prices remain exclusively on the parent line.

ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS included_parts JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE order_items
  DROP CONSTRAINT IF EXISTS order_items_included_parts_is_array;

ALTER TABLE order_items
  ADD CONSTRAINT order_items_included_parts_is_array
  CHECK (jsonb_typeof(included_parts) = 'array');

COMMENT ON COLUMN order_items.included_parts IS
  'Non-billable pieces included in this priced parent line. Shape: [{id, name, quantity, notes?}].';

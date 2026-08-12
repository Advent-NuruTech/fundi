-- First-class customer billing documents. Numbers are per business and are
-- allocated under a row lock, so concurrent cashiers cannot issue duplicates.
DO $$
BEGIN
  CREATE TYPE invoice_status AS ENUM ('draft', 'issued', 'partial', 'paid', 'overdue', 'void');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS document_number_counters (
  business_id UUID PRIMARY KEY REFERENCES businesses(id) ON DELETE CASCADE,
  next_invoice_number BIGINT NOT NULL DEFAULT 1,
  next_receipt_number BIGINT NOT NULL DEFAULT 1,
  CHECK (next_invoice_number > 0), CHECK (next_receipt_number > 0)
);

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  order_id UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE RESTRICT, customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  invoice_number TEXT NOT NULL, due_date DATE NOT NULL, status invoice_status NOT NULL DEFAULT 'issued',
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0), amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0), balance_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (balance_amount >= 0),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(), paid_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, invoice_number)
);

ALTER TABLE payments ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES invoices(id) ON DELETE RESTRICT, ADD COLUMN IF NOT EXISTS payment_reference TEXT;
CREATE TABLE IF NOT EXISTS payment_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT, payment_id UUID NOT NULL UNIQUE REFERENCES payments(id) ON DELETE RESTRICT,
  receipt_number TEXT NOT NULL, amount NUMERIC(12,2) NOT NULL CHECK (amount > 0), payment_method payment_method NOT NULL,
  payment_reference TEXT, received_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE (business_id, receipt_number)
);
CREATE INDEX IF NOT EXISTS idx_invoices_business_status_due ON invoices(business_id, status, due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_receipts_invoice ON payment_receipts(invoice_id);

CREATE OR REPLACE FUNCTION next_business_document_number(p_business_id UUID, p_kind TEXT)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n BIGINT;
BEGIN
  INSERT INTO document_number_counters (business_id) VALUES (p_business_id) ON CONFLICT (business_id) DO NOTHING;
  IF p_kind = 'invoice' THEN
    UPDATE document_number_counters SET next_invoice_number = next_invoice_number + 1 WHERE business_id = p_business_id RETURNING next_invoice_number - 1 INTO n;
    RETURN 'INV-' || lpad(n::TEXT, 6, '0');
  ELSIF p_kind = 'receipt' THEN
    UPDATE document_number_counters SET next_receipt_number = next_receipt_number + 1 WHERE business_id = p_business_id RETURNING next_receipt_number - 1 INTO n;
    RETURN 'RCT-' || lpad(n::TEXT, 6, '0');
  END IF;
  RAISE EXCEPTION 'Unknown document number kind: %', p_kind;
END; $$;

CREATE OR REPLACE FUNCTION create_invoice_for_order()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_total NUMERIC(12,2);
BEGIN
  v_total := GREATEST(0, COALESCE(NEW.subtotal_amount, 0) + COALESCE(NEW.delivery_fee, 0));
  INSERT INTO invoices (business_id, order_id, customer_id, invoice_number, due_date, status, total_amount, balance_amount)
  VALUES (NEW.business_id, NEW.id, NEW.customer_id, next_business_document_number(NEW.business_id, 'invoice'), NEW.due_date,
    CASE WHEN NEW.due_date < CURRENT_DATE THEN 'overdue' ELSE 'issued' END, v_total, v_total);
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION assign_payment_invoice()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_invoice_id UUID;
BEGIN
  SELECT id INTO v_invoice_id FROM invoices WHERE order_id = NEW.order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'No invoice exists for order %', NEW.order_id; END IF;
  NEW.invoice_id := v_invoice_id;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION finalize_payment_receipt_and_balances()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_paid NUMERIC(12,2); v_balance NUMERIC(12,2); v_due_date DATE; v_status invoice_status;
BEGIN
  SELECT amount_paid + NEW.amount, GREATEST(0, total_amount - amount_paid - NEW.amount), due_date INTO v_paid, v_balance, v_due_date FROM invoices WHERE id = NEW.invoice_id FOR UPDATE;
  IF NEW.amount > (SELECT balance_amount FROM invoices WHERE id = NEW.invoice_id) THEN RAISE EXCEPTION 'Payment exceeds the invoice balance'; END IF;
  v_status := CASE WHEN v_balance = 0 THEN 'paid' WHEN v_due_date < CURRENT_DATE THEN 'overdue' WHEN v_paid > 0 THEN 'partial' ELSE 'issued' END;
  UPDATE invoices SET amount_paid = v_paid, balance_amount = v_balance, status = v_status, paid_at = CASE WHEN v_status = 'paid' THEN now() ELSE NULL END, updated_at = now() WHERE id = NEW.invoice_id;
  INSERT INTO payment_receipts (business_id, invoice_id, payment_id, receipt_number, amount, payment_method, payment_reference, received_at)
  VALUES (NEW.business_id, NEW.invoice_id, NEW.id, next_business_document_number(NEW.business_id, 'receipt'), NEW.amount, NEW.method, COALESCE(NEW.payment_reference, NEW.mpesa_code), NEW.recorded_at);
  UPDATE orders SET amount_paid = v_paid, balance_amount = v_balance, payment_status = CASE WHEN v_status = 'paid' THEN 'paid' WHEN v_status = 'partial' THEN 'partial' ELSE 'unpaid' END, updated_at = now() WHERE id = NEW.order_id;
  UPDATE customers SET outstanding_balance = GREATEST(0, COALESCE(outstanding_balance, 0) - NEW.amount), updated_at = now() WHERE id = NEW.customer_id;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS orders_create_invoice ON orders;
CREATE TRIGGER orders_create_invoice AFTER INSERT ON orders FOR EACH ROW EXECUTE FUNCTION create_invoice_for_order();
DROP TRIGGER IF EXISTS payments_assign_invoice ON payments;
CREATE TRIGGER payments_assign_invoice BEFORE INSERT ON payments FOR EACH ROW EXECUTE FUNCTION assign_payment_invoice();
DROP TRIGGER IF EXISTS payments_finalize_receipt ON payments;
CREATE TRIGGER payments_finalize_receipt AFTER INSERT ON payments FOR EACH ROW EXECUTE FUNCTION finalize_payment_receipt_and_balances();

CREATE OR REPLACE FUNCTION sync_invoice_from_order()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_total NUMERIC(12,2); v_paid NUMERIC(12,2); v_due DATE;
BEGIN
  v_total := GREATEST(0, COALESCE(NEW.subtotal_amount, 0) + COALESCE(NEW.delivery_fee, 0));
  SELECT amount_paid, due_date INTO v_paid, v_due FROM invoices WHERE order_id = NEW.id FOR UPDATE;
  UPDATE invoices SET due_date = NEW.due_date, total_amount = v_total, balance_amount = GREATEST(0, v_total - v_paid),
    status = CASE WHEN v_total - v_paid <= 0 THEN 'paid' WHEN NEW.due_date < CURRENT_DATE THEN 'overdue' WHEN v_paid > 0 THEN 'partial' ELSE 'issued' END,
    updated_at = now() WHERE order_id = NEW.id;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS orders_sync_invoice ON orders;
CREATE TRIGGER orders_sync_invoice AFTER UPDATE OF due_date, subtotal_amount, delivery_fee ON orders FOR EACH ROW EXECUTE FUNCTION sync_invoice_from_order();

-- Backfill documents without changing historical balances.
INSERT INTO invoices (business_id, order_id, customer_id, invoice_number, due_date, status, total_amount, amount_paid, balance_amount, issued_at)
SELECT o.business_id, o.id, o.customer_id, next_business_document_number(o.business_id, 'invoice'), o.due_date,
  CASE WHEN o.balance_amount <= 0 THEN 'paid' WHEN o.amount_paid > 0 THEN 'partial' ELSE 'issued' END::invoice_status,
  COALESCE(o.subtotal_amount, 0) + COALESCE(o.delivery_fee, 0), COALESCE(o.amount_paid, 0), COALESCE(o.balance_amount, 0), o.created_at
FROM orders o WHERE NOT EXISTS (SELECT 1 FROM invoices i WHERE i.order_id = o.id);
UPDATE payments p SET invoice_id = i.id FROM invoices i WHERE i.order_id = p.order_id AND p.invoice_id IS NULL;
INSERT INTO payment_receipts (business_id, invoice_id, payment_id, receipt_number, amount, payment_method, payment_reference, received_at)
SELECT p.business_id, p.invoice_id, p.id, next_business_document_number(p.business_id, 'receipt'), p.amount, p.method, COALESCE(p.payment_reference, p.mpesa_code), p.recorded_at
FROM payments p WHERE NOT EXISTS (SELECT 1 FROM payment_receipts r WHERE r.payment_id = p.id);
ALTER TABLE payments ALTER COLUMN invoice_id SET NOT NULL;

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_receipts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS invoices_select ON invoices;
CREATE POLICY invoices_select ON invoices FOR SELECT USING (has_business_capability(business_id, 'payments.read'));
DROP POLICY IF EXISTS payment_receipts_select ON payment_receipts;
CREATE POLICY payment_receipts_select ON payment_receipts FOR SELECT USING (has_business_capability(business_id, 'payments.read'));
GRANT SELECT ON invoices, payment_receipts TO authenticated;

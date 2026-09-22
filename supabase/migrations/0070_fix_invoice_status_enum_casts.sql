-- ============================================================================
-- FUNDIFLOW - Migration: 0070_fix_invoice_status_enum_casts
--
-- Fix: "column \"status\" is of type invoice_status but expression is of type
-- text" (SQLSTATE 42804) on order creation.
--
-- Migration 0055 added an AFTER INSERT trigger on orders (orders_create_invoice)
-- that inserts into invoices.status, which is the invoice_status enum. Its
-- function computed the status with a plain CASE expression. A CASE expression
-- whose branches are string literals resolves to type text, and PostgreSQL has
-- no implicit text -> enum cast, so the trigger raised 42804 and the ENTIRE
-- order insert (plus every payment receipt / order update) was rolled back.
--
-- This migration re-creates the three affected functions with explicit
-- ::invoice_status / ::payment_status casts on each status expression. It does
-- NOT change any business logic or column types, and CREATE OR REPLACE FUNCTION
-- keeps existing triggers attached, so nothing else is affected.
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION create_invoice_for_order()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_total NUMERIC(12,2);
BEGIN
  v_total := GREATEST(0, COALESCE(NEW.subtotal_amount, 0) + COALESCE(NEW.delivery_fee, 0));
  INSERT INTO invoices (business_id, order_id, customer_id, invoice_number, due_date, status, total_amount, balance_amount)
  VALUES (NEW.business_id, NEW.id, NEW.customer_id, next_business_document_number(NEW.business_id, 'invoice'), NEW.due_date,
    (CASE WHEN NEW.due_date < CURRENT_DATE THEN 'overdue' ELSE 'issued' END)::invoice_status, v_total, v_total);
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
  v_status := (CASE WHEN v_balance = 0 THEN 'paid' WHEN v_due_date < CURRENT_DATE THEN 'overdue' WHEN v_paid > 0 THEN 'partial' ELSE 'issued' END)::invoice_status;
  UPDATE invoices SET amount_paid = v_paid, balance_amount = v_balance, status = v_status, paid_at = CASE WHEN v_status = 'paid' THEN now() ELSE NULL END, updated_at = now() WHERE id = NEW.invoice_id;
  INSERT INTO payment_receipts (business_id, invoice_id, payment_id, receipt_number, amount, payment_method, payment_reference, received_at)
  VALUES (NEW.business_id, NEW.invoice_id, NEW.id, next_business_document_number(NEW.business_id, 'receipt'), NEW.amount, NEW.method, COALESCE(NEW.payment_reference, NEW.mpesa_code), NEW.recorded_at);
  UPDATE orders SET amount_paid = v_paid, balance_amount = v_balance,
    payment_status = (CASE WHEN v_status = 'paid' THEN 'paid' WHEN v_status = 'partial' THEN 'partial' ELSE 'unpaid' END)::payment_status,
    updated_at = now() WHERE id = NEW.order_id;
  UPDATE customers SET outstanding_balance = GREATEST(0, COALESCE(outstanding_balance, 0) - NEW.amount), updated_at = now() WHERE id = NEW.customer_id;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION sync_invoice_from_order()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_total NUMERIC(12,2); v_paid NUMERIC(12,2); v_due DATE;
BEGIN
  v_total := GREATEST(0, COALESCE(NEW.subtotal_amount, 0) + COALESCE(NEW.delivery_fee, 0));
  SELECT amount_paid, due_date INTO v_paid, v_due FROM invoices WHERE order_id = NEW.id FOR UPDATE;
  UPDATE invoices SET due_date = NEW.due_date, total_amount = v_total, balance_amount = GREATEST(0, v_total - v_paid),
    status = (CASE WHEN v_total - v_paid <= 0 THEN 'paid' WHEN NEW.due_date < CURRENT_DATE THEN 'overdue' WHEN v_paid > 0 THEN 'partial' ELSE 'issued' END)::invoice_status,
    updated_at = now() WHERE order_id = NEW.id;
  RETURN NEW;
END; $$;

COMMIT;
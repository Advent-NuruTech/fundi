-- ============================================================================
-- FUNDIFLOW - Migration 00013: Add delay_reason to orders
-- Supports optional reason text when sending delay notifications to customers
-- ============================================================================

ALTER TABLE orders ADD COLUMN IF NOT EXISTS delay_reason TEXT;

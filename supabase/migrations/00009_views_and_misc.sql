-- ============================================================================
-- FUNDIFLOW - Supabase Migration: 00009_views_and_misc
-- Views and schema documentation
-- ============================================================================

-- ############################################################################
-- 14. VIEWS
-- ############################################################################

-- -------------------------------------------------------------------
-- 14.1 v_dashboard_metrics - Key business metrics
-- -------------------------------------------------------------------
CREATE OR REPLACE VIEW v_dashboard_metrics
WITH (security_invoker = true) AS
SELECT
  b.id AS business_id,
  b.name AS business_name,
  COALESCE(active_orders.count, 0) AS active_orders,
  COALESCE(overdue_orders.count, 0) AS overdue_orders,
  COALESCE(low_stock.count, 0) AS low_stock_items,
  COALESCE(revenue.total, 0) AS total_revenue,
  COALESCE(pending_balances.total, 0) AS pending_balances,
  COALESCE(active_workers.count, 0) AS active_workers
FROM businesses b
LEFT JOIN LATERAL (
  SELECT COUNT(*) AS count FROM orders
  WHERE business_id = b.id AND stage != 'delivered'
) active_orders ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*) AS count FROM orders
  WHERE business_id = b.id AND stage != 'delivered' AND due_date < CURRENT_DATE
) overdue_orders ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*) AS count FROM inventory_materials
  WHERE business_id = b.id AND quantity <= reorder_level
) low_stock ON true
LEFT JOIN LATERAL (
  SELECT COALESCE(SUM(amount), 0) AS total FROM payments
  WHERE business_id = b.id
) revenue ON true
LEFT JOIN LATERAL (
  SELECT COALESCE(SUM(balance_amount), 0) AS total FROM orders
  WHERE business_id = b.id AND stage != 'delivered'
) pending_balances ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*) AS count FROM business_members
  WHERE business_id = b.id AND active = true
) active_workers ON true;

-- -------------------------------------------------------------------
-- 14.2 v_financial_summary - Period-over-period financial summary
-- -------------------------------------------------------------------
CREATE OR REPLACE VIEW v_financial_summary
WITH (security_invoker = true) AS
WITH months AS (
  SELECT business_id, DATE_TRUNC('month', recorded_at) AS month FROM payments
  UNION
  SELECT business_id, DATE_TRUNC('month', expense_date) AS month FROM expenses
  UNION
  SELECT business_id, DATE_TRUNC('month', withdrawal_date) AS month FROM withdrawals
),
payment_totals AS (
  SELECT business_id, DATE_TRUNC('month', recorded_at) AS month, SUM(amount) AS revenue
  FROM payments
  GROUP BY business_id, DATE_TRUNC('month', recorded_at)
),
expense_totals AS (
  SELECT business_id, DATE_TRUNC('month', expense_date) AS month, SUM(amount) AS expenses
  FROM expenses
  GROUP BY business_id, DATE_TRUNC('month', expense_date)
),
withdrawal_totals AS (
  SELECT business_id, DATE_TRUNC('month', withdrawal_date) AS month, SUM(amount) AS withdrawals
  FROM withdrawals
  GROUP BY business_id, DATE_TRUNC('month', withdrawal_date)
)
SELECT
  m.business_id,
  m.month,
  COALESCE(p.revenue, 0) AS revenue,
  COALESCE(e.expenses, 0) AS expenses,
  COALESCE(w.withdrawals, 0) AS withdrawals,
  COALESCE(p.revenue, 0) - COALESCE(e.expenses, 0) - COALESCE(w.withdrawals, 0) AS net_profit
FROM months m
LEFT JOIN payment_totals p ON p.business_id = m.business_id AND p.month = m.month
LEFT JOIN expense_totals e ON e.business_id = m.business_id AND e.month = m.month
LEFT JOIN withdrawal_totals w ON w.business_id = m.business_id AND w.month = m.month;

-- -------------------------------------------------------------------
-- 14.3 v_worker_productivity - Employee delivery stats
-- -------------------------------------------------------------------
CREATE OR REPLACE VIEW v_worker_productivity
WITH (security_invoker = true) AS
SELECT
  p.id AS profile_id,
  p.display_name,
  p.business_id,
  COUNT(o.id) FILTER (WHERE o.stage = 'delivered') AS delivered_orders,
  COUNT(o.id) FILTER (WHERE o.stage != 'delivered') AS active_orders
FROM profiles p
LEFT JOIN orders o ON o.assigned_tailor_id = p.id
WHERE p.business_id IS NOT NULL
GROUP BY p.id, p.display_name, p.business_id;

-- ############################################################################
-- 16. INDEX STRATEGY SUMMARY
-- ############################################################################
--
-- Each table has a business_id index because all queries are multi-tenant.
-- Additional indexes serve the most common query patterns in the codebase:
--
-- **Point lookups:** PKs, FKs, order_number, customer phone/email
-- **Filters:** status columns (stage, payment_status, delivery_status, etc.)
-- **Sorted queries:** created_at DESC, updated_at DESC, recorded_at DESC
-- **Role-based:** assigned_tailor_id for tailor views
-- **Aggregation:** business_id + category for expense/withdrawal breakdowns
-- **Alerts:** low_stock (quantity <= reorder_level), overdue orders
-- **Search:** GIN on conversation participants array
-- **Uniqueness:** business-scoped unique constraints (business_id + code)

-- ############################################################################
-- 17. COMPLETE ENTITY INVENTORY (CODEBASE REVERSE ENGINEERING SUMMARY)
-- ############################################################################
--
-- The following entities were discovered by analyzing the full codebase:
--
-- ## TABLES (34 tables)
-- 1.  profiles              - User profiles (from Firebase `users` collection)
-- 2.  businesses            - Tenant/workshop entities (from Firebase `businesses`)
-- 3.  business_members      - Profile-to-business membership (from `members` subcollection)
-- 4.  employee_invitations  - Pending invites (from `invitations` subcollection)
-- 5.  customers             - Customer records (from `customers`)
-- 6.  customer_measurements - Body measurements (embedded in Customer type, normalized)
-- 7.  orders                - Tailoring orders (from `orders`)
-- 8.  order_garments        - Garment line items (embedded OrderGarmentItem[], normalized)
-- 9.  order_fabric_selections - Fabric picks (embedded FabricSelection[], normalized)
-- 10. order_fitting_records - Fitting records (embedded FittingRecord[], normalized)
-- 11. order_material_usage  - Material consumed (embedded MaterialUsageRecord[], normalized)
-- 12. order_images          - Order-to-image mapping (embedded imageIds[], normalized)
-- 13. inventory_categories  - Material categories (from `categories`)
-- 14. inventory_units       - Measurement units (from `units`)
-- 15. inventory_materials   - Stock items (from `inventory_materials`)
-- 16. inventory_material_images - Multiple material images (embedded MaterialImage[])
-- 17. inventory_material_custom_fields - Dynamic fabric metadata (embedded FabricMeta)
-- 18. suppliers             - Vendors (from `suppliers`)
-- 19. purchase_orders       - Stock orders (from `purchase_orders`)
-- 20. stock_movements       - Inventory journal (from `stock_movements`)
-- 21. payments              - Customer payments (from `payments`)
-- 22. expenses              - Business expenses (from `expenses`)
-- 23. withdrawals           - Owner withdrawals (from `withdrawals`)
-- 24. transactions          - Unified ledger (from `transactions`)
-- 25. consumption_reports   - Usage snapshots (from `consumption_reports`)
-- 26. conversations         - Chat threads (from `conversations`)
-- 27. messages              - Chat messages (from `messages` subcollection)
-- 28. notifications         - User alerts (from `notifications`)
-- 29. images                - Cloudinary metadata (from `images`)
-- 30. sms_logs              - SMS delivery log (from `sms_logs`)
-- 31. audit_logs            - System audit trail (implied by created_by/updated_by)
-- 32. app_settings          - Business config key-value store
-- 33. weekly_reports        - Financial snapshots (from notification metadata pattern)
-- 34. employees (legacy)    - Old employee model (from old `employees` subcollection)
--
-- ## ENUMS (17 types)
-- user_role, employee_role, pay_period, business_plan, invitation_status,
-- order_status, production_stage, delivery_status, payment_status,
-- payment_method, transaction_type, transaction_status, notification_type,
-- conversation_type, announcement_priority, purchase_order_status,
-- sms_type, sms_status, movement_type, expense_category, withdrawal_category,
-- sync_status, message_attachment_type
--
-- ## RELATIONSHIPS
-- All entities are business-scoped (multi-tenant). Key FKs:
--   profiles.business_id → businesses.id
--   business_members.{business_id, profile_id} → businesses.id, profiles.id
--   orders.customer_id → customers.id
--   orders.assigned_tailor_id → profiles.id
--   payments.{order_id, customer_id} → orders.id, customers.id
--   inventory_materials.{category_id, unit_id, supplier_id} → respective tables
--   stock_movements.{material_id, order_id} → inventory_materials.id, orders.id
--   purchase_orders.{supplier_id, material_id} → suppliers.id, inventory_materials.id
--   messages.conversation_id → conversations.id
--   order_garments.order_id → orders.id (cascade delete)
--
-- ## LEGACY TYPES PRESERVED
-- The old `EmployeeRole` and `OrderStatus` enums are preserved for backward
-- compatibility. The `employees` collection from the earlier schema maps to
-- `business_members` in the new schema.

-- ############################################################################
-- 18. USAGE NOTES
-- ############################################################################
--
-- ## SUPABASE AUTH INTEGRATION
-- This schema uses Supabase `auth.users` as the identity provider. The
-- `profiles` table has a 1:1 FK to `auth.users(id)`. When a user registers:
--   1. Supabase Auth creates the auth.users row
--   2. A trigger or application logic creates the corresponding profiles row
--   3. On business creation, the owner gets business_id set on their profile
--   4. Invited employees get business_members rows
--
-- ## MULTI-TENANCY
-- All data is partitioned by `business_id`. RLS policies enforce that users
-- can only see data belonging to businesses they are members of.
--
-- ## SOFT DELETE
-- Not implemented as a blanket pattern. Instead:
--   - `active` boolean on profiles, business_members, businesses
--   - `deleted_at` on messages (soft-delete via is_deleted)
--   - Hard deletes on most inventory/tx data via DELETE CASCADE
--
-- ## AUDIT TRAIL
-- - All tables have created_at/updated_at timestamps
-- - All mutation tables record created_by/updated_by actor references
-- - The audit_logs table captures all significant state changes
-- - Database triggers automatically manage updated_at
--
-- ## FINANCIAL INTEGRITY
-- - All monetary values use NUMERIC(12,2) or NUMERIC(14,2) for precision
-- - Check constraints prevent negative quantities and amounts
-- - Foreign keys with RESTRICT prevent orphaned financial records
-- - Transaction ledger provides an immutable audit trail
-- - Customer outstanding balances are computed and cached with triggers

-- ############################################################################
-- END OF SCHEMA
-- ############################################################################

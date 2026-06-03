-- ============================================================================
-- FUNDIFLOW - Supabase Migration: 00002_enums
-- Enum types
-- ============================================================================

CREATE TYPE user_role AS ENUM (
  'owner',
  'admin_manager',
  'tailor',
  'receptionist',
  'inventory_manager',
  'cashier'
);

CREATE TYPE employee_role AS ENUM (
  'admin',
  'manager',
  'tailor',
  'ironman',
  'cutter',
  'receptionist',
  'fitter'
);

CREATE TYPE pay_period AS ENUM (
  'daily',
  'weekly',
  'monthly'
);

CREATE TYPE business_plan AS ENUM (
  'starter',
  'professional',
  'enterprise'
);

CREATE TYPE invitation_status AS ENUM (
  'pending',
  'accepted',
  'revoked'
);

CREATE TYPE order_status AS ENUM (
  'New',
  'In Progress',
  'Cutting',
  'Sewing',
  'Fitting',
  'Finishing',
  'Ready for Pickup',
  'Waiting for Customer Pickup',
  'Completed & Picked',
  'Delivered',
  'Cancelled'
);

CREATE TYPE production_stage AS ENUM (
  'cutting',
  'stitching',
  'fitting',
  'finishing',
  'ready_for_pickup',
  'delivered'
);

CREATE TYPE delivery_status AS ENUM (
  'pending',
  'ready',
  'picked'
);

CREATE TYPE payment_status AS ENUM (
  'unpaid',
  'partial',
  'paid'
);

CREATE TYPE payment_method AS ENUM (
  'cash',
  'mpesa',
  'bank'
);

CREATE TYPE transaction_type AS ENUM (
  'payment_received',
  'expense',
  'withdrawal',
  'inventory_purchase',
  'refund',
  'adjustment'
);

CREATE TYPE transaction_status AS ENUM (
  'completed',
  'pending',
  'cancelled'
);

CREATE TYPE notification_type AS ENUM (
  'order_assigned',
  'order_updated',
  'payment_received',
  'invitation_accepted',
  'message_received',
  'announcement',
  'low_stock',
  'member_joined',
  'system',
  'material_added',
  'stock_received',
  'stock_adjusted',
  'purchase_order_created',
  'purchase_order_received',
  'new_order_created',
  'order_stage_changed',
  'order_completed',
  'materials_consumed'
);

CREATE TYPE conversation_type AS ENUM (
  'direct',
  'announcement'
);

CREATE TYPE announcement_priority AS ENUM (
  'low',
  'normal',
  'high',
  'urgent'
);

CREATE TYPE purchase_order_status AS ENUM (
  'pending',
  'partial',
  'received'
);

CREATE TYPE sms_type AS ENUM (
  'ready_for_pickup',
  'delay_notification'
);

CREATE TYPE sms_status AS ENUM (
  'success',
  'failed'
);

CREATE TYPE movement_type AS ENUM (
  'stock_in',
  'stock_out',
  'adjustment',
  'used_in_order',
  'wastage',
  'return'
);

CREATE TYPE expense_category AS ENUM (
  'rent',
  'salaries',
  'transport',
  'utilities',
  'inventory_purchases',
  'marketing',
  'maintenance',
  'miscellaneous'
);

CREATE TYPE withdrawal_category AS ENUM (
  'owner_drawings',
  'salary_advance',
  'business_expenses',
  'tax',
  'other'
);

CREATE TYPE sync_status AS ENUM (
  'pending',
  'syncing',
  'synced',
  'failed'
);

CREATE TYPE message_attachment_type AS ENUM (
  'image',
  'file'
);

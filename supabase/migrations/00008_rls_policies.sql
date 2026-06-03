-- ============================================================================
-- FUNDIFLOW - Supabase Migration: 00008_rls_policies
-- Row Level Security policies for all tenant-scoped tables
-- ============================================================================

-- Enable RLS on all tenant-scoped tables
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_garments ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_fabric_selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_fitting_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_material_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_material_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_material_custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE consumption_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE images ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_reports ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------------------
-- 15.1 Profiles: users can read/update their own; business sees members
-- -------------------------------------------------------------------
CREATE POLICY profiles_own ON profiles
  FOR ALL USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY profiles_business_read ON profiles
  FOR SELECT USING (
    id = auth.uid()
    OR business_id = ANY(get_business_ids())
    OR EXISTS (
      SELECT 1
      FROM business_members bm
      WHERE bm.profile_id = profiles.id
        AND bm.business_id = ANY(get_business_ids())
        AND bm.active = true
    )
  );

-- -------------------------------------------------------------------
-- 15.2 Businesses: owners and members can read
-- -------------------------------------------------------------------
CREATE POLICY businesses_select ON businesses
  FOR SELECT USING (
    owner_uid = auth.uid()
    OR is_business_member(id)
  );

CREATE POLICY businesses_update ON businesses
  FOR UPDATE USING (
    owner_uid = auth.uid() OR has_business_capability(id, 'workshop.manage')
  )
  WITH CHECK (
    owner_uid = auth.uid() OR has_business_capability(id, 'workshop.manage')
  );

-- -------------------------------------------------------------------
-- 15.3 Generic business-scoped policy (for all tenant tables)
-- -------------------------------------------------------------------
-- Uses the pattern: business_id IN (user's businesses)

-- Business Members
CREATE POLICY business_members_select ON business_members
  FOR SELECT USING (is_business_member(business_id));
CREATE POLICY business_members_insert ON business_members
  FOR INSERT WITH CHECK (has_business_capability(business_id, 'team.manage'));
CREATE POLICY business_members_update ON business_members
  FOR UPDATE USING (has_business_capability(business_id, 'team.manage'))
  WITH CHECK (has_business_capability(business_id, 'team.manage'));
CREATE POLICY business_members_delete ON business_members
  FOR DELETE USING (has_business_capability(business_id, 'team.manage'));

-- Employees
CREATE POLICY employees_select ON employees
  FOR SELECT USING (has_business_capability(business_id, 'team.manage'));
CREATE POLICY employees_insert ON employees
  FOR INSERT WITH CHECK (has_business_capability(business_id, 'team.manage'));
CREATE POLICY employees_update ON employees
  FOR UPDATE USING (has_business_capability(business_id, 'team.manage'))
  WITH CHECK (has_business_capability(business_id, 'team.manage'));
CREATE POLICY employees_delete ON employees
  FOR DELETE USING (has_business_capability(business_id, 'team.manage'));

-- Employee Invitations
CREATE POLICY invitations_select ON employee_invitations
  FOR SELECT USING (is_business_member(business_id) OR invited_uid = auth.uid());
CREATE POLICY invitations_insert ON employee_invitations
  FOR INSERT WITH CHECK (has_business_capability(business_id, 'team.manage'));
CREATE POLICY invitations_update ON employee_invitations
  FOR UPDATE USING (
    has_business_capability(business_id, 'team.manage')
    OR invited_uid = auth.uid()
  )
  WITH CHECK (
    has_business_capability(business_id, 'team.manage')
    OR invited_uid = auth.uid()
  );
CREATE POLICY invitations_delete ON employee_invitations
  FOR DELETE USING (has_business_capability(business_id, 'team.manage'));

-- Customers
CREATE POLICY customers_select ON customers
  FOR SELECT USING (has_business_capability(business_id, 'customers.read'));
CREATE POLICY customers_insert ON customers
  FOR INSERT WITH CHECK (has_business_capability(business_id, 'customers.write'));
CREATE POLICY customers_update ON customers
  FOR UPDATE USING (has_business_capability(business_id, 'customers.write'))
  WITH CHECK (has_business_capability(business_id, 'customers.write'));

-- Customer Measurements
CREATE POLICY customer_measurements_select ON customer_measurements
  FOR SELECT USING (
    customer_id IN (SELECT id FROM customers WHERE has_business_capability(business_id, 'customers.read'))
  );
CREATE POLICY customer_measurements_insert ON customer_measurements
  FOR INSERT WITH CHECK (
    customer_id IN (SELECT id FROM customers WHERE has_business_capability(business_id, 'customers.write'))
  );

-- Orders
CREATE POLICY orders_select ON orders
  FOR SELECT USING (
    is_business_member(business_id)
    AND (
      has_business_capability(business_id, 'orders.read')
      OR (has_business_capability(business_id, 'orders.assigned_only') AND assigned_tailor_id = auth.uid())
    )
  );
CREATE POLICY orders_insert ON orders
  FOR INSERT WITH CHECK (has_business_capability(business_id, 'orders.write'));
CREATE POLICY orders_update ON orders
  FOR UPDATE USING (is_business_member(business_id) AND (
    has_business_capability(business_id, 'orders.write') OR
    (has_business_capability(business_id, 'production.write') AND assigned_tailor_id = auth.uid())
  ))
  WITH CHECK (is_business_member(business_id) AND (
    has_business_capability(business_id, 'orders.write') OR
    (has_business_capability(business_id, 'production.write') AND assigned_tailor_id = auth.uid())
  ));

-- Order child tables (garments, fabric selections, fitting records, material usage)
CREATE POLICY order_garments_select ON order_garments
  FOR SELECT USING (
    order_id IN (SELECT id FROM orders WHERE is_business_member(business_id))
  );
CREATE POLICY order_garments_insert ON order_garments
  FOR INSERT WITH CHECK (
    order_id IN (SELECT id FROM orders WHERE has_business_capability(business_id, 'orders.write'))
  );
CREATE POLICY order_garments_update ON order_garments
  FOR UPDATE USING (
    order_id IN (SELECT id FROM orders WHERE has_business_capability(business_id, 'orders.write'))
  )
  WITH CHECK (
    order_id IN (SELECT id FROM orders WHERE has_business_capability(business_id, 'orders.write'))
  );
CREATE POLICY order_garments_delete ON order_garments
  FOR DELETE USING (
    order_id IN (SELECT id FROM orders WHERE has_business_capability(business_id, 'orders.write'))
  );

-- Apply similar simplified policy for:
-- order_fabric_selections, order_fitting_records, order_material_usage, order_images
CREATE POLICY order_fabric_selections_select ON order_fabric_selections
  FOR SELECT USING (order_id IN (SELECT id FROM orders WHERE is_business_member(business_id)));
CREATE POLICY order_fabric_selections_insert ON order_fabric_selections
  FOR INSERT WITH CHECK (
    order_id IN (SELECT id FROM orders WHERE has_business_capability(business_id, 'orders.write'))
  );
CREATE POLICY order_fabric_selections_update ON order_fabric_selections
  FOR UPDATE USING (
    order_id IN (SELECT id FROM orders WHERE has_business_capability(business_id, 'orders.write'))
  )
  WITH CHECK (
    order_id IN (SELECT id FROM orders WHERE has_business_capability(business_id, 'orders.write'))
  );
CREATE POLICY order_fabric_selections_delete ON order_fabric_selections
  FOR DELETE USING (
    order_id IN (SELECT id FROM orders WHERE has_business_capability(business_id, 'orders.write'))
  );
CREATE POLICY order_fitting_records_select ON order_fitting_records
  FOR SELECT USING (order_id IN (SELECT id FROM orders WHERE is_business_member(business_id)));
CREATE POLICY order_fitting_records_insert ON order_fitting_records
  FOR INSERT WITH CHECK (
    order_id IN (SELECT id FROM orders WHERE has_business_capability(business_id, 'production.write'))
  );
CREATE POLICY order_material_usage_select ON order_material_usage
  FOR SELECT USING (order_id IN (SELECT id FROM orders WHERE is_business_member(business_id)));
CREATE POLICY order_material_usage_insert ON order_material_usage
  FOR INSERT WITH CHECK (
    order_id IN (
      SELECT id FROM orders
      WHERE has_business_capability(business_id, 'orders.write')
         OR has_business_capability(business_id, 'production.write')
    )
  );
CREATE POLICY order_images_select ON order_images
  FOR SELECT USING (order_id IN (SELECT id FROM orders WHERE is_business_member(business_id)));
CREATE POLICY order_images_insert ON order_images
  FOR INSERT WITH CHECK (
    order_id IN (SELECT id FROM orders WHERE has_business_capability(business_id, 'orders.write'))
  );
CREATE POLICY order_images_delete ON order_images
  FOR DELETE USING (
    order_id IN (SELECT id FROM orders WHERE has_business_capability(business_id, 'orders.write'))
  );

-- Inventory Categories
CREATE POLICY inventory_categories_select ON inventory_categories
  FOR SELECT USING (has_business_capability(business_id, 'inventory.read'));
CREATE POLICY inventory_categories_insert ON inventory_categories
  FOR INSERT WITH CHECK (has_business_capability(business_id, 'inventory.write'));
CREATE POLICY inventory_categories_update ON inventory_categories
  FOR UPDATE USING (has_business_capability(business_id, 'inventory.write'))
  WITH CHECK (has_business_capability(business_id, 'inventory.write'));
CREATE POLICY inventory_categories_delete ON inventory_categories
  FOR DELETE USING (has_business_capability(business_id, 'inventory.write'));

-- Inventory Units
CREATE POLICY inventory_units_select ON inventory_units
  FOR SELECT USING (has_business_capability(business_id, 'inventory.read'));
CREATE POLICY inventory_units_insert ON inventory_units
  FOR INSERT WITH CHECK (has_business_capability(business_id, 'inventory.write'));
CREATE POLICY inventory_units_update ON inventory_units
  FOR UPDATE USING (has_business_capability(business_id, 'inventory.write'))
  WITH CHECK (has_business_capability(business_id, 'inventory.write'));
CREATE POLICY inventory_units_delete ON inventory_units
  FOR DELETE USING (has_business_capability(business_id, 'inventory.write'));

-- Inventory Materials
CREATE POLICY inventory_materials_select ON inventory_materials
  FOR SELECT USING (has_business_capability(business_id, 'inventory.read'));
CREATE POLICY inventory_materials_insert ON inventory_materials
  FOR INSERT WITH CHECK (has_business_capability(business_id, 'inventory.write'));
CREATE POLICY inventory_materials_update ON inventory_materials
  FOR UPDATE USING (has_business_capability(business_id, 'inventory.write'))
  WITH CHECK (has_business_capability(business_id, 'inventory.write'));
CREATE POLICY inventory_materials_delete ON inventory_materials
  FOR DELETE USING (has_business_capability(business_id, 'inventory.write'));

-- Material Images & Custom Fields
CREATE POLICY material_images_select ON inventory_material_images
  FOR SELECT USING (
    material_id IN (SELECT id FROM inventory_materials WHERE is_business_member(business_id))
  );
CREATE POLICY material_images_insert ON inventory_material_images
  FOR INSERT WITH CHECK (
    material_id IN (SELECT id FROM inventory_materials WHERE has_business_capability(business_id, 'inventory.write'))
  );
CREATE POLICY material_images_delete ON inventory_material_images
  FOR DELETE USING (
    material_id IN (SELECT id FROM inventory_materials WHERE has_business_capability(business_id, 'inventory.write'))
  );
CREATE POLICY material_custom_fields_select ON inventory_material_custom_fields
  FOR SELECT USING (
    material_id IN (SELECT id FROM inventory_materials WHERE is_business_member(business_id))
  );
CREATE POLICY material_custom_fields_insert ON inventory_material_custom_fields
  FOR INSERT WITH CHECK (
    material_id IN (SELECT id FROM inventory_materials WHERE has_business_capability(business_id, 'inventory.write'))
  );
CREATE POLICY material_custom_fields_update ON inventory_material_custom_fields
  FOR UPDATE USING (
    material_id IN (SELECT id FROM inventory_materials WHERE has_business_capability(business_id, 'inventory.write'))
  )
  WITH CHECK (
    material_id IN (SELECT id FROM inventory_materials WHERE has_business_capability(business_id, 'inventory.write'))
  );
CREATE POLICY material_custom_fields_delete ON inventory_material_custom_fields
  FOR DELETE USING (
    material_id IN (SELECT id FROM inventory_materials WHERE has_business_capability(business_id, 'inventory.write'))
  );

-- Suppliers
CREATE POLICY suppliers_select ON suppliers
  FOR SELECT USING (has_business_capability(business_id, 'inventory.read'));
CREATE POLICY suppliers_insert ON suppliers
  FOR INSERT WITH CHECK (has_business_capability(business_id, 'inventory.write'));
CREATE POLICY suppliers_update ON suppliers
  FOR UPDATE USING (has_business_capability(business_id, 'inventory.write'))
  WITH CHECK (has_business_capability(business_id, 'inventory.write'));
CREATE POLICY suppliers_delete ON suppliers
  FOR DELETE USING (has_business_capability(business_id, 'inventory.write'));

-- Purchase Orders
CREATE POLICY purchase_orders_select ON purchase_orders
  FOR SELECT USING (has_business_capability(business_id, 'inventory.read'));
CREATE POLICY purchase_orders_insert ON purchase_orders
  FOR INSERT WITH CHECK (has_business_capability(business_id, 'inventory.write'));
CREATE POLICY purchase_orders_update ON purchase_orders
  FOR UPDATE USING (has_business_capability(business_id, 'inventory.write'))
  WITH CHECK (has_business_capability(business_id, 'inventory.write'));
CREATE POLICY purchase_orders_delete ON purchase_orders
  FOR DELETE USING (has_business_capability(business_id, 'inventory.write'));

-- Stock Movements
CREATE POLICY stock_movements_select ON stock_movements
  FOR SELECT USING (has_business_capability(business_id, 'inventory.read'));
CREATE POLICY stock_movements_insert ON stock_movements
  FOR INSERT WITH CHECK (has_business_capability(business_id, 'inventory.write'));

-- Payments
CREATE POLICY payments_select ON payments
  FOR SELECT USING (has_business_capability(business_id, 'payments.read'));
CREATE POLICY payments_insert ON payments
  FOR INSERT WITH CHECK (has_business_capability(business_id, 'payments.write'));

-- Expenses
CREATE POLICY expenses_select ON expenses
  FOR SELECT USING (has_business_capability(business_id, 'finance.read'));
CREATE POLICY expenses_insert ON expenses
  FOR INSERT WITH CHECK (has_business_capability(business_id, 'finance.write'));
CREATE POLICY expenses_update ON expenses
  FOR UPDATE USING (has_business_capability(business_id, 'finance.write'))
  WITH CHECK (has_business_capability(business_id, 'finance.write'));
CREATE POLICY expenses_delete ON expenses
  FOR DELETE USING (has_business_capability(business_id, 'finance.write'));

-- Withdrawals
CREATE POLICY withdrawals_select ON withdrawals
  FOR SELECT USING (has_business_capability(business_id, 'finance.read'));
CREATE POLICY withdrawals_insert ON withdrawals
  FOR INSERT WITH CHECK (has_business_capability(business_id, 'finance.write'));
CREATE POLICY withdrawals_update ON withdrawals
  FOR UPDATE USING (has_business_capability(business_id, 'finance.write'))
  WITH CHECK (has_business_capability(business_id, 'finance.write'));
CREATE POLICY withdrawals_delete ON withdrawals
  FOR DELETE USING (has_business_capability(business_id, 'finance.write'));

-- Transactions
CREATE POLICY transactions_select ON transactions
  FOR SELECT USING (has_business_capability(business_id, 'finance.read'));
CREATE POLICY transactions_insert ON transactions
  FOR INSERT WITH CHECK (has_business_capability(business_id, 'finance.write'));

-- Consumption Reports
CREATE POLICY consumption_reports_select ON consumption_reports
  FOR SELECT USING (is_business_member(business_id));
CREATE POLICY consumption_reports_insert ON consumption_reports
  FOR INSERT WITH CHECK (is_business_member(business_id));

-- Conversations
CREATE POLICY conversations_select ON conversations
  FOR SELECT USING (is_business_member(business_id) AND auth.uid() = ANY(participants));
CREATE POLICY conversations_insert ON conversations
  FOR INSERT WITH CHECK (is_business_member(business_id) AND auth.uid() = ANY(participants));
CREATE POLICY conversations_update ON conversations
  FOR UPDATE USING (is_business_member(business_id) AND auth.uid() = ANY(participants))
  WITH CHECK (is_business_member(business_id) AND auth.uid() = ANY(participants));

-- Messages
CREATE POLICY messages_select ON messages
  FOR SELECT USING (
    conversation_id IN (
      SELECT id FROM conversations
      WHERE is_business_member(business_id) AND auth.uid() = ANY(participants)
    )
  );
CREATE POLICY messages_insert ON messages
  FOR INSERT WITH CHECK (
    conversation_id IN (
      SELECT id FROM conversations
      WHERE is_business_member(business_id) AND auth.uid() = ANY(participants)
    )
    AND is_business_member(business_id)
    AND sender_uid = auth.uid()
  );
CREATE POLICY messages_update ON messages
  FOR UPDATE USING (is_business_member(business_id) AND sender_uid = auth.uid())
  WITH CHECK (is_business_member(business_id) AND sender_uid = auth.uid());
CREATE POLICY messages_delete ON messages
  FOR DELETE USING (is_business_member(business_id) AND (sender_uid = auth.uid() OR has_business_capability(business_id, 'team.manage')));

-- Notifications
CREATE POLICY notifications_select ON notifications
  FOR SELECT USING (is_business_member(business_id) AND recipient_uid = auth.uid());
CREATE POLICY notifications_update ON notifications
  FOR UPDATE USING (is_business_member(business_id) AND recipient_uid = auth.uid())
  WITH CHECK (is_business_member(business_id) AND recipient_uid = auth.uid());
CREATE POLICY notifications_delete ON notifications
  FOR DELETE USING (is_business_member(business_id) AND recipient_uid = auth.uid());
CREATE POLICY notifications_insert ON notifications
  FOR INSERT WITH CHECK (is_business_member(business_id));

-- Images
CREATE POLICY images_select ON images
  FOR SELECT USING (is_business_member(business_id));
CREATE POLICY images_insert ON images
  FOR INSERT WITH CHECK (is_business_member(business_id));
CREATE POLICY images_delete ON images
  FOR DELETE USING (is_business_member(business_id));

-- SMS Logs
CREATE POLICY sms_logs_select ON sms_logs
  FOR SELECT USING (is_business_member(business_id));

-- Audit Logs
CREATE POLICY audit_logs_select ON audit_logs
  FOR SELECT USING (is_business_member(business_id));
CREATE POLICY audit_logs_insert ON audit_logs
  FOR INSERT WITH CHECK (is_business_member(business_id));

-- App Settings
CREATE POLICY app_settings_select ON app_settings
  FOR SELECT USING (has_business_capability(business_id, 'workshop.manage'));
CREATE POLICY app_settings_insert ON app_settings
  FOR INSERT WITH CHECK (has_business_capability(business_id, 'workshop.manage'));
CREATE POLICY app_settings_update ON app_settings
  FOR UPDATE USING (has_business_capability(business_id, 'workshop.manage'))
  WITH CHECK (has_business_capability(business_id, 'workshop.manage'));

-- Weekly Reports
CREATE POLICY weekly_reports_select ON weekly_reports
  FOR SELECT USING (has_business_capability(business_id, 'finance.read'));
CREATE POLICY weekly_reports_insert ON weekly_reports
  FOR INSERT WITH CHECK (has_business_capability(business_id, 'finance.write'));

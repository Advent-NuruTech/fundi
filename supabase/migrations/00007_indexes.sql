-- ============================================================================
-- FUNDIFLOW - Supabase Migration: 00007_indexes
-- All database indexes
-- ============================================================================

-- Profiles
CREATE INDEX idx_profiles_business_id ON profiles(business_id);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_active ON profiles(active);

-- Businesses
CREATE INDEX idx_businesses_owner ON businesses(owner_uid);
CREATE INDEX idx_businesses_active ON businesses(is_active);

-- Business Members
CREATE INDEX idx_business_members_profile ON business_members(profile_id);
CREATE INDEX idx_business_members_active ON business_members(business_id, active);

-- Employees
CREATE INDEX idx_employees_business ON employees(business_id);
CREATE INDEX idx_employees_role ON employees(business_id, role);
CREATE INDEX idx_employees_active ON employees(business_id, is_active);

-- Employee Invitations
CREATE INDEX idx_invitations_business ON employee_invitations(business_id);
CREATE INDEX idx_invitations_token ON employee_invitations(token);
CREATE INDEX idx_invitations_status ON employee_invitations(status);

-- Customers
CREATE INDEX idx_customers_business ON customers(business_id);
CREATE INDEX idx_customers_email ON customers(business_id, email) WHERE email IS NOT NULL;
CREATE INDEX idx_customers_balance ON customers(business_id, outstanding_balance);

-- Customer Measurements
CREATE INDEX idx_customer_measurements_customer ON customer_measurements(customer_id);

-- Orders
CREATE INDEX idx_orders_business ON orders(business_id);
CREATE INDEX idx_orders_customer ON orders(business_id, customer_id);
CREATE INDEX idx_orders_stage ON orders(business_id, stage);
CREATE INDEX idx_orders_tailor ON orders(business_id, assigned_tailor_id);
CREATE INDEX idx_orders_due_date ON orders(business_id, due_date);
CREATE INDEX idx_orders_delivery_status ON orders(business_id, delivery_status);
CREATE INDEX idx_orders_payment_status ON orders(business_id, payment_status);
CREATE INDEX idx_orders_created_at ON orders(business_id, created_at DESC);
CREATE INDEX idx_orders_open_due_date ON orders(business_id, due_date)
  WHERE stage != 'delivered';

-- Order Garments
CREATE INDEX idx_order_garments_order ON order_garments(order_id);

-- Order Fabric Selections
CREATE INDEX idx_order_fabric_selections_order ON order_fabric_selections(order_id);

-- Order Fitting Records
CREATE INDEX idx_order_fitting_records_order ON order_fitting_records(order_id);

-- Order Material Usage
CREATE INDEX idx_order_material_usage_order ON order_material_usage(order_id);
CREATE INDEX idx_order_material_usage_material ON order_material_usage(material_id);

-- Inventory Categories
CREATE INDEX idx_inventory_categories_business ON inventory_categories(business_id);

-- Inventory Units
CREATE INDEX idx_inventory_units_business ON inventory_units(business_id);

-- Inventory Materials
CREATE INDEX idx_inventory_materials_business ON inventory_materials(business_id);
CREATE INDEX idx_inventory_materials_category ON inventory_materials(category_id);
CREATE INDEX idx_inventory_materials_supplier ON inventory_materials(supplier_id);
CREATE INDEX idx_inventory_materials_low_stock ON inventory_materials(business_id)
  WHERE quantity <= reorder_level;

-- Inventory Material Images
CREATE INDEX idx_material_images_material ON inventory_material_images(material_id);

-- Inventory Material Custom Fields
CREATE INDEX idx_material_custom_fields_material ON inventory_material_custom_fields(material_id);

-- Suppliers
CREATE INDEX idx_suppliers_business ON suppliers(business_id);

-- Purchase Orders
CREATE INDEX idx_purchase_orders_business ON purchase_orders(business_id);
CREATE INDEX idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX idx_purchase_orders_status ON purchase_orders(business_id, status);
CREATE INDEX idx_purchase_orders_material ON purchase_orders(material_id);

-- Stock Movements
CREATE INDEX idx_stock_movements_business ON stock_movements(business_id);
CREATE INDEX idx_stock_movements_material ON stock_movements(material_id);
CREATE INDEX idx_stock_movements_order ON stock_movements(order_id);
CREATE INDEX idx_stock_movements_type ON stock_movements(business_id, movement_type);
CREATE INDEX idx_stock_movements_date ON stock_movements(business_id, created_at DESC);

-- Payments
CREATE INDEX idx_payments_business ON payments(business_id);
CREATE INDEX idx_payments_order ON payments(order_id);
CREATE INDEX idx_payments_customer ON payments(customer_id);
CREATE INDEX idx_payments_date ON payments(business_id, recorded_at DESC);
CREATE INDEX idx_payments_method ON payments(business_id, method);

-- Expenses
CREATE INDEX idx_expenses_business ON expenses(business_id);
CREATE INDEX idx_expenses_category ON expenses(business_id, category);
CREATE INDEX idx_expenses_date ON expenses(business_id, expense_date DESC);
CREATE INDEX idx_expenses_supplier ON expenses(supplier_id);

-- Withdrawals
CREATE INDEX idx_withdrawals_business ON withdrawals(business_id);
CREATE INDEX idx_withdrawals_category ON withdrawals(business_id, category);
CREATE INDEX idx_withdrawals_date ON withdrawals(business_id, withdrawal_date DESC);

-- Transactions
CREATE INDEX idx_transactions_business ON transactions(business_id);
CREATE INDEX idx_transactions_type ON transactions(business_id, type);
CREATE INDEX idx_transactions_date ON transactions(business_id, created_at DESC);
CREATE INDEX idx_transactions_reference ON transactions(reference_id);
CREATE INDEX idx_transactions_status ON transactions(business_id, status);

-- Consumption Reports
CREATE INDEX idx_consumption_reports_business ON consumption_reports(business_id);
CREATE INDEX idx_consumption_reports_order ON consumption_reports(order_id);

-- Conversations
CREATE INDEX idx_conversations_business ON conversations(business_id);
CREATE INDEX idx_conversations_participants ON conversations USING GIN(participants);
CREATE INDEX idx_conversations_updated ON conversations(business_id, updated_at DESC);

-- Messages
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_sender ON messages(sender_uid);
CREATE INDEX idx_messages_created ON messages(conversation_id, created_at ASC);

-- Notifications
CREATE INDEX idx_notifications_recipient ON notifications(business_id, recipient_uid);
CREATE INDEX idx_notifications_unread ON notifications(business_id, recipient_uid)
  WHERE NOT read AND NOT archived;
CREATE INDEX idx_notifications_created ON notifications(business_id, created_at DESC);
CREATE INDEX idx_notifications_type ON notifications(business_id, recipient_uid, type);

-- Images
CREATE INDEX idx_images_business ON images(business_id);
CREATE INDEX idx_images_order ON images(order_id);
CREATE INDEX idx_images_customer ON images(customer_id);

-- SMS Logs
CREATE INDEX idx_sms_logs_business ON sms_logs(business_id);
CREATE INDEX idx_sms_logs_order ON sms_logs(order_id);
CREATE INDEX idx_sms_logs_type ON sms_logs(business_id, type);

-- Audit Logs
CREATE INDEX idx_audit_logs_business ON audit_logs(business_id);
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_uid);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(business_id, created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(business_id, action);

-- App Settings
CREATE INDEX idx_app_settings_business ON app_settings(business_id);

-- Weekly Reports
CREATE INDEX idx_weekly_reports_business ON weekly_reports(business_id);
CREATE INDEX idx_weekly_reports_date ON weekly_reports(business_id, week_start DESC);

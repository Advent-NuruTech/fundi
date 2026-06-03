-- ============================================================================
-- FUNDIFLOW - Supabase Migration: 00005_functions
-- All stored procedures and functions
-- ============================================================================

-- ############################################################################
-- 12. TRIGGER FUNCTIONS (AUTOMATIC UPDATED_AT)
-- ############################################################################

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ############################################################################
-- 13. HELPER FUNCTIONS
-- ############################################################################

-- -------------------------------------------------------------------
-- 13.1 get_business_id() - Returns the business_id for the current user
-- -------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_business_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT business_id FROM profiles WHERE id = auth.uid()
$$;

-- -------------------------------------------------------------------
-- 13.2 get_business_ids() - Returns all active businesses for the current user
-- -------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_business_ids()
RETURNS UUID[]
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT COALESCE(array_agg(DISTINCT business_id), ARRAY[]::UUID[])
  FROM (
    SELECT p.business_id
    FROM profiles p
    WHERE p.id = auth.uid()
      AND p.active = true
      AND p.business_id IS NOT NULL

    UNION

    SELECT bm.business_id
    FROM business_members bm
    WHERE bm.profile_id = auth.uid()
      AND bm.active = true
  ) memberships
$$;

-- -------------------------------------------------------------------
-- 13.3 is_business_member() - Check if user belongs to a business
-- -------------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_business_member(biz_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT biz_id = ANY(get_business_ids())
$$;

-- -------------------------------------------------------------------
-- 13.4 has_role() - Check if current user has a specific role
-- -------------------------------------------------------------------
CREATE OR REPLACE FUNCTION has_role(required_role user_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND active = true AND required_role = ANY(roles)
  )
$$;

-- -------------------------------------------------------------------
-- 13.5 has_capability() - Permission check based on role hierarchy
-- -------------------------------------------------------------------
CREATE OR REPLACE FUNCTION has_capability(capability TEXT)
RETURNS BOOLEAN
LANGUAGE PLPGSQL
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  user_roles user_role[];
BEGIN
  SELECT roles INTO user_roles FROM profiles WHERE id = auth.uid() AND active = true;
  IF user_roles IS NULL THEN RETURN false; END IF;

  -- Owner has all capabilities
  IF 'owner' = ANY(user_roles) THEN RETURN true; END IF;

  -- Check specific capabilities
  CASE capability
    WHEN 'workshop.manage' THEN RETURN 'owner' = ANY(user_roles);
    WHEN 'team.manage' THEN RETURN 'owner' = ANY(user_roles) OR 'admin_manager' = ANY(user_roles);
    WHEN 'roles.manage' THEN RETURN 'owner' = ANY(user_roles);
    WHEN 'customers.read' THEN RETURN 'owner' = ANY(user_roles) OR 'admin_manager' = ANY(user_roles) OR 'receptionist' = ANY(user_roles) OR 'cashier' = ANY(user_roles);
    WHEN 'customers.write' THEN RETURN 'owner' = ANY(user_roles) OR 'admin_manager' = ANY(user_roles) OR 'receptionist' = ANY(user_roles);
    WHEN 'orders.read' THEN RETURN true;
    WHEN 'orders.assigned_only' THEN RETURN 'tailor' = ANY(user_roles);
    WHEN 'orders.write' THEN RETURN 'owner' = ANY(user_roles) OR 'admin_manager' = ANY(user_roles) OR 'receptionist' = ANY(user_roles);
    WHEN 'production.read' THEN RETURN 'owner' = ANY(user_roles) OR 'admin_manager' = ANY(user_roles) OR 'tailor' = ANY(user_roles) OR 'inventory_manager' = ANY(user_roles);
    WHEN 'production.write' THEN RETURN 'owner' = ANY(user_roles) OR 'admin_manager' = ANY(user_roles) OR 'tailor' = ANY(user_roles);
    WHEN 'inventory.read' THEN RETURN 'owner' = ANY(user_roles) OR 'admin_manager' = ANY(user_roles) OR 'inventory_manager' = ANY(user_roles);
    WHEN 'inventory.write' THEN RETURN 'owner' = ANY(user_roles) OR 'admin_manager' = ANY(user_roles) OR 'inventory_manager' = ANY(user_roles);
    WHEN 'payments.read' THEN RETURN 'owner' = ANY(user_roles) OR 'admin_manager' = ANY(user_roles) OR 'receptionist' = ANY(user_roles) OR 'cashier' = ANY(user_roles);
    WHEN 'payments.write' THEN RETURN 'owner' = ANY(user_roles) OR 'admin_manager' = ANY(user_roles) OR 'receptionist' = ANY(user_roles) OR 'cashier' = ANY(user_roles);
    WHEN 'analytics.read' THEN RETURN 'owner' = ANY(user_roles) OR 'admin_manager' = ANY(user_roles);
    WHEN 'finance.read' THEN RETURN 'owner' = ANY(user_roles) OR 'admin_manager' = ANY(user_roles);
    WHEN 'finance.write' THEN RETURN 'owner' = ANY(user_roles) OR 'admin_manager' = ANY(user_roles);
    ELSE RETURN false;
  END CASE;
END;
$$;

-- -------------------------------------------------------------------
-- 13.6 has_business_capability() - Permission check scoped to a business
-- -------------------------------------------------------------------
CREATE OR REPLACE FUNCTION has_business_capability(biz_id UUID, capability TEXT)
RETURNS BOOLEAN
LANGUAGE PLPGSQL
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  user_roles user_role[];
BEGIN
  SELECT bm.roles INTO user_roles
  FROM business_members bm
  WHERE bm.business_id = biz_id
    AND bm.profile_id = auth.uid()
    AND bm.active = true
  LIMIT 1;

  IF user_roles IS NULL THEN
    SELECT p.roles INTO user_roles
    FROM profiles p
    WHERE p.id = auth.uid()
      AND p.business_id = biz_id
      AND p.active = true;
  END IF;

  IF user_roles IS NULL THEN RETURN false; END IF;
  IF 'owner' = ANY(user_roles) THEN RETURN true; END IF;

  CASE capability
    WHEN 'workshop.manage' THEN RETURN 'owner' = ANY(user_roles);
    WHEN 'team.manage' THEN RETURN 'owner' = ANY(user_roles) OR 'admin_manager' = ANY(user_roles);
    WHEN 'roles.manage' THEN RETURN 'owner' = ANY(user_roles);
    WHEN 'customers.read' THEN RETURN 'owner' = ANY(user_roles) OR 'admin_manager' = ANY(user_roles) OR 'receptionist' = ANY(user_roles) OR 'cashier' = ANY(user_roles);
    WHEN 'customers.write' THEN RETURN 'owner' = ANY(user_roles) OR 'admin_manager' = ANY(user_roles) OR 'receptionist' = ANY(user_roles);
    WHEN 'orders.read' THEN RETURN true;
    WHEN 'orders.assigned_only' THEN RETURN 'tailor' = ANY(user_roles);
    WHEN 'orders.write' THEN RETURN 'owner' = ANY(user_roles) OR 'admin_manager' = ANY(user_roles) OR 'receptionist' = ANY(user_roles);
    WHEN 'production.read' THEN RETURN 'owner' = ANY(user_roles) OR 'admin_manager' = ANY(user_roles) OR 'tailor' = ANY(user_roles) OR 'inventory_manager' = ANY(user_roles);
    WHEN 'production.write' THEN RETURN 'owner' = ANY(user_roles) OR 'admin_manager' = ANY(user_roles) OR 'tailor' = ANY(user_roles);
    WHEN 'inventory.read' THEN RETURN 'owner' = ANY(user_roles) OR 'admin_manager' = ANY(user_roles) OR 'inventory_manager' = ANY(user_roles);
    WHEN 'inventory.write' THEN RETURN 'owner' = ANY(user_roles) OR 'admin_manager' = ANY(user_roles) OR 'inventory_manager' = ANY(user_roles);
    WHEN 'payments.read' THEN RETURN 'owner' = ANY(user_roles) OR 'admin_manager' = ANY(user_roles) OR 'receptionist' = ANY(user_roles) OR 'cashier' = ANY(user_roles);
    WHEN 'payments.write' THEN RETURN 'owner' = ANY(user_roles) OR 'admin_manager' = ANY(user_roles) OR 'receptionist' = ANY(user_roles) OR 'cashier' = ANY(user_roles);
    WHEN 'analytics.read' THEN RETURN 'owner' = ANY(user_roles) OR 'admin_manager' = ANY(user_roles);
    WHEN 'finance.read' THEN RETURN 'owner' = ANY(user_roles) OR 'admin_manager' = ANY(user_roles);
    WHEN 'finance.write' THEN RETURN 'owner' = ANY(user_roles) OR 'admin_manager' = ANY(user_roles);
    ELSE RETURN false;
  END CASE;
END;
$$;

-- -------------------------------------------------------------------
-- 13.7 get_next_counter() - Atomic counter increment for order/employee numbers
-- -------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_next_counter(
  biz_id UUID,
  counter_field TEXT,
  prefix TEXT,
  pad_length INTEGER DEFAULT 3
)
RETURNS TEXT
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  current_val INTEGER;
  result TEXT;
BEGIN
  IF counter_field NOT IN ('orderCounter', 'employeeCounter') THEN
    RAISE EXCEPTION 'Invalid counter field: %', counter_field
      USING ERRCODE = '22023';
  END IF;

  IF NOT is_business_member(biz_id) THEN
    RAISE EXCEPTION 'Not authorized for business %', biz_id
      USING ERRCODE = '42501';
  END IF;

  UPDATE businesses
  SET
    order_counter = CASE WHEN counter_field = 'orderCounter' THEN order_counter + 1 ELSE order_counter END,
    employee_counter = CASE WHEN counter_field = 'employeeCounter' THEN employee_counter + 1 ELSE employee_counter END
  WHERE id = biz_id
  RETURNING
    CASE WHEN counter_field = 'orderCounter' THEN order_counter ELSE employee_counter END
  INTO current_val;

  result := prefix || LPAD(COALESCE(current_val, 0)::TEXT, pad_length, '0');
  RETURN result;
END;
$$;

-- -------------------------------------------------------------------
-- 13.8 get_next_order_number()
-- -------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_next_order_number(biz_id UUID)
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT get_next_counter(biz_id, 'orderCounter', 'ON', 3);
$$;

-- -------------------------------------------------------------------
-- 13.9 get_next_employee_number()
-- -------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_next_employee_number(biz_id UUID)
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT get_next_counter(biz_id, 'employeeCounter', 'ES', 3);
$$;

-- -------------------------------------------------------------------
-- 13.10 calculate_outstanding_balance() - Update customer balance from orders
-- -------------------------------------------------------------------
CREATE OR REPLACE FUNCTION calculate_outstanding_balance(cust_id UUID)
RETURNS NUMERIC(12,2)
LANGUAGE SQL
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(SUM(balance_amount), 0) FROM orders
  WHERE customer_id = cust_id AND stage != 'delivered';
$$;

-- -------------------------------------------------------------------
-- 13.11 update_customer_balance_trigger()
-- -------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_customer_balance()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE customers
    SET outstanding_balance = calculate_outstanding_balance(NEW.customer_id)
    WHERE id = NEW.customer_id;
  END IF;
  IF TG_OP = 'DELETE' THEN
    UPDATE customers
    SET outstanding_balance = calculate_outstanding_balance(OLD.customer_id)
    WHERE id = OLD.customer_id;
  END IF;
  RETURN NULL;
END;
$$;

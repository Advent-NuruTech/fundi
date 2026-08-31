-- Business data access is determined only by an active business_members row.
-- This makes "No longer a member" immediately remove tenant access without
-- disabling the user's account in other businesses.

-- Preserve access for legacy profiles that predate business_members.
INSERT INTO business_members (profile_id, business_id, role, roles, active)
SELECT p.id, p.business_id, p.role, p.roles, p.active
FROM profiles p
WHERE p.business_id IS NOT NULL
ON CONFLICT (business_id, profile_id) DO NOTHING;

CREATE OR REPLACE FUNCTION get_business_ids()
RETURNS UUID[]
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT COALESCE(array_agg(DISTINCT business_id), ARRAY[]::UUID[])
  FROM business_members
  WHERE profile_id = auth.uid()
    AND active = true
$$;

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
  SELECT roles INTO user_roles
  FROM business_members
  WHERE business_id = biz_id
    AND profile_id = auth.uid()
    AND active = true
  LIMIT 1;

  IF user_roles IS NULL THEN RETURN false; END IF;
  IF 'owner' = ANY(user_roles) THEN RETURN true; END IF;

  CASE capability
    WHEN 'workshop.manage' THEN RETURN 'owner' = ANY(user_roles);
    WHEN 'team.manage' THEN RETURN 'admin_manager' = ANY(user_roles);
    WHEN 'roles.manage' THEN RETURN false;
    WHEN 'customers.read' THEN RETURN 'admin_manager' = ANY(user_roles) OR 'receptionist' = ANY(user_roles) OR 'cashier' = ANY(user_roles);
    WHEN 'customers.write' THEN RETURN 'admin_manager' = ANY(user_roles) OR 'receptionist' = ANY(user_roles);
    WHEN 'orders.read' THEN RETURN true;
    WHEN 'orders.assigned_only' THEN RETURN 'tailor' = ANY(user_roles);
    WHEN 'orders.write' THEN RETURN 'admin_manager' = ANY(user_roles) OR 'receptionist' = ANY(user_roles);
    WHEN 'production.read' THEN RETURN 'admin_manager' = ANY(user_roles) OR 'tailor' = ANY(user_roles) OR 'inventory_manager' = ANY(user_roles);
    WHEN 'production.write' THEN RETURN 'admin_manager' = ANY(user_roles) OR 'tailor' = ANY(user_roles);
    WHEN 'inventory.read' THEN RETURN 'admin_manager' = ANY(user_roles) OR 'inventory_manager' = ANY(user_roles);
    WHEN 'inventory.write' THEN RETURN 'admin_manager' = ANY(user_roles) OR 'inventory_manager' = ANY(user_roles);
    WHEN 'payments.read' THEN RETURN 'admin_manager' = ANY(user_roles) OR 'receptionist' = ANY(user_roles) OR 'cashier' = ANY(user_roles);
    WHEN 'payments.write' THEN RETURN 'admin_manager' = ANY(user_roles) OR 'receptionist' = ANY(user_roles);
    WHEN 'analytics.read' THEN RETURN 'admin_manager' = ANY(user_roles);
    WHEN 'finance.read' THEN RETURN 'admin_manager' = ANY(user_roles);
    WHEN 'finance.write' THEN RETURN 'admin_manager' = ANY(user_roles);
    ELSE RETURN false;
  END CASE;
END;
$$;

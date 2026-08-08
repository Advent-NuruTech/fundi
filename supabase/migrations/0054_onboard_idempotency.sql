-- =============================================================================
-- FUNDIFLOW - Migration 0054: Atomic, idempotent onboarding (fixes duplicate
-- businesses created when concurrent onboard requests race each other).
--
-- Root cause
-- ----------
-- The old /api/auth/onboard route ran a "check then insert" sequence as
-- separate queries. During sign-up several things can fire at once:
--   * registerOwner() calls the onboard API right after signUp
--   * the SIGNED_IN / INITIAL_SESSION auth events trigger ensureProfileExists()
--     which calls the onboard API again
--   * the Google callback page calls the onboard API AND the auth listener
--     fires SIGNED_IN
-- Two (or more) concurrent requests can both pass the "no profile yet" /
-- "no business yet" checks and both INSERT a businesses row for the same
-- owner_uid → 2-3+ identical businesses per account. There is no unique
-- constraint on owner_uid because multi-business is intentional, so the DB
-- happily accepted both rows.
--
-- Fix
-- ----
-- 1. onboard_user() runs the WHOLE onboarding flow inside a single DB
--    transaction guarded by a per-owner advisory lock (pg_advisory_xact_lock),
--    so concurrent requests for the same user serialize: only the first one
--    creates the business, everyone else reuses it. This is the authoritative
--    fix — it works regardless of how many calls arrive.
-- 2. A conservative data-fix pass deletes duplicate businesses that are
--    completely empty and near-identical to the owner's primary business
--    (created seconds apart). Duplicates that contain real data — or look like
--    deliberately added second businesses — are left untouched (no data loss).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Atomic onboarding function
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.onboard_user(
  p_uid            uuid,
  p_email          text,
  p_display_name   text,
  p_phone          text,
  p_business_name  text,
  p_location       text,
  p_business_type  text,
  p_units          text[],
  p_categories     text[]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_id     uuid;
  v_display_name    text;
  v_business_name   text;
  v_phone           text;
  v_location        text;
  v_business_type   text;
BEGIN
  -- Serialize onboarding per owner. Any concurrent request for the same user
  -- blocks here until the first transaction commits, then re-reads the state
  -- and simply reuses the business that was already created.
  PERFORM pg_advisory_xact_lock(hashtextextended(coalesce(p_uid::text, 'x'), 0));

  v_display_name := nullif(trim(coalesce(p_display_name, '')), '');
  IF v_display_name IS NULL THEN
    v_display_name := coalesce(nullif(split_part(coalesce(p_email, ''), '@', 1), ''), 'Owner');
  END IF;

  v_business_name := nullif(trim(coalesce(p_business_name, '')), '');
  IF v_business_name IS NULL THEN
    v_business_name := v_display_name || '''s Workshop';
  END IF;

  v_phone         := coalesce(p_phone, '');
  v_location      := coalesce(p_location, '');
  v_business_type := coalesce(p_business_type, 'tailoring');

  -- 1. Upsert the owner profile (idempotent).
  INSERT INTO profiles (id, email, display_name, role, roles, active, must_change_password, phone)
  VALUES (p_uid, coalesce(p_email, ''), v_display_name, 'owner', ARRAY['owner']::user_role[], true, false, nullif(v_phone, ''))
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        display_name = EXCLUDED.display_name,
        phone = coalesce(EXCLUDED.phone, profiles.phone);

  -- 2. Already linked to a business? Repair the member row and reuse it.
  SELECT business_id INTO v_business_id FROM profiles WHERE id = p_uid;
  IF v_business_id IS NOT NULL THEN
    INSERT INTO business_members (profile_id, business_id, role, roles, active)
    VALUES (p_uid, v_business_id, 'owner', ARRAY['owner']::user_role[], true)
    ON CONFLICT (profile_id, business_id) DO NOTHING;
    RETURN v_business_id;
  END IF;

  -- 3. Reuse an existing business this user already owns (covers a previous
  --    run that crashed part-way), otherwise create exactly one.
  SELECT id INTO v_business_id
  FROM businesses
  WHERE owner_uid = p_uid
  ORDER BY created_at ASC, id ASC
  LIMIT 1;

  IF v_business_id IS NULL THEN
    INSERT INTO businesses (name, phone, location, currency, country, business_type, owner_uid, order_counter, employee_counter)
    VALUES (v_business_name, v_phone, v_location, 'KES', 'Kenya', v_business_type, p_uid, 0, 0)
    RETURNING id INTO v_business_id;
  END IF;

  -- 4. Link the profile to the (primary) business.
  UPDATE profiles SET business_id = v_business_id WHERE id = p_uid;

  -- 5. Owner membership (idempotent).
  INSERT INTO business_members (profile_id, business_id, role, roles, active)
  VALUES (p_uid, v_business_id, 'owner', ARRAY['owner']::user_role[], true)
  ON CONFLICT (profile_id, business_id) DO NOTHING;

  -- 6. Industry inventory taxonomy (idempotent).
  IF p_units IS NOT NULL AND cardinality(p_units) > 0 THEN
    INSERT INTO inventory_units (business_id, name)
    SELECT v_business_id, u FROM unnest(p_units) u
    ON CONFLICT (business_id, name) DO NOTHING;
  END IF;

  IF p_categories IS NOT NULL AND cardinality(p_categories) > 0 THEN
    INSERT INTO inventory_categories (business_id, name)
    SELECT v_business_id, c FROM unnest(p_categories) c
    ON CONFLICT (business_id, name) DO NOTHING;
  END IF;

  RETURN v_business_id;
END;
$$;

-- RLS is bypassed by SECURITY DEFINER; the API calls this via the service role.
REVOKE ALL ON FUNCTION public.onboard_user(uuid, text, text, text, text, text, text, text[], text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.onboard_user(uuid, text, text, text, text, text, text, text[], text[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.onboard_user(uuid, text, text, text, text, text, text, text[], text[]) TO authenticated;

COMMENT ON FUNCTION public.onboard_user IS
  'Atomic, idempotent first-business onboarding. Serializes concurrent calls per '
  'owner with an advisory lock so duplicate businesses can never be created.';

-- ---------------------------------------------------------------------------
-- 2. Conservative cleanup of duplicate businesses created before this fix
-- ---------------------------------------------------------------------------
-- Only removes duplicates that are:
--   * completely empty (no orders/customers/payments/etc.), AND
--   * named identically to the owner's primary business OR created within 10
--     minutes of it (both signal the sign-up race, not an intentional second
--     business).
-- Anything with real data is kept untouched.

CREATE OR REPLACE FUNCTION public.business_has_data(p_biz uuid)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_count bigint;
  v_row   record;
BEGIN
  FOR v_row IN
    SELECT 'orders' AS tbl, 'business_id' AS col
    UNION ALL SELECT 'customers',             'business_id'
    UNION ALL SELECT 'payments',              'business_id'
    UNION ALL SELECT 'expenses',              'business_id'
    UNION ALL SELECT 'withdrawals',           'business_id'
    UNION ALL SELECT 'transactions',          'business_id'
    UNION ALL SELECT 'consumption_reports',   'business_id'
    UNION ALL SELECT 'stock_movements',       'business_id'
    UNION ALL SELECT 'inventory_materials',   'business_id'
    UNION ALL SELECT 'purchase_orders',       'business_id'
    UNION ALL SELECT 'suppliers',             'business_id'
    UNION ALL SELECT 'messages',              'business_id'
    UNION ALL SELECT 'conversations',         'business_id'
    UNION ALL SELECT 'sms_logs',              'business_id'
    UNION ALL SELECT 'notifications',         'business_id'
    UNION ALL SELECT 'app_settings',          'business_id'
    UNION ALL SELECT 'weekly_reports',        'business_id'
    UNION ALL SELECT 'images',                'business_id'
    UNION ALL SELECT 'employees',             'business_id'
    UNION ALL SELECT 'employee_invitations',  'business_id'
    UNION ALL SELECT 'branches',              'business_id'
    UNION ALL SELECT 'audit_logs',            'business_id'
    UNION ALL SELECT 'receipts',              'workspace_id'
    UNION ALL SELECT 'subscriptions',         'workspace_id'
    UNION ALL SELECT 'billing_payments',      'workspace_id'
    UNION ALL SELECT 'payment_attempts',      'workspace_id'
    UNION ALL SELECT 'ecommerce_stores',      'business_id'
    UNION ALL SELECT 'usage_meters',          'workspace_id'
    UNION ALL SELECT 'ai_messages',           'business_id'
    UNION ALL SELECT 'support_tickets',       'business_id'
  LOOP
    BEGIN
      EXECUTE format('SELECT 1 FROM %I WHERE %I = $1 LIMIT 1', v_row.tbl, v_row.col)
        USING p_biz INTO v_count;
      IF v_count IS NOT NULL THEN
        RETURN true;
      END IF;
    EXCEPTION
      WHEN undefined_table OR undefined_column THEN
        NULL; -- table not present in this deployment; skip
    END;
  END LOOP;
  RETURN false;
END;
$$;

DO $$
DECLARE
  v_owner          uuid;
  v_keeper         uuid;
  v_dupe           uuid;
  v_dupe_name      text;
  v_keeper_name    text;
  v_keeper_created timestamptz;
  v_far_apart      boolean;
  v_removed        int := 0;
  v_skipped        int := 0;
BEGIN
  FOR v_owner, v_keeper IN
    SELECT owner_uid,
           coalesce(
             (SELECT p.business_id FROM profiles p WHERE p.id = b.owner_uid),
             (SELECT id FROM businesses WHERE owner_uid = b.owner_uid ORDER BY created_at ASC, id ASC LIMIT 1)
           ) AS keeper_id
    FROM businesses b
    GROUP BY owner_uid
    HAVING count(*) > 1
  LOOP
    -- Prefer a keeper that actually holds data so we never orphan real records
    -- behind an empty shell.
    IF v_keeper IS NOT NULL AND NOT public.business_has_data(v_keeper) THEN
      SELECT id INTO v_keeper
      FROM businesses
      WHERE owner_uid = v_owner
        AND public.business_has_data(id)
      ORDER BY created_at ASC, id ASC
      LIMIT 1;
    END IF;
    IF v_keeper IS NULL THEN
      SELECT id INTO v_keeper
      FROM businesses
      WHERE owner_uid = v_owner
      ORDER BY created_at ASC, id ASC
      LIMIT 1;
    END IF;

    SELECT name, created_at INTO v_keeper_name, v_keeper_created
    FROM businesses WHERE id = v_keeper;

    FOR v_dupe, v_dupe_name IN
      SELECT id, name FROM businesses WHERE owner_uid = v_owner AND id <> v_keeper
    LOOP
      -- Never delete a business that has real data.
      IF public.business_has_data(v_dupe) THEN
        v_skipped := v_skipped + 1;
        CONTINUE;
      END IF;

      v_far_apart := abs(extract(epoch FROM (
        (SELECT created_at FROM businesses WHERE id = v_dupe) - v_keeper_created
      ))) > 600;

      -- Skip it if it's clearly a deliberately added second business
      -- (different name AND created well after the primary one).
      IF v_dupe_name <> v_keeper_name AND v_far_apart THEN
        v_skipped := v_skipped + 1;
        CONTINUE;
      END IF;

      -- Re-point any profile whose primary link points at the dupe.
      UPDATE profiles SET business_id = v_keeper WHERE id = v_owner AND business_id = v_dupe;
      DELETE FROM business_members WHERE business_id = v_dupe;
      DELETE FROM businesses WHERE id = v_dupe;
      v_removed := v_removed + 1;
      RAISE NOTICE 'Removed duplicate empty business % ("%") for owner %', v_dupe, v_dupe_name, v_owner;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Duplicate cleanup complete: removed %, skipped % (skipped kept data or looked intentional)', v_removed, v_skipped;
END;
$$;

DROP FUNCTION public.business_has_data(uuid);

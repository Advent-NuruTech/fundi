-- =============================================================================
-- 0057_secure_storefront_identity.sql
-- Stable, human-readable storefront handles plus private store settings access.
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION normalize_store_handle(p_value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
STRICT
SET search_path = public, extensions
AS $$
  SELECT trim(both '-' FROM regexp_replace(
    regexp_replace(lower(unaccent(p_value)), '[^a-z0-9]+', '-', 'g'),
    '-+', '-', 'g'
  ));
$$;

ALTER TABLE ecommerce_stores
  ADD COLUMN IF NOT EXISTS public_handle text;

CREATE TABLE IF NOT EXISTS ecommerce_store_handle_aliases (
  handle      text PRIMARY KEY,
  store_id    uuid NOT NULL REFERENCES ecommerce_stores(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ecommerce_store_handle_aliases_format CHECK (
    handle ~ '^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$' AND handle !~ '--'
  )
);

CREATE INDEX IF NOT EXISTS idx_store_handle_aliases_store_id
  ON ecommerce_store_handle_aliases(store_id);

CREATE TABLE IF NOT EXISTS ecommerce_reserved_handles (
  handle text PRIMARY KEY,
  reason text NOT NULL DEFAULT 'Reserved by FundiFlow'
);

INSERT INTO ecommerce_reserved_handles(handle) VALUES
  ('about'), ('account'), ('admin'), ('ai'), ('analytics'), ('api'), ('auth'),
  ('both'), ('branches'), ('businesses'), ('cart'), ('checkout'), ('cookies'),
  ('customers'), ('dashboard'), ('delivery'), ('employees'), ('ffmanage'),
  ('finance'), ('forgot-password'), ('globalsell'), ('help'), ('inventory'),
  ('login'), ('logout'), ('marketplace'), ('messages'), ('offline'), ('orders'),
  ('payments'), ('portal'), ('pos'), ('pricing'), ('privacy'), ('production'),
  ('products'), ('profile'), ('register'), ('retail'), ('robots'), ('search'),
  ('sell'), ('settings'), ('shop-robots'), ('shop-sitemap'), ('sitemap'),
  ('sitemaps'), ('start-trial'), ('storefront'), ('story'), ('support'), ('terms'),
  ('thank-you'), ('track'), ('wholesale'), ('www')
ON CONFLICT (handle) DO NOTHING;

-- Preserve every existing public URL before assigning display-name handles.
INSERT INTO ecommerce_store_handle_aliases(handle, store_id)
SELECT slug, id
FROM ecommerce_stores
WHERE slug ~ '^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$'
  AND slug !~ '--'
ON CONFLICT (handle) DO NOTHING;

DO $$
DECLARE
  v_store record;
  v_base text;
  v_location text;
  v_candidate text;
  v_suffix integer;
BEGIN
  FOR v_store IN
    SELECT id, store_name, location, slug
    FROM ecommerce_stores
    WHERE public_handle IS NULL
    ORDER BY created_at, id
  LOOP
    v_base := left(normalize_store_handle(v_store.store_name), 50);
    IF length(v_base) < 3 THEN
      v_base := left(normalize_store_handle(v_store.slug), 50);
    END IF;
    IF length(v_base) < 3 THEN
      v_base := 'store-' || substr(replace(v_store.id::text, '-', ''), 1, 8);
    END IF;

    v_candidate := v_base;
    v_location := left(normalize_store_handle(split_part(coalesce(v_store.location, ''), ',', 1)), 24);

    IF EXISTS (SELECT 1 FROM ecommerce_reserved_handles WHERE handle = v_candidate)
       OR EXISTS (SELECT 1 FROM ecommerce_stores WHERE public_handle = v_candidate)
       OR EXISTS (
         SELECT 1 FROM ecommerce_store_handle_aliases
         WHERE handle = v_candidate AND store_id <> v_store.id
       ) THEN
      IF length(v_location) >= 2 THEN
        v_candidate := left(v_base, 50 - length(v_location) - 1) || '-' || v_location;
      END IF;
    END IF;

    v_suffix := 2;
    WHILE EXISTS (SELECT 1 FROM ecommerce_reserved_handles WHERE handle = v_candidate)
       OR EXISTS (SELECT 1 FROM ecommerce_stores WHERE public_handle = v_candidate)
       OR EXISTS (
         SELECT 1 FROM ecommerce_store_handle_aliases
         WHERE handle = v_candidate AND store_id <> v_store.id
       ) LOOP
      v_candidate := left(v_base, 46) || '-' || v_suffix::text;
      v_suffix := v_suffix + 1;
    END LOOP;

    UPDATE ecommerce_stores SET public_handle = v_candidate WHERE id = v_store.id;
  END LOOP;
END $$;

ALTER TABLE ecommerce_stores
  ALTER COLUMN public_handle SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ecommerce_stores_public_handle_unique
  ON ecommerce_stores(lower(public_handle));

ALTER TABLE ecommerce_stores
  DROP CONSTRAINT IF EXISTS ecommerce_stores_public_handle_format;
ALTER TABLE ecommerce_stores
  ADD CONSTRAINT ecommerce_stores_public_handle_format CHECK (
    public_handle ~ '^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$'
    AND public_handle !~ '--'
  );

CREATE OR REPLACE FUNCTION is_store_handle_available(
  p_handle text,
  p_store_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, extensions
AS $$
DECLARE
  v_handle text := normalize_store_handle(p_handle);
BEGIN
  IF v_handle <> p_handle
     OR length(v_handle) < 3
     OR length(v_handle) > 50
     OR v_handle !~ '^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$'
     OR v_handle ~ '--'
     OR EXISTS (SELECT 1 FROM ecommerce_reserved_handles WHERE handle = v_handle) THEN
    RETURN false;
  END IF;

  RETURN NOT EXISTS (
    SELECT 1 FROM ecommerce_stores
    WHERE public_handle = v_handle AND id IS DISTINCT FROM p_store_id
  ) AND NOT EXISTS (
    SELECT 1 FROM ecommerce_store_handle_aliases
    WHERE handle = v_handle AND store_id IS DISTINCT FROM p_store_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION get_my_ecommerce_store(p_business_id uuid)
RETURNS SETOF ecommerce_stores
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM business_members
    WHERE business_id = p_business_id AND profile_id = auth.uid() AND active = true
  ) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT s.* FROM ecommerce_stores s WHERE s.business_id = p_business_id;
END;
$$;

CREATE OR REPLACE FUNCTION save_my_ecommerce_store(
  p_business_id uuid,
  p_store_id uuid,
  p_input jsonb,
  p_requested_handle text DEFAULT NULL
)
RETURNS SETOF ecommerce_stores
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_store ecommerce_stores%ROWTYPE;
  v_handle text;
  v_base text;
  v_suffix integer := 2;
  v_business_name text;
  v_business_type text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM business_members
    WHERE business_id = p_business_id AND profile_id = auth.uid() AND active = true
  ) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  SELECT name, business_type INTO v_business_name, v_business_type
  FROM businesses WHERE id = p_business_id;

  SELECT * INTO v_store
  FROM ecommerce_stores
  WHERE business_id = p_business_id
    AND (p_store_id IS NULL OR id = p_store_id)
  FOR UPDATE;

  v_handle := normalize_store_handle(coalesce(
    nullif(p_requested_handle, ''),
    nullif(v_store.public_handle, ''),
    p_input->>'storeName',
    v_business_name
  ));

  IF p_requested_handle IS NOT NULL AND p_requested_handle <> v_handle THEN
    RAISE EXCEPTION 'Store handle may contain only lowercase letters, numbers, and single hyphens';
  END IF;
  IF length(v_handle) < 3 OR length(v_handle) > 50 OR v_handle ~ '--' THEN
    RAISE EXCEPTION 'Store handle must be between 3 and 50 characters';
  END IF;

  -- Serialize claims for the same handle across both the primary and alias tables.
  PERFORM pg_advisory_xact_lock(hashtextextended('store-handle:' || v_handle, 0));

  IF v_store.id IS NULL AND NOT is_store_handle_available(v_handle, NULL) THEN
    v_base := left(v_handle, 46);
    WHILE NOT is_store_handle_available(v_base || '-' || v_suffix::text, NULL) LOOP
      v_suffix := v_suffix + 1;
    END LOOP;
    v_handle := v_base || '-' || v_suffix::text;
  ELSIF v_store.id IS NOT NULL AND NOT is_store_handle_available(v_handle, v_store.id) THEN
    RAISE EXCEPTION 'That store address is already taken';
  END IF;

  IF v_store.id IS NULL THEN
    INSERT INTO ecommerce_stores (
      business_id, slug, public_handle, store_name, store_type, description,
      banner_url, logo_url, contact_phone, notification_phone, contact_email,
      location, is_active
    ) VALUES (
      p_business_id,
      v_handle,
      v_handle,
      coalesce(nullif(p_input->>'storeName', ''), v_business_name, 'My Store'),
      v_business_type,
      nullif(p_input->>'description', ''),
      nullif(p_input->>'bannerUrl', ''),
      nullif(p_input->>'logoUrl', ''),
      nullif(p_input->>'contactPhone', ''),
      nullif(p_input->>'notificationPhone', ''),
      nullif(p_input->>'contactEmail', ''),
      nullif(p_input->>'location', ''),
      true
    ) RETURNING * INTO v_store;
  ELSE
    IF v_store.public_handle <> v_handle THEN
      INSERT INTO ecommerce_store_handle_aliases(handle, store_id)
      VALUES (v_store.public_handle, v_store.id)
      ON CONFLICT (handle) DO NOTHING;
    END IF;

    UPDATE ecommerce_stores SET
      public_handle = v_handle,
      store_name = coalesce(nullif(p_input->>'storeName', ''), store_name),
      description = nullif(p_input->>'description', ''),
      banner_url = nullif(p_input->>'bannerUrl', ''),
      logo_url = nullif(p_input->>'logoUrl', ''),
      contact_phone = nullif(p_input->>'contactPhone', ''),
      notification_phone = nullif(p_input->>'notificationPhone', ''),
      contact_email = nullif(p_input->>'contactEmail', ''),
      location = nullif(p_input->>'location', '')
    WHERE id = v_store.id
    RETURNING * INTO v_store;
  END IF;

  RETURN NEXT v_store;
END;
$$;

-- Public catalogue reads may not expose the operational notification number.
REVOKE SELECT ON ecommerce_stores FROM anon, authenticated;
GRANT SELECT (
  id, business_id, slug, public_handle, store_name, store_type, description,
  banner_url, logo_url, contact_phone, contact_email, location, is_active,
  is_verified, is_suspended, total_products, total_orders, created_at, updated_at
) ON ecommerce_stores TO anon, authenticated;

-- Store mutations go through the membership-checked RPC above.
REVOKE INSERT, UPDATE, DELETE ON ecommerce_stores FROM authenticated;
REVOKE ALL ON ecommerce_store_handle_aliases FROM anon, authenticated;
REVOKE ALL ON ecommerce_reserved_handles FROM anon, authenticated;

REVOKE ALL ON FUNCTION is_store_handle_available(text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION get_my_ecommerce_store(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION save_my_ecommerce_store(uuid, uuid, jsonb, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION is_store_handle_available(text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_my_ecommerce_store(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION save_my_ecommerce_store(uuid, uuid, jsonb, text) TO authenticated;
GRANT ALL ON ecommerce_store_handle_aliases TO service_role;
GRANT ALL ON ecommerce_reserved_handles TO service_role;

COMMENT ON COLUMN ecommerce_stores.public_handle IS
  'Stable, globally unique public storefront address. Display name remains independent.';

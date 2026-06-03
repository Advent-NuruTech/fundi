-- ============================================================================
-- FUNDIFLOW - Supabase Migration: 00003_tables_core
-- Core tables: profiles, businesses, business_members, employees,
-- employee_invitations, and their foreign keys
-- ============================================================================

-- -------------------------------------------------------------------
-- 2.1 profiles - Extended user profiles linked to Supabase auth
-- -------------------------------------------------------------------
CREATE TABLE profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           TEXT NOT NULL,
  display_name    TEXT NOT NULL,
  employee_number TEXT,
  role            user_role NOT NULL DEFAULT 'tailor',
  roles           user_role[] NOT NULL DEFAULT ARRAY['tailor']::user_role[],
  business_id     UUID, -- FK added after businesses table; nullable during owner bootstrap
  active          BOOLEAN NOT NULL DEFAULT true,
  must_change_password BOOLEAN NOT NULL DEFAULT false,
  photo_url       TEXT,
  bio             TEXT,
  phone           TEXT,
  invited_by_uid  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  invited_by_name TEXT,
  pay_rate        NUMERIC(12,2) NOT NULL DEFAULT 0,
  pay_period      pay_period NOT NULL DEFAULT 'monthly',
  next_pay_date   DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_active_at  TIMESTAMPTZ
);

-- -------------------------------------------------------------------
-- 2.2 businesses - Multi-tenant workshop/business entities
-- -------------------------------------------------------------------
CREATE TABLE businesses (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,
  email             TEXT,
  phone             TEXT NOT NULL,
  address           TEXT,
  location          TEXT,
  currency          TEXT NOT NULL DEFAULT 'KES',
  country           TEXT NOT NULL DEFAULT 'Kenya',
  plan              business_plan NOT NULL DEFAULT 'starter',
  owner_uid         UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  order_counter     INTEGER NOT NULL DEFAULT 0,
  employee_counter  INTEGER NOT NULL DEFAULT 0,
  sms_sender_id     TEXT DEFAULT 'FundiFlow',
  created_by        UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add FK from profiles to businesses
ALTER TABLE profiles ADD CONSTRAINT fk_profiles_business
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE SET NULL;

-- -------------------------------------------------------------------
-- 2.3 business_members - Many-to-many: profiles <-> businesses
--    (Mirrors what was stored in Firestore's `members` subcollection)
-- -------------------------------------------------------------------
CREATE TABLE business_members (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  profile_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role              user_role NOT NULL DEFAULT 'tailor',
  roles             user_role[] NOT NULL DEFAULT ARRAY['tailor']::user_role[],
  employee_number   TEXT,
  active            BOOLEAN NOT NULL DEFAULT true,
  invited_by_uid    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  invited_by_name   TEXT,
  pay_rate          NUMERIC(12,2) NOT NULL DEFAULT 0,
  pay_period        pay_period NOT NULL DEFAULT 'monthly',
  next_pay_date     DATE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_active_at    TIMESTAMPTZ,
  UNIQUE(business_id, profile_id)
);

-- -------------------------------------------------------------------
-- 2.4 employees - Legacy employee records retained for compatibility
-- -------------------------------------------------------------------
CREATE TABLE employees (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id             UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  employee_number         TEXT NOT NULL,
  name                    TEXT NOT NULL,
  phone                   TEXT NOT NULL,
  email                   TEXT NOT NULL,
  role                    employee_role NOT NULL DEFAULT 'tailor',
  is_active               BOOLEAN NOT NULL DEFAULT true,
  created_by              UUID REFERENCES profiles(id) ON DELETE SET NULL,
  photo_url               TEXT,
  assigned_orders_count   INTEGER NOT NULL DEFAULT 0,
  completed_orders_count  INTEGER NOT NULL DEFAULT 0,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(business_id, employee_number),
  UNIQUE(business_id, email)
);

-- -------------------------------------------------------------------
-- 2.5 employee_invitations - Pending employee invitations
-- -------------------------------------------------------------------
CREATE TABLE employee_invitations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  email             TEXT NOT NULL,
  display_name      TEXT NOT NULL,
  roles             user_role[] NOT NULL DEFAULT ARRAY['tailor']::user_role[],
  token             TEXT NOT NULL UNIQUE,
  invited_uid       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  temporary_password TEXT NOT NULL,
  invited_by_uid    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  invited_by_name   TEXT NOT NULL,
  status            invitation_status NOT NULL DEFAULT 'pending',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at        TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '48 hours'),
  accepted_at       TIMESTAMPTZ
);

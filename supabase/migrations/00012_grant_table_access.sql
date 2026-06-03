-- ============================================================================
-- FUNDIFLOW - Migration 00012: Grant table/sequence/function access to all roles
--
-- Supabase's auto_expose_new_tables default flipped to false on 2026-05-30.
-- Without explicit GRANTs, the service_role, authenticated, and anon
-- PostgreSQL roles get "permission denied" even when RLS would allow the
-- operation.  This migration restores the expected access.
-- ============================================================================

-- Full access on all current and future tables in the public schema
GRANT ALL ON ALL TABLES    IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES  IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- Default privileges so future tables/sequences/functions get the same grants
-- automatically (applies to objects created by the 'postgres' role).
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES    TO postgres, anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON ROUTINES  TO postgres, anon, authenticated, service_role;

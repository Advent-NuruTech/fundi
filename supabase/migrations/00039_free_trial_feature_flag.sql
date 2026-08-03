-- ============================================================================
-- FUNDIFLOW - Supabase Migration: 00039_free_trial_feature_flag
-- Platform-wide feature flag that lets platform managers turn the free trial
-- on or off for all businesses.
--
--   ON  → new workspaces may start a free trial (existing /start-trial flow).
--   OFF → no user may start a free trial; all trial UI is hidden and the
--         signup journey routes straight to checkout/pricing.
--
-- Stored in the existing platform-level `system_config` key/value table
-- (service_role only, already RLS-locked in migration 00026).
-- ============================================================================

INSERT INTO system_config (key, value) VALUES ('free_trial_enabled', 'true')
ON CONFLICT (key) DO NOTHING;

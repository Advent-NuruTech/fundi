-- ============================================================================
-- FUNDIFLOW - Migration 00038: Customer Portal Support chat
-- ----------------------------------------------------------------------------
-- Fixes the support chat for portal customers. The portal showed
-- "Support is available once your account is linked to an order" even though
-- orders existed, because RLS silently blocked both reads of the `businesses`
-- table and INSERTs into `conversations` for customers (a portal customer is
-- not a business_member).
--
--   • businesses_portal_select    – portal user may read businesses they have a
--                                   customer record in (drives the chat list).
--   • conversations_portal_insert – portal user may open a support conversation
--                                   as a participant for a linked business.
-- ============================================================================

-- 1. Portal customers can read the businesses they belong to as customers.
DO $$ BEGIN
  CREATE POLICY businesses_portal_select ON businesses
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM customers c
        WHERE c.business_id = businesses.id
          AND c.portal_user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Portal customers can start a support conversation with any business they
--    are a customer of. They must be a participant, and the business must be
--    one they are actually linked to (prevents arbitrary cross-workshop chats).
DO $$ BEGIN
  CREATE POLICY conversations_portal_insert ON conversations
    FOR INSERT WITH CHECK (
      auth.uid() = ANY(participants)
      AND EXISTS (
        SELECT 1 FROM customers c
        WHERE c.business_id = conversations.business_id
          AND c.portal_user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

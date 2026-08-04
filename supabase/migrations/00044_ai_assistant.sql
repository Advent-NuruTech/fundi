-- =============================================================================
-- FUNDIFLOW - Supabase Migration: 00044_ai_assistant
--
-- Persistence for the Business AI Assistant (AI 2).
--
--   * ai_conversations  → one chat thread per (business, user, persona)
--   * ai_messages       → immutable message log per conversation, including
--                         billing metadata (credits charged, tokens, model)
--
-- Security model mirrors the human `conversations`/`messages` tables:
-- RLS scopes every row to businesses the caller belongs to via
-- `business_members`, so no tenant can ever read another tenant's AI history.
-- The assistant's prompt + context are built in the app layer
-- (src/lib/ai/*); this migration only persists the conversation.
-- =============================================================================

-- ── ai_conversations ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_conversations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id      UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id          UUID REFERENCES profiles(id) ON DELETE SET NULL,
  title            TEXT NOT NULL DEFAULT 'New conversation',
  persona_id       TEXT NOT NULL DEFAULT 'business_consultant',
  status           TEXT NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active', 'archived')),
  last_message_at  TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── ai_messages ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_messages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id   UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  business_id       UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id           UUID REFERENCES profiles(id) ON DELETE SET NULL,
  role              TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content           TEXT NOT NULL,
  model             TEXT,
  credits_charged   INTEGER NOT NULL DEFAULT 0,
  tokens_total      INTEGER NOT NULL DEFAULT 0,
  -- Audit + forward-compat (e.g. provider, prompt tokens, refunds).
  metadata          JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ai_conversations_business
  ON ai_conversations(business_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_persona
  ON ai_conversations(business_id, persona_id);
CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation
  ON ai_messages(conversation_id, created_at ASC);

-- ── Triggers ─────────────────────────────────────────────────────────────────
CREATE TRIGGER trg_ai_conversations_updated_at
  BEFORE UPDATE ON ai_conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_conversations_select_workspace_member"
  ON ai_conversations FOR SELECT
  USING (
    business_id IN (
      SELECT business_id FROM business_members WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "ai_conversations_insert_workspace_member"
  ON ai_conversations FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM business_members WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "ai_conversations_update_workspace_member"
  ON ai_conversations FOR UPDATE
  USING (
    business_id IN (
      SELECT business_id FROM business_members WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "ai_conversations_delete_workspace_member"
  ON ai_conversations FOR DELETE
  USING (
    business_id IN (
      SELECT business_id FROM business_members WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "ai_messages_select_workspace_member"
  ON ai_messages FOR SELECT
  USING (
    business_id IN (
      SELECT business_id FROM business_members WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "ai_messages_insert_workspace_member"
  ON ai_messages FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM business_members WHERE profile_id = auth.uid()
    )
  );

-- Messages are deleted through their conversation (ON DELETE CASCADE); direct
-- row deletion is intentionally not exposed to authenticated clients.

-- ── Grants ───────────────────────────────────────────────────────────────────
GRANT ALL ON ai_conversations TO service_role;
GRANT ALL ON ai_messages TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON ai_conversations TO authenticated;
GRANT SELECT, INSERT ON ai_messages TO authenticated;

-- ============================================================================
-- FUNDIFLOW - Migration: 00024_messaging_realtime
-- Real-time messaging improvements:
--   • Add last_message (JSONB), last_message_at, last_message_text columns
--   • Postgres trigger: keep conversation in sync on message INSERT
--   • Index for efficient last-activity sort
-- ============================================================================

-- Add columns to conversations (safe: no-op if they already exist)
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS last_message       JSONB,
  ADD COLUMN IF NOT EXISTS last_message_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_message_text  TEXT NOT NULL DEFAULT '';

-- Efficient sort index: most-recent conversations first per business
CREATE INDEX IF NOT EXISTS idx_conversations_last_msg_at
  ON conversations(business_id, last_message_at DESC NULLS LAST);

-- ─── Trigger function ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_sync_conversation_on_message_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE conversations
  SET
    last_message_at   = NEW.created_at,
    last_message_text = NEW.text,
    last_message      = jsonb_build_object(
                          'messageId',  NEW.id::text,
                          'text',       NEW.text,
                          'senderUid',  NEW.sender_uid::text,
                          'senderName', NEW.sender_name,
                          'createdAt',  NEW.created_at
                        ),
    updated_at        = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

-- Attach trigger (replace any prior version)
DROP TRIGGER IF EXISTS trg_sync_conversation_on_message ON messages;
CREATE TRIGGER trg_sync_conversation_on_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION fn_sync_conversation_on_message_insert();

-- Chat messages table for driver-dispatcher communication
-- Run this in Neon SQL Editor

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
  recipient_id UUID REFERENCES users(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_company_time
  ON chat_messages (company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_recipient
  ON chat_messages (recipient_id, is_read);

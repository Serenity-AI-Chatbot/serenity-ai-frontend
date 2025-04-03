-- Create table for Telegram users
CREATE TABLE IF NOT EXISTS telegram_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  telegram_id TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users (id),
  first_name TEXT,
  last_name TEXT,
  username TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create table for Telegram messages
CREATE TABLE IF NOT EXISTS telegram_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  telegram_chat_id TEXT NOT NULL,
  telegram_user_id TEXT NOT NULL,
  message_id BIGINT,
  content TEXT NOT NULL,
  is_bot BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for faster retrieval of chat history
CREATE INDEX IF NOT EXISTS idx_telegram_messages_chat_id ON telegram_messages (telegram_chat_id);
CREATE INDEX IF NOT EXISTS idx_telegram_messages_created_at ON telegram_messages (created_at);

-- Function to get most recent Telegram messages for a chat
CREATE OR REPLACE FUNCTION get_telegram_chat_history(
  p_chat_id TEXT,
  p_limit INTEGER DEFAULT 20
)
RETURNS SETOF telegram_messages
LANGUAGE SQL
AS $$
  SELECT *
  FROM telegram_messages
  WHERE telegram_chat_id = p_chat_id
  ORDER BY created_at DESC
  LIMIT p_limit;
$$;

-- Create RLS policies for secure access
ALTER TABLE telegram_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_messages ENABLE ROW LEVEL SECURITY;

-- Allow any authenticated user to view their own Telegram user info
CREATE POLICY telegram_users_select_own ON telegram_users
  FOR SELECT
  USING (user_id = auth.uid());

-- Allow service role to manage all Telegram data  
CREATE POLICY telegram_users_service_all ON telegram_users
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY telegram_messages_service_all ON telegram_messages
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Allow webhook function to access telegram data
GRANT SELECT, INSERT, UPDATE ON telegram_users TO anon, authenticated;
GRANT SELECT, INSERT ON telegram_messages TO anon, authenticated;
GRANT USAGE ON SEQUENCE telegram_messages_id_seq TO anon, authenticated; 
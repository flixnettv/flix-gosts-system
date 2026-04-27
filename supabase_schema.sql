-- SQL Schema for Flix Gosts (Supabase)

-- 1. Messages Table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'model', 'system')),
  content TEXT NOT NULL,
  persona TEXT,
  timestamp BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Memories Table
CREATE TABLE IF NOT EXISTS memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  tags TEXT[] DEFAULT '{}',
  importance INTEGER DEFAULT 1,
  timestamp BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Custom Personas Table
CREATE TABLE IF NOT EXISTS custom_personas (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  avatar TEXT,
  color TEXT,
  system_instruction TEXT NOT NULL,
  capabilities TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. User API Keys Table
CREATE TABLE IF NOT EXISTS user_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  service_name TEXT NOT NULL,
  api_key_encrypted TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, service_name)
);

-- 5. Settings Table
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL
);

-- Insert default PIN
INSERT INTO settings (key, value) VALUES ('admin_pin', '"135790"') ON CONFLICT DO NOTHING;

-- Row Level Security (RLS) Rules

-- Settings
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to manage settings" ON settings
  FOR ALL USING (auth.role() = 'authenticated');

-- Messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own messages" ON messages
  FOR ALL USING (auth.uid() = user_id);

-- Memories
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own memories" ON memories
  FOR ALL USING (auth.uid() = user_id);

-- Custom Personas
ALTER TABLE custom_personas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own personas" ON custom_personas
  FOR ALL USING (auth.uid() = user_id);

-- User API Keys
ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own api keys" ON user_api_keys
  FOR ALL USING (auth.uid() = user_id);

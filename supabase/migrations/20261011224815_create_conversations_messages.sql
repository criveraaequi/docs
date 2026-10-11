/*
# Create conversations and messages tables

1. New Tables
- `conversations`
  - `id` (uuid, primary key, auto-generated)
  - `llc_id` (text, not null) — which LLC the conversation belongs to
  - `contact_type` (text, not null, check: 'analyst' or 'cpa') — who the thread is with
  - `contact_name` (text, not null) — display name of the contact
  - `created_at` (timestamp with time zone, default now())
  - One ongoing thread per contact per LLC, enforced by a unique index on (llc_id, contact_type).
- `messages`
  - `id` (uuid, primary key, auto-generated)
  - `conversation_id` (uuid, not null, foreign key to conversations, on delete cascade)
  - `sender` (text, not null, check: 'owner' or 'contact') — who wrote the message
  - `body` (text, not null) — message text
  - `read` (boolean, default false) — read flag for received messages
  - `created_at` (timestamp with time zone, default now())
2. Indexes
- `messages_conversation_id_created_at_idx` on messages(conversation_id, created_at) for fast thread loading.
3. Security
- Enable RLS on both tables.
- Allow anon + authenticated CRUD (single-tenant demo app with no sign-in; the existing grants/notifications tables use the same posture). No ownership checks are possible without auth, and the data is intentionally shared demo data.

One ongoing thread per contact: the owner has exactly one conversation each with the Aequi analyst and the CPA firm, per the closed-beta plan.
*/

CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  llc_id text NOT NULL,
  contact_type text NOT NULL CHECK (contact_type IN ('analyst', 'cpa')),
  contact_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS conversations_llc_contact_unique
  ON conversations (llc_id, contact_type);

CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender text NOT NULL CHECK (sender IN ('owner', 'contact')),
  body text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS messages_conversation_id_created_at_idx
  ON messages (conversation_id, created_at);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_conversations" ON conversations;
CREATE POLICY "anon_select_conversations" ON conversations FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_conversations" ON conversations;
CREATE POLICY "anon_insert_conversations" ON conversations FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_conversations" ON conversations;
CREATE POLICY "anon_update_conversations" ON conversations FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_conversations" ON conversations;
CREATE POLICY "anon_delete_conversations" ON conversations FOR DELETE
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_select_messages" ON messages;
CREATE POLICY "anon_select_messages" ON messages FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_messages" ON messages;
CREATE POLICY "anon_insert_messages" ON messages FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_messages" ON messages;
CREATE POLICY "anon_update_messages" ON messages FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_messages" ON messages;
CREATE POLICY "anon_delete_messages" ON messages FOR DELETE
  TO anon, authenticated USING (true);

/*
# Create grants, pool expansions, and notifications tables

1. New Tables
- `grants` — equity grants created through the grant wizard (pending or signed).
  - `id` (uuid, primary key, auto-generated)
  - `llc_id` (text) — which company the grant belongs to (e.g. "llc-1")
  - `employee_id` (text) — existing employee id from the app's demo data
  - `employee_name` (text) — denormalized for contract display
  - `employee_role` (text) — denormalized for contract display
  - `units_awarded` (integer) — phantom units granted
  - `strike_price_per_unit` (numeric) — unit price from latest certified valuation
  - `grant_date` (date) — date the grant was issued
  - `schedule_length_months` (integer) — total vesting length (standard schedule)
  - `cliff_date` (date) — 1 year after grant date
  - `vesting_completion_date` (date) — end of vesting
  - `monthly_vesting_rate` (numeric) — units vested per month after cliff
  - `contract_document_name` (text) — placeholder contract reference
  - `status` (text) — "pending" (awaiting employee signature) or "active" (signed)
  - `signed_at` (timestamptz, nullable) — when the employee (simulated) signed
  - `created_at` (timestamptz, default now)

- `pool_expansions` — phantom pool expansion requests.
  - `id` (uuid, primary key, auto-generated)
  - `llc_id` (text) — which company is expanding its pool
  - `previous_percent` (numeric) — pool percentage before expansion
  - `new_percent` (numeric) — requested new pool percentage
  - `previous_authorized_units` (integer) — pool units before expansion
  - `new_authorized_units` (integer) — pool units after expansion
  - `passcode_verified` (boolean) — verification step completed (placeholder passcode flow)
  - `status` (text) — "pending" (awaiting approval) or "approved"
  - `created_at` (timestamptz, default now)
  - `approved_at` (timestamptz, nullable)

- `notifications` — bell-icon notifications for signing events.
  - `id` (uuid, primary key, auto-generated)
  - `llc_id` (text, nullable) — company the notification belongs to
  - `grant_id` (uuid, nullable) — links to the signed contract viewer
  - `message` (text) — e.g. "James Whitfield signed the Equity Agreement Contract"
  - `read` (boolean, default false) — unread indicator for the bell dot
  - `created_at` (timestamptz, default now)

2. Security
- Enable RLS on all three tables.
- This app has no sign-in (single-tenant closed-beta demo), so policies allow
  anon + authenticated full CRUD. Data is intentionally shared within the demo.
*/

CREATE TABLE IF NOT EXISTS grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  llc_id text NOT NULL,
  employee_id text NOT NULL,
  employee_name text NOT NULL,
  employee_role text NOT NULL,
  units_awarded integer NOT NULL,
  strike_price_per_unit numeric NOT NULL,
  grant_date date NOT NULL,
  schedule_length_months integer NOT NULL,
  cliff_date date NOT NULL,
  vesting_completion_date date NOT NULL,
  monthly_vesting_rate numeric NOT NULL,
  contract_document_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active')),
  signed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pool_expansions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  llc_id text NOT NULL,
  previous_percent numeric NOT NULL,
  new_percent numeric NOT NULL,
  previous_authorized_units integer NOT NULL,
  new_authorized_units integer NOT NULL,
  passcode_verified boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved')),
  created_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz
);

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  llc_id text,
  grant_id uuid,
  message text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS grants_llc_idx ON grants (llc_id);
CREATE INDEX IF NOT EXISTS grants_employee_idx ON grants (employee_id);
CREATE INDEX IF NOT EXISTS pool_expansions_llc_idx ON pool_expansions (llc_id);
CREATE INDEX IF NOT EXISTS notifications_llc_idx ON notifications (llc_id);

ALTER TABLE grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE pool_expansions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_grants" ON grants;
CREATE POLICY "anon_select_grants" ON grants FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_grants" ON grants;
CREATE POLICY "anon_insert_grants" ON grants FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_grants" ON grants;
CREATE POLICY "anon_update_grants" ON grants FOR UPDATE
TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_grants" ON grants;
CREATE POLICY "anon_delete_grants" ON grants FOR DELETE
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_select_pool_expansions" ON pool_expansions;
CREATE POLICY "anon_select_pool_expansions" ON pool_expansions FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_pool_expansions" ON pool_expansions;
CREATE POLICY "anon_insert_pool_expansions" ON pool_expansions FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_pool_expansions" ON pool_expansions;
CREATE POLICY "anon_update_pool_expansions" ON pool_expansions FOR UPDATE
TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_pool_expansions" ON pool_expansions;
CREATE POLICY "anon_delete_pool_expansions" ON pool_expansions FOR DELETE
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_select_notifications" ON notifications;
CREATE POLICY "anon_select_notifications" ON notifications FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_notifications" ON notifications;
CREATE POLICY "anon_insert_notifications" ON notifications FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_notifications" ON notifications;
CREATE POLICY "anon_update_notifications" ON notifications FOR UPDATE
TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_notifications" ON notifications;
CREATE POLICY "anon_delete_notifications" ON notifications FOR DELETE
TO anon, authenticated USING (true);
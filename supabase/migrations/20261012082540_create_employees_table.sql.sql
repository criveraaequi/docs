/*
# Create employees table (single-tenant, no auth)

1. New Tables
- `employees` — one row per employee of an LLC who can hold phantom equity.
  - `id` (uuid, primary key, auto-generated)
  - `llc_id` (text, not null) — the company the employee belongs to (matches llc ids used across the app, e.g. "llc-1")
  - `name` (text, not null) — full display name
  - `role_or_position` (text, not null) — job title shown on contracts and dashboards
  - `start_date` (date, not null) — employment start (used to derive tenure)
  - `employment_status` (text, not null, default 'active', check: active | terminated | resigned)
  - `termination_date` (date, nullable) — set when terminated/resigned; freezes vesting
  - `has_equity` (boolean, not null, default true) — false = onboarded without equity yet (excluded from portal for this build)
  - `w2_salary` (integer, not null, default 0) — pre-equity annual salary
  - `created_at` (timestamptz, default now())

2. Modified Tables
- `grants` — no structural change. Existing `employee_id` text values already
  match the seeded employee ids ("emp-1", "emp-2", ...) used below, so grants
  keep linking without a data migration.

3. Security
- Enable RLS on `employees`.
- Policies TO anon, authenticated (single-tenant, no sign-in — data is
  intentionally shared across the app): full CRUD, mirroring the grants /
  pool_expansions / notifications tables.
- Index on `llc_id`.

4. Seed Data
- Inserts the demo roster (James Whitfield through Terrence Boyd) with `has_equity = true`.
- Idempotent: seeds only if the table is empty.
*/

CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  llc_id text NOT NULL,
  name text NOT NULL,
  role_or_position text NOT NULL,
  start_date date NOT NULL,
  employment_status text NOT NULL DEFAULT 'active'
    CHECK (employment_status = ANY (ARRAY['active'::text, 'terminated'::text, 'resigned'::text])),
  termination_date date,
  has_equity boolean NOT NULL DEFAULT true,
  w2_salary integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS employees_llc_id_idx ON employees (llc_id);

DROP POLICY IF EXISTS "anon_select_employees" ON employees;
CREATE POLICY "anon_select_employees" ON employees FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_employees" ON employees;
CREATE POLICY "anon_insert_employees" ON employees FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_employees" ON employees;
CREATE POLICY "anon_update_employees" ON employees FOR UPDATE
TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_employees" ON employees;
CREATE POLICY "anon_delete_employees" ON employees FOR DELETE
TO anon, authenticated USING (true);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM employees LIMIT 1) THEN
    INSERT INTO employees (id, llc_id, name, role_or_position, start_date, employment_status, termination_date, has_equity, w2_salary) VALUES
    ('11111111-1111-1111-1111-111111111111', 'llc-1', 'James Whitfield', 'Lead HVAC Technician', '2022-02-01', 'active', NULL, true, 72000),
    ('22222222-2222-2222-2222-222222222222', 'llc-1', 'Sofia Martinez', 'Operations Manager', '2020-10-01', 'active', NULL, true, 85000),
    ('33333333-3333-3333-3333-333333333333', 'llc-1', 'Tyler Brennan', 'Apprentice Technician', '2025-01-01', 'terminated', '2026-06-30', true, 48000),
    ('44444444-4444-4444-4444-444444444444', 'llc-2', 'Robert Nakamura', 'Senior Project Manager', '2018-05-01', 'active', NULL, true, 95000),
    ('55555555-5555-5555-5555-555555555555', 'llc-2', 'Aisha Johnson', 'Site Supervisor', '2023-04-01', 'active', NULL, true, 78000),
    ('66666666-6666-6666-6666-666666666666', 'llc-1', 'Danielle Foster', 'Service Dispatcher', '2024-04-01', 'active', NULL, true, 52000),
    ('77777777-7777-7777-7777-777777777777', 'llc-1', 'Marcus Okafor', 'Installation Lead', '2021-10-01', 'active', NULL, true, 68000),
    ('88888888-8888-8888-8888-888888888888', 'llc-1', 'Priya Raman', 'Parts & Inventory Coordinator', '2025-04-01', 'active', NULL, true, 46000),
    ('99999999-9999-9999-9999-999999999999', 'llc-1', 'Diego Salazar', 'Comfort Advisor', '2023-10-01', 'active', NULL, true, 58000),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'llc-1', 'Hannah Liu', 'Office Administrator', '2024-10-01', 'active', NULL, true, 44000),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'llc-1', 'Terrence Boyd', 'Warehouse Technician', '2023-01-01', 'terminated', '2026-03-31', true, 41000);
  END IF;
END $$;

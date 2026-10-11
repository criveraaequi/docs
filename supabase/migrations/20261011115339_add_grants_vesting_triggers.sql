/*
# Add post-cliff vesting triggers to grants

1. Modified Tables
- `grants`
  - New column `vesting_triggers` (jsonb, not null, default '[]').
  - Stores an array of vesting triggers, each `{"atMonth": <number>, "percentOfAward": <number>}`.
  - A trigger vests the given percent of the total award at the given month of the
    schedule (months are counted from the grant date, so a trigger month before the
    cliff behaves as if it occurred at the cliff).
  - An empty array `[]` means the standard schedule: nothing before the cliff, then
    monthly vesting of the remainder. Existing rows get this default, so no behavior
    changes for grants created before this migration.

2. Security
- No policy changes. The `grants` table already has RLS enabled with anon +
  authenticated CRUD policies (single-tenant closed-beta demo), and jsonb is
  covered by the existing column-level access.

3. Notes
- Additive-only change: no existing columns are dropped or altered.
*/

ALTER TABLE grants ADD COLUMN IF NOT EXISTS vesting_triggers jsonb NOT NULL DEFAULT '[]'::jsonb;

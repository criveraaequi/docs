/*
# Add slow-vesting windows to grants

1. Modified Tables
- `grants`
  - New column `vesting_slowdowns` (jsonb, not null, default '[]').
  - Stores an array of slowdowns, each `{"fromMonth": <number>, "toMonth": <number>, "paceMultiplier": <number>}`.
  - Months are counted from the grant date; the window covers months fromMonth
    (inclusive) through toMonth (exclusive), must sit after the cliff, and the
    pace multiplier is between 0 (fully paused) and 1 (normal speed).
  - During a window, monthly vesting runs at the reduced pace; the vested
    portion the employee missed is spread across the remaining months after the
    window, so the grant still reaches 100% on the original fully-vested date.
  - An empty array `[]` means no slowdowns (standard pace). Existing rows get
    this default, so nothing changes for grants created before this migration.

2. Security
- No policy changes. The `grants` table already has RLS enabled with anon +
  authenticated CRUD policies (single-tenant closed-beta demo).

3. Notes
- Additive-only change: no existing columns are dropped or altered.
*/

ALTER TABLE grants ADD COLUMN IF NOT EXISTS vesting_slowdowns jsonb NOT NULL DEFAULT '[]'::jsonb;

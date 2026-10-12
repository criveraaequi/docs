/*
# Switch employees.id to text ids

1. Modified Tables
- `employees`
  - `id` changes from uuid to text. Reason: the rest of the platform links
    employees by short text ids ("emp-1", "emp-2", ...) — grants.employee_id
    is text and the demo seed data uses the same scheme. Keeping one id style
    avoids a mapping layer.
  - New ids default to a generated uuid string, so runtime-created employees
    still get unique ids automatically.

2. Security
- No policy changes.

3. Notes
- The table was just created and only contains the demo seed, so this is a
  safe type change (uuid -> text via USING cast). Idempotent: checks the
  current column type before altering.
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'employees'
      AND column_name = 'id'
      AND data_type = 'uuid'
  ) THEN
    ALTER TABLE employees ALTER COLUMN id DROP DEFAULT;
    ALTER TABLE employees ALTER COLUMN id TYPE text USING id::text;
    ALTER TABLE employees ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
  END IF;
END $$;

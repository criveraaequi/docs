/*
# Allow employer conversations for employees

1. Modified Tables
- `conversations`
  - The `contact_type` check now also allows 'employer'. Employee threads use
    contact_type 'employer' (the employee talks to their company/owner), while
    the LLC owner's threads keep using 'analyst' and 'cpa'.

2. Security
- No policy changes (single-tenant demo posture unchanged).
*/

DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'conversations'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%contact_type%';
  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE conversations DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

ALTER TABLE conversations ADD CHECK (contact_type IN ('analyst', 'cpa', 'employer'));

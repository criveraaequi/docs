/*
# Support contract rejection and employee-private messaging

1. Modified Tables
- `grants`
  - The `status` check now also allows 'rejected'. Flow: owner issues a grant
    (pending) → employee accepts (active) or rejects (rejected) in their
    portal → owner can revise the terms and re-send (back to pending).
- `conversations`
  - New nullable column `employee_id` (text). NULL = the LLC owner's thread
    (existing behavior). Set = a private thread for that specific employee
    (e.g. employee ↔ analyst DMs that the owner cannot see).
  - The uniqueness rule "one thread per contact" now includes the employee
    dimension: one thread per (llc, contact, employee). The old unique index
    is replaced by one with NULLS NOT DISTINCT so owner threads stay unique.
- `messages`
  - The `sender` check now also allows 'employee' (messages written by an
    employee in their own thread).

2. Security
- No policy changes: RLS stays as-is (single-tenant demo posture, anon +
  authenticated). The employee-scoping of threads is enforced in the app
  layer for now and will be tightened with real sign-in.

3. Notes
- Idempotent: constraint drops use IF EXISTS / catalog lookups; the new index
  replaces the old one safely on re-run.
*/

DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'grants'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%status%';
  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE grants DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

ALTER TABLE grants ADD CHECK (status IN ('pending', 'active', 'rejected'));

ALTER TABLE conversations ADD COLUMN IF NOT EXISTS employee_id text;

DROP INDEX IF EXISTS conversations_llc_contact_unique;

CREATE UNIQUE INDEX IF NOT EXISTS conversations_llc_contact_employee_unique
  ON conversations (llc_id, contact_type, employee_id) NULLS NOT DISTINCT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'messages'::regclass AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%sender%'
  ) THEN
    ALTER TABLE messages DROP CONSTRAINT messages_sender_check;
  END IF;
END $$;

ALTER TABLE messages ADD CHECK (sender IN ('owner', 'contact', 'employee'));

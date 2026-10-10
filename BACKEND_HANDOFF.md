# Aequi — Backend Handoff & Diligence Guide

For the engineer taking over backend work. Read this first, then `agents.md`,
`scope-doc.md`, `data-model.md`, and `role-permission-map.md`.

---

## 1. What Aequi is

Phantom-equity (synthetic equity) platform for small LLCs. Owners grant
employees "phantom units" that vest on a standard schedule (1-year cliff +
monthly) and pay out cash at the company's certified valuation. No real
shares, no dilution.

Four roles in closed-beta scope: **LLC Owner** (built), Employee, Analyst,
Platform Admin (not built).

## 2. Current state — what's real vs. placeholder

| Area | Status |
|---|---|
| Grants, pool expansions, notifications | **Real** — persisted in Supabase Postgres, survive reloads |
| Companies (LLCs), employees, valuations, users, analysts, engagements | **Mock** — hard-coded in `src/data/mockData.ts`, never sent to the database |
| Grant contracts | **Placeholder** — rendered on screen from grant data; the "PDF name" is a label, no file exists |
| Employee signing | **Placeholder** — a "simulate signing" button flips `pending → active` |
| Pool-expansion passcode | **Placeholder** — hard-coded `"1234"` (`EXPANSION_PASSCODE` in `src/data/grantStore.ts`) |
| Authentication | **None** — no sign-in; the app runs on the Supabase anon key |

## 3. Architecture

- React 18 + TypeScript + Vite SPA, `react-router-dom`, `recharts`, plain CSS
  (no Tailwind). Pages in `src/pages/`, components in `src/components/`.
- **Single data-access layer.** Screens never touch data sources directly:
  - `src/data/mockApi.ts` — read-only queries over mock data (LLCs,
    employees, valuations, analysts, engagements).
  - `src/data/grantStore.ts` — runtime store for the three persisted tables;
    fetches from Supabase, keeps an in-memory cache, exposes CRUD
    (`createGrant`, `signGrant`, `createPoolExpansion`,
    `approvePoolExpansion`, `markNotificationRead`) plus pool-math helpers
    (`getEffectivePool`, `getPoolAllocatedUnits`, `getPoolPendingUnits`).
  - `src/data/vesting.ts` — pure vesting/payout math, shared by everything.
  - `src/data/useGrantStore.ts` — hook (`useSyncExternalStore`) that
    subscribes screens to the store.
- `loadStore()` is called at app start (`src/main.tsx`) and fetches all three
  tables once; screens then read synchronously from cache.
- Row/record mapping: DB uses snake_case columns; the store maps to
  camelCase records (`GrantRow → GrantRecord` etc.).

**The migration path:** create real tables for LLCs / employees / valuations /
users, then re-implement `mockApi.ts`'s functions as Supabase queries.
Screen code should not need to change. Keep this boundary.

## 4. Database state

One migration applied:
`supabase/migrations/20261009235102_create_grants_pool_expansions_notifications.sql`

- **`grants`** — one row per grant created via the wizard. Notable columns:
  `llc_id` (text, e.g. `"llc-1"`), `employee_id` (text — **references a mock
  employee, not a DB row**), denormalized `employee_name`/`employee_role`
  for contract display, `strike_price_per_unit` (snapshot of latest certified
  valuation), `status` (`pending`/`active`), `signed_at`.
- **`pool_expansions`** — pool % changes; `status` (`pending`/`approved`);
  latest approved row overrides the LLC's seeded pool figures.
- **`notifications`** — bell notifications; `grant_id` links to the contract
  viewer; `read` drives the unread dot.
- Indexes on `llc_id` (+ `employee_id` on grants). RLS enabled on all three.
- IDs are `gen_random_uuid()`; app passes none.

**Pool semantics (important):** seeded employees count toward the pool via
`unitsIssued` on the LLC seed; runtime grants count only when `active`
(signed). Pending grants and pending expansions do not consume the pool.
`LLC_BASE` in `grantStore.ts` hard-codes llc-1/llc-2 pool figures as the
seed baseline.

## 5. Security posture (the big-ticket item)

RLS is enabled but the policies are **fully open** (`USING (true)` /
`WITH CHECK (true)` to `anon, authenticated`) — intentional for the
single-tenant, no-auth demo. Anyone with the anon key can read/write
everything. This must be replaced before any real data lands:

1. **Auth** — Supabase email/password auth; map each LLC owner to an
   `auth.users` row. Add real employee identities for the signing flow.
2. **RLS rewrite** — deny-by-default, per-verb policies keyed on
   `auth.uid()`, scoped by LLC membership (owner sees own LLC's grants;
   employees see only their own; analyst/admin roles per
   `role-permission-map.md`).
3. **Privileged mutations** — signing, approval, and passcode verification
   should be server-enforced (SECURITY DEFINER functions or edge functions),
   not client-side updates. Verify the verification passcode server-side;
   never ship it to the client.
4. **Status transitions** — enforce `pending → active` and
   `pending → approved` server-side (check constraints or functions);
   currently any client can flip any status.
5. **Error hygiene** — the store throws raw Supabase errors to callers;
   surface generic errors to users, log details server-side.
6. `notifications.llc_id` and `grant_id` are nullable and unvalidated —
   tighten once ownership rules exist.

## 6. Recommended diligence checklist (suggested order)

1. Auth (owner sign-in) + RLS rewrite (section 5.1–5.2)
2. Real entity tables: `llcs`, `employees`, `valuation_events`,
   `llc_authorized_users` — mirror `data-model.md`; replace `mockApi.ts`
   internals, keep function signatures
3. Grants link by real `employee_id` FK; drop denormalized name/role (or
   keep only for immutable contract snapshots)
4. Server-enforced signing + approval flows (section 5.3–5.4)
5. Real contract documents: PDF generation + Supabase Storage (private
   bucket, tenant-scoped policies)
6. Employee-side signing flow (email link / code) replacing simulation
7. Valuation entry/import by the analyst
8. Clear out demo grants tied to mock employees during data migration
9. Later: Stripe payout flow (deferred until payouts go live)

**Closed-beta decisions that must not be undone** (see `agents.md`):
standard schedule only (1-year cliff + monthly, length editable), manual
single-analyst valuations (no algorithm drafts), single owner tier per LLC.

## 7. Environment & access

- Secrets are in `.env` (never commit): `VITE_SUPABASE_URL`,
  `VITE_SUPABASE_ANON_KEY` (client), plus `SUPABASE_SERVICE_ROLE_KEY` /
  `SUPABASE_DB_URL` (server-side only — the service key must never reach
  the browser bundle).
- The Supabase project is standalone — manage it from the Supabase
  dashboard (Table Editor, SQL editor, Auth, Storage). Grant the engineer
  access by inviting them in the dashboard, not by sharing keys.
- Local dev: `npm install`, then `npm run dev`. Verify with
  `npm run build` (typecheck + build) — keep it passing.

## 8. Conventions

- Named exports; CSS classes in `src/styles/dashboard.css` (plain CSS, no
  inline style objects beyond small layout tweaks)
- Types in `src/data/types.ts`; keep mock data in `mockData.ts` until the
  real tables replace it
- Design system: cream background, navy `#1f3164` primary, bronze `#b07d3a`
  accents, Fraunces headings + IBM Plex Sans body, monospace uppercase
  labels. No purple/indigo.

# agents.md — Aequi project context

Read this file first. It is the persistent context for the Aequi app; it carries over between chats so the project doesn't lose direction.

> **Backend engineer?** Start with `BACKEND_HANDOFF.md` — it covers what's real vs. placeholder, the security posture, and the diligence checklist.

## What Aequi is

Aequi is a phantom-equity (synthetic equity) platform for small LLCs. Business owners grant employees "phantom units" that vest over time and pay out cash based on the company's certified valuation — no real shares, no dilution.

**Roles (4, closed-beta scope):** LLC Owner, Employee, Analyst, Platform Admin. Currently built: the Owner experience.

**Closed-beta decisions that must not be undone:**
- Vesting is always a standard 1-year cliff + monthly vesting. Owners may edit schedule *length only* — never build custom schedule editors.
- Valuations are manual, performed by a single analyst. The valuation algorithm is deliberately deferred to post-MVP — do not add algorithm-generated drafts.
- Grant contracts are mock placeholders for the demo. A legally binding, attorney-drafted template comes before December enrollment — do not treat the placeholder as real.
- Single owner tier per LLC (no HR/manager sub-roles yet).

## Current state (what's built)

React + Vite + TypeScript app with mock data (no backend connected yet — data comes from `src/data/mockData.ts`).

- **`/` Owner Dashboard** — equity pool summary, recent valuations, employee grant overview
- **`/valuation-history/:llcId`** — valuation history page with a detail modal per valuation
- **`/employees`** — placeholder list
- **`/employees/:employeeId`** — employee grant page, redesigned to a chart-first layout:
  - Hero card: employee name/company, total units, big "Total vested payout" headline, toggle between dollars and units
  - Unvested employees (still in cliff) show "Projected value upon vesting: $X" (all units × latest certified price)
  - Vested-payout chart with visible dollar/unit ticks on the y-axis and a dashed "CLIFF · YR 1" marker; the curve is driven by the LLC's certified valuation history so value rises over time
  - Stat row under the chart: vesting length, cliff, initial price, final price, avg YoY price growth
  - Details (issue/cliff/vesting dates, monthly rate, agreement doc, progress bar) below the fold

## Design system (follow it consistently)

- Cream/warm-paper background, navy primary (#1f3164), tan/bronze accent for markers
- Serif headings (Fraunces) + sans body (IBM Plex Sans); monospace eyebrows/labels, uppercase with letter-spacing
- Card-based layout on white cards, subtle borders, no heavy shadows
- No purple/indigo hues. Chart line is navy, cliff marker is bronze (#b07d3a)

## Conventions

- Pages live in `src/pages/`, shared components in `src/components/`, styles in `src/styles/` (plain CSS: `global.css` + `dashboard.css`)
- Types in `src/data/types.ts`; mock data + a thin mock API layer in `src/data/mockData.ts` and `mockApi.ts`
- Run `npm run build` (typecheck + build) after changes; keep it passing
- Match existing file style: named exports, CSS classes in dashboard.css, no inline style objects except small layout tweaks

## Known next steps / ideas

- Employee list page (currently a placeholder)
- Connect Supabase for real persistence (employee/LLC/grant tables, valuation history)
- Employee-facing view (employees seeing their own grant)
- Platform Admin view; Analyst engagement view
- Stripe payout flow (deferred until payouts go live)

## When starting a new chat

Skim `scope-doc.md` for in-scope vs. deferred decisions, and `data-model.md` for entity structure. If a request conflicts with a closed-beta decision above, flag it instead of building it.

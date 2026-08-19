# Aequi — Data Model

*Complete — all 5 entities. Built for Ankit's Sept 8 handoff.*

---

## Entity: Employee

| Category | Field |
|---|---|
| Identity | Name, role/position, tenure at company, employment status (active/terminated/resigned), termination date |
| Relationship | Linked to one LLC (belongs to) |
| Tax/Compensation | W-2 info, salary (pre-equity) |
| Equity Grant | Number of units awarded, strike price per unit (derived from LLC's valuation history at grant date), contractual agreement (document, incl. forfeiture terms) |
| Vesting | Grant/start date, vesting schedule type (standard: 1-year cliff + monthly thereafter), current vested amount, vesting completion date |
| Value | Current payout value (vested units × current strike price) |
| Forfeiture (closed beta default) | Unvested units forfeited on termination; vested units retained, paid out at future liquidity event (same as active employees) |

**Notes:**
- Custom drag-and-drop vesting schedule builder deferred to post-closed-beta.
- Payout-trigger flexibility (annual profit-sharing style, payout at vesting completion) is an **open legal question** — pending attorney review of IRC 409A compliance. Closed beta defaults to liquidity-event payout only.

---

## Entity: LLC

| Category | Field |
|---|---|
| Identity | Name, industry, number of employees, date onboarded to Aequi |
| Subscription | Plan tier (Starter / Growth / Enterprise), payment history, tenure with Aequi |
| Equity Pool | % of company allocated to phantom equity pool, total units authorized, units issued |
| Relationships | Linked Employees (has many), linked Authorized Users (has many), assigned Analyst(s), Analyst-LLC Engagement record(s) |
| Valuation History | Timeline of valuation events — each with date, valuation amount, analyst who performed it, valuation document, resulting strike price for that period |
| Analytics | Year-over-year revenue/valuation growth (derived from valuation history) |

**Notes:**
- Employee-level data (contracts, vesting schedules) is **NOT duplicated here** — LLC dashboard references the Employee entity directly (single source of truth principle).
- Strike price is derived from the valuation history timeline, not a standalone static field.
- **Known gap (flagged, tracked separately):** current TAM/SAM has no growth-rate screen. Not a data model issue — a market-sizing issue to revisit before further investor conversations.

---

## Entity: LLC Authorized User

| Category | Field |
|---|---|
| Identity | Name, title/position |
| Access | Login credentials, linked to one LLC |
| Permission tier | Closed beta = single tier (owner) — full access to all LLC data, including cash reserves and valuation detail |

**Notes:**
- Closed beta assumes small LLCs with owner = primary/only authorized user.
- Deferred to post-closed-beta: secondary/HR tier with restricted visibility (cash reserves, valuation detail locked to owner-only) once pipeline includes larger LLCs with separate HR/exec structure.
- **Explicitly out of scope:** buyout deal data, board negotiation data — not part of Aequi's core phantom equity product; adjacent to long-term "Act 3" marketplace/M&A thesis, not this platform.

---

## Entity: Analyst

| Category | Field |
|---|---|
| Identity | Name, credential type (CVA/ASA/ABV), years of valuation experience |
| Verification | Credential documents/proof, verification status, credential expiration/renewal date |
| Relationships | Linked LLCs (has many — clients, current and past, via Analyst-LLC Engagement) |
| Payment | Payout method (Stripe account info), compensation history |

**Notes:**
- Credential renewal: NACVA (CVA) requires 60 hours continuing education per 3-year cycle, ending Dec 31 of the third year — attestation-based, self-reported (not real-time API-verifiable). Verify ASA's cycle separately before finalizing — may differ from NACVA.
- Closed beta: manual credential verification by Platform Admin (Chris/Nicholas); attorney to confirm process before scaling past closed beta.
- Closed beta: single analyst.

---

## Entity: Analyst-LLC Engagement

*(Connects one Analyst to one LLC for a valuation cycle; stays open across annual re-valuations if no disputes)*

**Lifecycle stages:**

1. **Requested** — LLC signals need for valuation (request date, LLC ID)
2. **Matching** — visible to analysts, or Aequi pushes to a specific analyst (notification date)
3. **Analyst Accepted** — analyst agrees to take engagement (acceptance date, analyst ID)
4. **Contract Signed** — engagement agreement (terms, due-diligence timeline, compensation conditions) signed by both parties (contract document, signature dates)
5. **Confirmed/Active** — both sides locked in; LLC sends 3-5 years of financials (financials received date, documents)
6. **Draft Valuation Generated** — Aequi's algorithm produces a **PRELIMINARY** draft from financials (draft valuation document, generation date) — NOT the final/official valuation
7. **Analyst Review** — analyst independently audits the draft; agrees or disputes (review outcome, review notes)
   - **7a. If disputes** — analyst consults Aequi, conducts independent valuation, notifies LLC of discrepancy (discrepancy notes, independent valuation document)
8. **Certified** — final valuation is the analyst's independent, signed/stamped work product; uploaded, becomes LLC's official valuation record, feeds strike price (final valuation document, certification date, e-signature)
9. **Compensation** — analyst paid via Stripe (payout amount, date, status)

**Notes:**
- **IMPORTANT / flagged for attorney:** the draft valuation Aequi's algorithm generates must be treated as a preliminary estimate/input, NOT the final valuation. The analyst's independent professional judgment must be genuine (not a rubber stamp) for the valuation to be legally defensible as the analyst's own work product. This is the scope of the previously-flagged CVA Methodology Review compliance item — do not finalize the "agree" path process without attorney sign-off.
- Due-date/deadline tracking for Analyst Review deliberately deferred for closed beta — no reliable data yet on actual turnaround time at Aequi's scale. Revisit once closed beta produces real completion-time data (industry benchmarks for small/simple business valuations range ~2-4 weeks, for reference only — not to be hardcoded).
- Engagement record stays open/ongoing across annual re-valuations with the same analyst, provided no disputes.

---

## Entity: Platform Admin

*(Closed beta: Chris and Nicholas)*

| Category | Field |
|---|---|
| Actions | Manual analyst credential verification log, dispute resolution records, customer service request log |
| LLC Oversight | Full LLC profiles (industry, employee count, owner contact info, subscription plan, payment history, tenure), full Employee data (including names) for support/dispute purposes |
| Analytics (aggregate, cross-LLC) | Revenue by plan tier, average employee tenure, average vesting schedule length, other aggregate trends |

**Notes:**
- Usage/product analytics (click tracking, feature engagement, session-level data) explicitly **DEFERRED** to post-closed-beta. At closed-beta scale, direct owner conversations substitute for built-in analytics infrastructure.
- **Architecture guidance for Ankit:** keep schema normalized/clean (no duplicated data across entities) and avoid coupling business logic into UI components. This is what allows analytics and other deferred features to be added later without retrofitting — no need to over-engineer for scale now, just don't build in ways that block it later.

---

## Open Items Summary (for attorney / future review)

1. **IRC 409A:** can payout be structured on triggers other than liquidity event (e.g., vesting completion, annual profit-sharing)? Closed beta defaults to liquidity-event-only payout.
2. **CVA Methodology Review:** confirm the draft-algorithm + independent-analyst-review structure (Analyst-LLC Engagement, stages 6-8) is legally defensible / analyst liability is genuine, not a rubber stamp.
3. **Analyst credential verification process** (manual for closed beta) — confirm compliant approach before scaling.

---

## Deferred to Post-Closed-Beta (not in scope for Sept 8 build)

- Customizable drag-and-drop vesting schedule builder for LLC employers
- Secondary/HR permission tier for LLC Authorized Users
- Automated analyst credential verification
- Due-date/deadline tracking on Analyst Review stage
- Usage/product analytics infrastructure
- "Aequi for Analysts" — standalone valuation copilot product for analysts' independent clients (inverted funnel GTM idea)
- CPA channel (entire channel out of scope for closed beta — D2C LLC only)
- TAM/SAM growth-rate screen (market-sizing fix, not a build item, but tracked here for visibility)

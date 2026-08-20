[Aequi_Scope_Doc.md](https://github.com/user-attachments/files/31283620/Aequi_Scope_Doc.md)
# Aequi — Closed Beta Scope Doc (v1 vs. Deferred)
*Companion to the Data Model, Process Flow, and Role/Permission Map docs. Defines exactly what ships for the Sept 8 demo / Dec–Jan closed beta, and what is deliberately excluded, with rationale.*

---

## What's IN Scope (v1 / Closed Beta)

- **Core entities:** Employee, LLC, LLC Authorized User (single tier — owner only), Analyst (single analyst), Platform Admin
- **Grant creation flow:** LLC owner-initiated. Contract included as a **placeholder (mock, not legally binding)** for the Sept 8 demo. Attorney-drafted, legally compliant contract template required before December client enrollment.
- **Vesting schedule:** Standard one-year cliff + monthly vesting. LLC owners may edit **schedule length only** — no other schedule customization.
- **Analyst valuation (closed beta):** Full manual valuation per engagement — no algorithm-generated draft. Analyst reviews, certifies independently. Cost funded by Aequi (via fundraising) for closed-beta clients.
- **Analyst credential verification:** Manual, by Platform Admin.
- **Payout:** Stripe API.
- **Platform Admin:** Full LLC + Employee visibility for support/dispute resolution.
- **Role/permission structure:** Per Role/Permission Map doc (LLC Owner, Employee, Analyst, Platform Admin — 4 roles, closed beta scope).

---

## What's DEFERRED — and Why

### From the Data Model
| Item | Deferred to | Rationale |
|---|---|---|
| Valuation algorithm (draft-generation step) | Post-MVP, development begins immediately after MVP is complete — one of Aequi's core differentiators | Enables faster closed-beta launch; avoids shipping an unvalidated/unstressed algorithm; allows the algorithm to be co-designed with the analyst using real engagement data and legal input before rollout |
| Automatic analyst credential verification | Open beta / v2 | Manual verification sufficient at single-analyst scale |
| Platform Admin analytics / cross-LLC aggregate reporting | Open beta / v2 | No meaningful analytics history exists yet at closed-beta launch |
| LLC Authorized User — second tier (HR, other execs) | v2 | Closed beta uses single-tier (owner-only) access; all LLC data visible to all LLC Authorized Users for now |
| LLC-side analytics/reporting | v2 | Product-function priority over analytics at this stage; no historical data yet regardless |
| Drag-and-drop / customizable vesting schedule | v2 | Standard schedule (cliff + monthly vesting) sufficient for closed beta; only schedule *length* is owner-editable |

### From the Dev Prep Schedule
| Item | Deferred to | Rationale |
|---|---|---|
| CPA firm view | Post-closed-beta (CPA channel not active until later GTM phase) | CPAs are not part of closed beta |
| Due-date tracking on analyst review | v2 | No real turnaround-time data exists yet to inform reasonable defaults |
| Usage/product analytics infrastructure | v2 | Architecture kept normalized/decoupled to allow future addition without retrofitting |

### Explicitly Out of Scope — Long-Term Product Ideas (not v2, not near-term)
| Item | Status |
|---|---|
| "Aequi for Analysts" — standalone valuation copilot for CVA/ASA/ABV analysts' independent clients, outside phantom equity | Long-term idea, far future. Not on any current roadmap. |
| Act 3 / M&A marketplace — Aequi-facilitated business-owner buyouts, broker-fee model | Long-term "Act 3" thesis. Explicit conflict-of-interest risk (Carta/CartaX-adjacent) flagged. Not to be pitched to pre-seed investors. |

---

## Notes on the Algorithm Deferral (for external-facing use)
Aequi's valuation-algorithm differentiator is **not abandoned — sequenced.** Rationale, for use in investor/advisor conversations:
1. Faster closed-beta launch — avoids delay from stress-testing an unvalidated algorithm before any real engagement data exists.
2. Legal defensibility — algorithm will be co-designed directly with the analyst performing closed-beta valuations, informed by real engagement experience, before being scaled to future "Aequi Network" analysts.
3. Development begins immediately following MVP completion — this is treated as one of Aequi's most valuable, differentiating future products, not a shelved feature.

---

## Open Items Created by This Scope (tracked, not yet resolved)
1. Cost of funding full manual valuations per closed-beta LLC — not yet reflected in the burn model.
2. Attorney-drafted contract template — required before December closed-beta enrollment.
3. If "the algorithm" has already been described externally as live-for-closed-beta (investor conversations, CEP, etc.), Nicholas needs to align external materials with this sequencing.

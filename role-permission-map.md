# Aequi — Role/Permission Map
*Closed beta scope. Companion to the Data Model and Process Flow docs.*

## Roles (4, closed beta)
1. **LLC Owner** (single-tier Authorized User — HR/secondary tier deferred)
2. **Employee**
3. **Analyst** (single analyst for closed beta; CVA/ASA/ABV credentialed)
4. **Platform Admin** (Chris/Nicholas)

---

## LLC Owner

| Resource | Access |
|---|---|
| Own LLC's employee list | View (full) |
| Employee vesting schedules | View (full) |
| Employee financial/comp info (grant, strike price, units) | View (full) |
| Employee internal DMs / messages | No access |
| Grant creation | Create / Edit (initiates grants) |
| Contract terms (own LLC) | View, initiate revision requests |
| Valuation history (own LLC) | View (full) |
| Draft valuation (preliminary, pre-certification) | View only — cannot edit or certify |
| Certified valuation | View (full) |
| Analyst identity / credentials | View (basic — name, credential type) |
| Analyst-LLC engagement status | View (full) |
| Other LLCs' data (any) | No access |
| Subscription/plan settings | View, edit (own LLC) |

---

## Employee

| Resource | Access |
|---|---|
| Own vesting schedule | View (full) |
| Own grant details (units, strike price, contract) | View (full) |
| Own certified valuation history | View (full) |
| Own draft (preliminary) valuation | View only, read-only, marked as preliminary |
| Other employees' grant/vesting/financial data | No access |
| Contract terms (own) | View; accept/reject during formation or revision |
| LLC aggregate financials | No access |
| Analyst identity | View (basic, if actively engaged in a review touching their data) |
| Internal DMs (own) | Full access (send/receive) |
| Employee-to-employee data | No access |

---

## Analyst

| Resource | Access |
|---|---|
| Assigned LLC's financial data (relevant to active engagement) | View (full, engagement-scoped) |
| Assigned LLC's employee-level equity data | View (full, engagement-scoped) |
| Draft valuation (algorithm output) | View (full) — required input to their review |
| Valuation certification | **Certify** — unique to this role; must reflect independent judgment, not a rubber stamp on the draft |
| Non-assigned LLCs' data | No access |
| Employee internal DMs | No access |
| Own credentials/CE status | View, edit (submit updates) |
| Engagement status (own engagements) | View (full), progress through lifecycle stages |
| Other analysts' engagements | No access |
| Compensation/payout status (own) | View |

---

## Platform Admin

| Resource | Access |
|---|---|
| All LLCs' data | View (full) |
| All employees' data (including names) | View (full) — for support/dispute resolution |
| All analysts' data and credentials | View (full) |
| Analyst credential verification | **Verify** — unique to this role; manual verification gate for closed beta |
| Draft or certified valuations (any LLC) | View (full) |
| Cross-LLC aggregate analytics | View (full) |
| Internal DMs (any user) | No access (not a support/moderation feature in closed beta scope) |
| Grant creation | No access (not their action — LLC Owner-initiated only) |
| Valuation certification | No access (Analyst-only, by design — Admin cannot certify) |
| Engagement lifecycle status (any) | View (full); manual override only for support/dispute resolution |

---

## Notes / Open Items
- **Internal DMs**: no role except the message's own sender/recipient can view them in closed beta. If a support/moderation need arises later (e.g., dispute resolution requiring DM review), this is a deferred access-control decision, not yet designed.
- **Certify vs. Verify**: these are deliberately distinct, role-exclusive actions. Certify (Analyst) = professional judgment on a valuation. Verify (Platform Admin) = credential/identity confirmation. Neither role can perform the other's exclusive action — this separation is part of what keeps the certification defensible (per the CVA Methodology Review flag).
- **HR/secondary LLC user tier**: deferred, not in this map. When added, will need its own row set — likely narrower than full LLC Owner access.

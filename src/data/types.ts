// Aequi — Entity Type Definitions
// All types for the closed-beta data model. Screens import these for type safety.

// ---------------------------------------------------------------------------
// Enums / Unions
// ---------------------------------------------------------------------------

export type EmploymentStatus = "active" | "terminated" | "resigned";

export type SubscriptionPlan = "Starter" | "Growth" | "Enterprise";

export type CredentialType = "CVA" | "ASA" | "ABV";

export type VerificationStatus = "verified" | "pending" | "rejected";

/**
 * Full Analyst-LLC Engagement lifecycle.
 * The "Draft Valuation Generated" stage is included even though the
 * valuation algorithm is not built yet — the schema leaves room for it.
 */
export type EngagementStage =
  | "Requested"
  | "Matching"
  | "Analyst Accepted"
  | "Contract Signed"
  | "Confirmed/Active"
  | "Draft Valuation Generated"
  | "Analyst Review"
  | "Certified"
  | "Compensation";

// ---------------------------------------------------------------------------
// Valuation History (embedded in LLC, referenced by Grants)
// ---------------------------------------------------------------------------

export interface ValuationEvent {
  date: string; // ISO date
  valuationAmount: number; // total company valuation in USD
  resultingStrikePrice: number; // per-unit strike price derived from this valuation
  analystId: string; // analyst who performed the valuation
  cpaFirm: string | null; // CPA firm name, if applicable
  documentName: string; // certified valuation document reference
}

// ---------------------------------------------------------------------------
// Vesting Schedule
// ---------------------------------------------------------------------------

export interface VestingSchedule {
  /** Standard schedule: 1-year cliff + monthly vesting thereafter. */
  scheduleType: "standard"; // closed beta only supports standard
  grantDate: string; // ISO date — start of vesting
  cliffDate: string; // ISO date — 1 year after grant date
  vestingCompletionDate: string; // ISO date — end of vesting
  scheduleLengthMonths: number; // total vesting period (owner may edit this only)
  monthlyVestingRate: number; // units vested per month after cliff
}

// ---------------------------------------------------------------------------
// Equity Grant (embedded in Employee)
// ---------------------------------------------------------------------------

export interface EquityGrant {
  unitsAwarded: number;
  strikePricePerUnit: number; // derived from LLC's valuation history at grant date
  grantDate: string; // ISO date
  contractDocumentName: string; // placeholder contract reference
  vesting: VestingSchedule;
  currentVestedAmount: number; // units vested as of today
  currentPayoutValue: number; // vested units × current strike price
}

// ---------------------------------------------------------------------------
// Employee
// ---------------------------------------------------------------------------

export interface Employee {
  id: string;
  name: string;
  roleOrPosition: string;
  tenureYears: number;
  employmentStatus: EmploymentStatus;
  terminationDate: string | null; // ISO date or null if active
  llcId: string; // belongs to one LLC
  w2Salary: number; // pre-equity annual salary
  grant: EquityGrant | null; // null if no grant yet
}

// ---------------------------------------------------------------------------
// LLC
// ---------------------------------------------------------------------------

export interface LLC {
  id: string;
  name: string;
  industry: string;
  employeeCount: number;
  dateOnboarded: string; // ISO date
  subscriptionPlan: SubscriptionPlan;
  equityPoolPercent: number; // % of company allocated to phantom equity pool
  totalUnitsAuthorized: number;
  unitsIssued: number;
  valuationHistory: ValuationEvent[];
  assignedAnalystId: string | null;
}

// ---------------------------------------------------------------------------
// LLC Authorized User (single tier — owner only for closed beta)
// ---------------------------------------------------------------------------

export interface LLCAuthorizedUser {
  id: string;
  name: string;
  titleOrPosition: string;
  llcId: string; // linked to one LLC
  permissionTier: "owner"; // closed beta = single tier
}

// ---------------------------------------------------------------------------
// Analyst
// ---------------------------------------------------------------------------

export interface Analyst {
  id: string;
  name: string;
  credentialType: CredentialType;
  yearsOfExperience: number;
  verificationStatus: VerificationStatus;
  credentialExpirationDate: string; // ISO date
  credentialDocumentName: string;
}

// ---------------------------------------------------------------------------
// Analyst-LLC Engagement
// ---------------------------------------------------------------------------

export interface AnalystLLCEngagement {
  id: string;
  analystId: string;
  llcId: string;
  currentStage: EngagementStage;
  requestDate: string; // ISO date — when LLC signaled need
  notificationDate: string | null; // when pushed to analyst
  acceptanceDate: string | null; // when analyst accepted
  contractSignedDate: string | null;
  financialsReceivedDate: string | null;
  draftGeneratedDate: string | null; // algorithm output — not built yet, but field exists
  reviewOutcome: string | null; // analyst's review notes
  certificationDate: string | null;
  compensationAmount: number | null;
  compensationDate: string | null;
  compensationStatus: "pending" | "paid" | "failed" | null;
}

// ---------------------------------------------------------------------------
// Unit Holder Segment (for equity pool chart)
// ---------------------------------------------------------------------------

export interface UnitHolderSegment {
  label: string; // employee name or "Other / Unallocated"
  employeeId?: string; // set for real employees so screens can link to their pages
  role: string | null; // employee role, null for unallocated
  units: number;
  percentOfPool: number; // share of total issued units
}

// ---------------------------------------------------------------------------
// Platform Admin (closed beta: Chris and Nicholas)
// ---------------------------------------------------------------------------

export interface PlatformAdmin {
  id: string;
  name: string;
}

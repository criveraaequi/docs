// Aequi — Mock Data (Closed Beta Seed Records)
// All data is mock/scaffold. No real business data.
// Screens call query functions (mockApi.ts), never this file directly.

import type {
  Analyst,
  AnalystLLCEngagement,
  Employee,
  LLCAuthorizedUser,
  LLC,
  PlatformAdmin,
} from "./types";

// ---------------------------------------------------------------------------
// LLCs — two Main Street companies
// ---------------------------------------------------------------------------

export const mockLLCs: LLC[] = [
  {
    id: "llc-1",
    name: "Summit HVAC Solutions LLC",
    industry: "HVAC",
    employeeCount: 24,
    dateOnboarded: "2025-06-15",
    subscriptionPlan: "Growth",
    equityPoolPercent: 10,
    totalUnitsAuthorized: 50000,
    unitsIssued: 12000,
    valuationHistory: [
      {
        date: "2025-06-20",
        valuationAmount: 4_200_000,
        resultingStrikePrice: 84.0,
        analystId: "analyst-1",
        cpaFirm: "Cho & Associates CPA PLLC",
        documentName: "Summit_HVAC_Valuation_2025-06.pdf",
      },
      {
        date: "2026-01-15",
        valuationAmount: 4_850_000,
        resultingStrikePrice: 97.0,
        analystId: "analyst-1",
        cpaFirm: "Cho & Associates CPA PLLC",
        documentName: "Summit_HVAC_Valuation_2026-01.pdf",
      },
    ],
    assignedAnalystId: "analyst-1",
  },
  {
    id: "llc-2",
    name: "Ironclad Construction Group LLC",
    industry: "Construction",
    employeeCount: 38,
    dateOnboarded: "2025-09-01",
    subscriptionPlan: "Enterprise",
    equityPoolPercent: 15,
    totalUnitsAuthorized: 80000,
    unitsIssued: 20000,
    valuationHistory: [
      {
        date: "2025-09-10",
        valuationAmount: 7_100_000,
        resultingStrikePrice: 88.75,
        analystId: "analyst-1",
        cpaFirm: "Cho & Associates CPA PLLC",
        documentName: "Ironclad_Valuation_2025-09.pdf",
      },
    ],
    assignedAnalystId: "analyst-1",
  },
];

// ---------------------------------------------------------------------------
// LLC Authorized Users — one owner per LLC (single tier for closed beta)
// ---------------------------------------------------------------------------

export const mockAuthorizedUsers: LLCAuthorizedUser[] = [
  {
    id: "user-1",
    name: "Marcus Reeves",
    titleOrPosition: "Owner / CEO",
    llcId: "llc-1",
    permissionTier: "owner",
  },
  {
    id: "user-2",
    name: "Diana Cole",
    titleOrPosition: "Owner / President",
    llcId: "llc-2",
    permissionTier: "owner",
  },
];

// ---------------------------------------------------------------------------
// Employees — 5 employees across the two LLCs, various vesting stages
// ---------------------------------------------------------------------------

export const mockEmployees: Employee[] = [
  // --- Summit HVAC Solutions (llc-1) ---
  {
    id: "emp-1",
    name: "James Whitfield",
    roleOrPosition: "Lead HVAC Technician",
    tenureYears: 4.5,
    employmentStatus: "active",
    terminationDate: null,
    llcId: "llc-1",
    w2Salary: 72_000,
    grant: {
      unitsAwarded: 1000,
      strikePricePerUnit: 84.0,
      grantDate: "2025-07-01",
      contractDocumentName: "Summit_HVAC_Whitfield_Contract.pdf",
      vesting: {
        scheduleType: "standard",
        grantDate: "2025-07-01",
        cliffDate: "2026-07-01",
        vestingCompletionDate: "2028-07-01",
        scheduleLengthMonths: 36,
        monthlyVestingRate: 27.78, // (1000 / 36) per month after cliff
      },
      currentVestedAmount: 0, // still in cliff period
      currentPayoutValue: 0,
    },
  },
  {
    id: "emp-2",
    name: "Sofia Martinez",
    roleOrPosition: "Operations Manager",
    tenureYears: 6.0,
    employmentStatus: "active",
    terminationDate: null,
    llcId: "llc-1",
    w2Salary: 85_000,
    grant: {
      unitsAwarded: 1500,
      strikePricePerUnit: 84.0,
      grantDate: "2024-03-01",
      contractDocumentName: "Summit_HVAC_Martinez_Contract.pdf",
      vesting: {
        scheduleType: "standard",
        grantDate: "2024-03-01",
        cliffDate: "2025-03-01",
        vestingCompletionDate: "2027-03-01",
        scheduleLengthMonths: 36,
        monthlyVestingRate: 41.67, // (1500 / 36) per month after cliff
      },
      currentVestedAmount: 500, // ~12 months past cliff
      currentPayoutValue: 48_500, // 500 × current strike price (97.0)
    },
  },
  {
    id: "emp-3",
    name: "Tyler Brennan",
    roleOrPosition: "Apprentice Technician",
    tenureYears: 1.5,
    employmentStatus: "terminated",
    terminationDate: "2026-06-30",
    llcId: "llc-1",
    w2Salary: 48_000,
    grant: {
      unitsAwarded: 500,
      strikePricePerUnit: 84.0,
      grantDate: "2025-01-15",
      contractDocumentName: "Summit_HVAC_Brennan_Contract.pdf",
      vesting: {
        scheduleType: "standard",
        grantDate: "2025-01-15",
        cliffDate: "2026-01-15",
        vestingCompletionDate: "2028-01-15",
        scheduleLengthMonths: 36,
        monthlyVestingRate: 13.89,
      },
      currentVestedAmount: 167, // ~6 months vested post-cliff before termination
      currentPayoutValue: 16_199, // 167 × 97.0
    },
  },
  // --- Ironclad Construction Group (llc-2) ---
  {
    id: "emp-4",
    name: "Robert Nakamura",
    roleOrPosition: "Senior Project Manager",
    tenureYears: 8.0,
    employmentStatus: "active",
    terminationDate: null,
    llcId: "llc-2",
    w2Salary: 95_000,
    grant: {
      unitsAwarded: 2000,
      strikePricePerUnit: 88.75,
      grantDate: "2025-10-01",
      contractDocumentName: "Ironclad_Nakamura_Contract.pdf",
      vesting: {
        scheduleType: "standard",
        grantDate: "2025-10-01",
        cliffDate: "2026-10-01",
        vestingCompletionDate: "2029-10-01",
        scheduleLengthMonths: 48,
        monthlyVestingRate: 41.67, // (2000 / 48) per month after cliff
      },
      currentVestedAmount: 0, // still in cliff period
      currentPayoutValue: 0,
    },
  },
  {
    id: "emp-5",
    name: "Aisha Johnson",
    roleOrPosition: "Site Supervisor",
    tenureYears: 3.5,
    employmentStatus: "active",
    terminationDate: null,
    llcId: "llc-2",
    w2Salary: 78_000,
    grant: {
      unitsAwarded: 1200,
      strikePricePerUnit: 88.75,
      grantDate: "2024-06-01",
      contractDocumentName: "Ironclad_Johnson_Contract.pdf",
      vesting: {
        scheduleType: "standard",
        grantDate: "2024-06-01",
        cliffDate: "2025-06-01",
        vestingCompletionDate: "2027-06-01",
        scheduleLengthMonths: 36,
        monthlyVestingRate: 33.33, // (1200 / 36) per month after cliff
      },
      currentVestedAmount: 466, // ~14 months past cliff
      currentPayoutValue: 41_357, // 466 × 88.75
    },
  },
];

// ---------------------------------------------------------------------------
// Analyst — single analyst for closed beta
// ---------------------------------------------------------------------------

export const mockAnalysts: Analyst[] = [
  {
    id: "analyst-1",
    name: "Dr. Eleanor Cho",
    credentialType: "CVA",
    yearsOfExperience: 12,
    verificationStatus: "verified",
    credentialExpirationDate: "2027-12-31",
    credentialDocumentName: "Cho_CVA_Credential.pdf",
  },
];

// ---------------------------------------------------------------------------
// Analyst-LLC Engagements
// ---------------------------------------------------------------------------

export const mockEngagements: AnalystLLCEngagement[] = [
  {
    id: "eng-1",
    analystId: "analyst-1",
    llcId: "llc-1",
    currentStage: "Analyst Review",
    requestDate: "2026-07-01",
    notificationDate: "2026-07-02",
    acceptanceDate: "2026-07-05",
    contractSignedDate: "2026-07-10",
    financialsReceivedDate: "2026-07-15",
    draftGeneratedDate: "2026-08-01", // algorithm not built — field exists for future
    reviewOutcome: null,
    certificationDate: null,
    compensationAmount: null,
    compensationDate: null,
    compensationStatus: null,
  },
  {
    id: "eng-2",
    analystId: "analyst-1",
    llcId: "llc-2",
    currentStage: "Confirmed/Active",
    requestDate: "2026-08-01",
    notificationDate: "2026-08-02",
    acceptanceDate: "2026-08-05",
    contractSignedDate: "2026-08-10",
    financialsReceivedDate: "2026-08-20",
    draftGeneratedDate: null,
    reviewOutcome: null,
    certificationDate: null,
    compensationAmount: null,
    compensationDate: null,
    compensationStatus: null,
  },
];

// ---------------------------------------------------------------------------
// Platform Admins — Chris and Nicholas
// ---------------------------------------------------------------------------

export const mockPlatformAdmins: PlatformAdmin[] = [
  { id: "admin-1", name: "Chris" },
  { id: "admin-2", name: "Nicholas" },
];

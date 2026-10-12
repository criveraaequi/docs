// Aequi — Mock Data (Closed Beta Seed Records)
// All data is mock/scaffold. No real business data.
// Screens call query functions (mockApi.ts), never this file directly.

import type {
  Analyst,
  AnalystLLCEngagement,
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
    unitsIssued: 4950, // equals total units granted across all 9 Summit holders
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
// Employees — now DB-backed (employees table, seeded via migration).
// mockEmployees is retired; employee queries read from employeeStore instead.
// ---------------------------------------------------------------------------

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

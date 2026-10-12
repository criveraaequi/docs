// Aequi — Mock API Query Functions
// Screens call these functions. They return mock data now; later they can
// be swapped to Supabase queries without changing any screen code.

import type {
  Analyst,
  AnalystLLCEngagement,
  EngagementStage,
  PlatformAdmin,
  UnitHolderSegment,
  ValuationEvent,
} from "./types";
import {
  getEmployeeRecords,
  getEmployeeRecordById,
  getEmployeeRecordsForLLC,
  type EmployeeRecord,
} from "./employeeStore";
import {
  mockAnalysts,
  mockAuthorizedUsers,
  mockEngagements,
  mockLLCs,
  mockPlatformAdmins,
} from "./mockData";
import { getEffectivePool, getGrantsForEmployee } from "./grantStore";
import type { Employee, LLCAuthorizedUser, LLC } from "./types";
import {
  employeeVestedPayout,
  employeeVestedUnits,
  fullMonthsBetween,
  strikePriceAt,
  todayIso,
} from "./vesting";

// ---------------------------------------------------------------------------
// LLC queries
// ---------------------------------------------------------------------------

/** Returns details for a single LLC by ID. */
export function getLLCDetails(llcId: string): LLC | null {
  return mockLLCs.find((llc) => llc.id === llcId) ?? null;
}

/** Returns all LLCs (Platform Admin view). */
export function getAllLLCs(): LLC[] {
  return mockLLCs;
}

/** Returns the valuation history timeline for an LLC. */
export function getValuationHistory(llcId: string): ValuationEvent[] {
  const llc = getLLCDetails(llcId);
  return llc?.valuationHistory ?? [];
}

/** Returns the most recent valuation event for an LLC. */
export function getLatestValuation(llcId: string): ValuationEvent | null {
  const history = getValuationHistory(llcId);
  if (history.length === 0) return null;
  return history[history.length - 1];
}

/** Returns the current strike price (from most recent valuation) for an LLC. */
export function getCurrentStrikePrice(llcId: string): number | null {
  const latest = getLatestValuation(llcId);
  return latest?.resultingStrikePrice ?? null;
}

// ---------------------------------------------------------------------------
// Employee / Grant queries
// ---------------------------------------------------------------------------

/** Maps a DB employee record to the Employee shape screens use. */
function recordToEmployee(record: EmployeeRecord): Employee {
  return {
    id: record.id,
    name: record.name,
    roleOrPosition: record.roleOrPosition,
    tenureYears: Math.round((fullMonthsBetween(record.startDate, todayIso()) / 12) * 10) / 10,
    employmentStatus: record.employmentStatus,
    terminationDate: record.terminationDate,
    llcId: record.llcId,
    w2Salary: record.w2Salary,
    grant: null, // attached below from valuation snapshot
  };
}

/**
 * Returns all employees for a given LLC (LLC Owner view).
 * Seeded grant details come from the LLC's valuation snapshot (strike price
 * from the latest valuation at grant time); vested amounts and payout values
 * are computed live from each grant's schedule and the LLC's valuation
 * history, so they stay correct as time passes.
 */
export function getEmployeesByLLC(llcId: string): Employee[] {
  const llc = getLLCDetails(llcId);
  return getEmployeeRecordsForLLC(llcId)
    .map(recordToEmployee)
    .map((emp) => withSeedGrant(emp, llc))
    .map((emp) => withLiveVesting(emp));
}

/** Returns a single employee by ID. */
export function getEmployee(employeeId: string): Employee | null {
  const record = getEmployeeRecordById(employeeId);
  if (!record) return null;
  const emp = withSeedGrant(recordToEmployee(record), getLLCDetails(record.llcId));
  return withLiveVesting(emp);
}

/** Returns all employees across all LLCs (Platform Admin view). */
export function getAllEmployees(): Employee[] {
  return getEmployeeRecords().map((record) =>
    withLiveVesting(
      withSeedGrant(recordToEmployee(record), getLLCDetails(record.llcId))
    )
  );
}

/** Returns all employees with grants for a given LLC. */
export function getEmployeeGrants(llcId: string): Employee[] {
  return getEmployeesByLLC(llcId).filter((emp) => emp.grant !== null);
}

/**
 * Returns all unit holders plus one combined remainder segment.
 * Percentages are shares of the LLC's phantom equity pool, so each holder's
 * segment width in the pool bar matches its listed percentage. Unissued pool
 * capacity remains visible as "Other / Unallocated".
 */
export function getTopUnitHolders(
  llcId: string,
  limit = 3
): UnitHolderSegment[] {
  const llc = getLLCDetails(llcId);
  if (!llc) return [];

  const effectivePool = getEffectivePool(llcId);
  const poolUnits = (effectivePool.equityPoolPercent / 100) * effectivePool.totalUnitsAuthorized;
  const employees = getEmployeeGrants(llcId)
    .map((employee) => {
      // Seeded grant plus signed runtime grants for this employee.
      const runtimeUnits = getGrantsForEmployee(employee.id)
        .filter((grant) => grant.llcId === llcId && grant.status === "active")
        .reduce((sum, grant) => sum + grant.unitsAwarded, 0);
      return { employee, units: (employee.grant?.unitsAwarded ?? 0) + runtimeUnits };
    })
    .filter((entry) => entry.units > 0)
    .sort((a, b) => b.units - a.units)
    .slice(0, limit);
  const topUnits = employees.reduce(
    (total, entry) => total + entry.units,
    0
  );
  const remainderUnits = Math.max(poolUnits - topUnits, 0);

  const segments: UnitHolderSegment[] = employees.map(({ employee, units }) => ({
    label: employee.name,
    employeeId: employee.id,
    role: employee.roleOrPosition,
    units,
    percentOfPool: (units / poolUnits) * 100,
  }));

  if (remainderUnits > 0) {
    segments.push({
      label: "Other / Unallocated",
      role: null,
      units: remainderUnits,
      percentOfPool: (remainderUnits / poolUnits) * 100,
    });
  }

  return segments;
}

/**
 * Seed grant definitions: the demo awards each employee holds at first load.
 * Grant dates/cliffs/completions mirror the original seed data so vesting
 * progress matches what the owner dashboard has always shown.
 */
const SEED_GRANTS: Record<
  string,
  {
    unitsAwarded: number;
    grantDate: string;
    cliffDate: string;
    vestingCompletionDate: string;
    scheduleLengthMonths: number;
    contractDocumentName: string;
  }
> = {
  "emp-1": { unitsAwarded: 1000, grantDate: "2025-07-01", cliffDate: "2026-07-01", vestingCompletionDate: "2028-07-01", scheduleLengthMonths: 36, contractDocumentName: "Summit_HVAC_Whitfield_Contract.pdf" },
  "emp-2": { unitsAwarded: 1500, grantDate: "2024-03-01", cliffDate: "2025-03-01", vestingCompletionDate: "2027-03-01", scheduleLengthMonths: 36, contractDocumentName: "Summit_HVAC_Martinez_Contract.pdf" },
  "emp-3": { unitsAwarded: 500, grantDate: "2025-01-15", cliffDate: "2026-01-15", vestingCompletionDate: "2028-01-15", scheduleLengthMonths: 36, contractDocumentName: "Summit_HVAC_Brennan_Contract.pdf" },
  "emp-4": { unitsAwarded: 2000, grantDate: "2025-10-01", cliffDate: "2026-10-01", vestingCompletionDate: "2029-10-01", scheduleLengthMonths: 48, contractDocumentName: "Ironclad_Nakamura_Contract.pdf" },
  "emp-5": { unitsAwarded: 1200, grantDate: "2024-06-01", cliffDate: "2025-06-01", vestingCompletionDate: "2027-06-01", scheduleLengthMonths: 36, contractDocumentName: "Ironclad_Johnson_Contract.pdf" },
  "emp-6": { unitsAwarded: 420, grantDate: "2024-05-10", cliffDate: "2025-05-10", vestingCompletionDate: "2027-05-10", scheduleLengthMonths: 36, contractDocumentName: "Summit_HVAC_Foster_Contract.pdf" },
  "emp-7": { unitsAwarded: 450, grantDate: "2024-11-20", cliffDate: "2025-11-20", vestingCompletionDate: "2028-11-20", scheduleLengthMonths: 48, contractDocumentName: "Summit_HVAC_Okafor_Contract.pdf" },
  "emp-8": { unitsAwarded: 210, grantDate: "2025-04-01", cliffDate: "2026-04-01", vestingCompletionDate: "2027-04-01", scheduleLengthMonths: 24, contractDocumentName: "Summit_HVAC_Raman_Contract.pdf" },
  "emp-9": { unitsAwarded: 380, grantDate: "2025-08-15", cliffDate: "2026-08-15", vestingCompletionDate: "2028-08-15", scheduleLengthMonths: 36, contractDocumentName: "Summit_HVAC_Salazar_Contract.pdf" },
  "emp-10": { unitsAwarded: 165, grantDate: "2025-12-01", cliffDate: "2026-12-01", vestingCompletionDate: "2027-12-01", scheduleLengthMonths: 24, contractDocumentName: "Summit_HVAC_Liu_Contract.pdf" },
  "emp-11": { unitsAwarded: 325, grantDate: "2024-02-01", cliffDate: "2025-02-01", vestingCompletionDate: "2027-02-01", scheduleLengthMonths: 36, contractDocumentName: "Summit_HVAC_Boyd_Contract.pdf" },
};

/**
 * Attaches the seeded grant (the employee's original phantom equity award) to
 * an employee record. Strike price is the certified price in effect at grant
 * date, derived from the LLC's valuation history.
 */
function withSeedGrant(employee: Employee, llc: LLC | null): Employee {
  const seed = SEED_GRANTS[employee.id];
  if (!seed || !llc) return employee;
  const strikePrice = strikePriceAt(llc.valuationHistory, seed.grantDate);
  employee.grant = {
    unitsAwarded: seed.unitsAwarded,
    strikePricePerUnit: strikePrice,
    grantDate: seed.grantDate,
    contractDocumentName: seed.contractDocumentName,
    vesting: {
      scheduleType: "standard",
      grantDate: seed.grantDate,
      cliffDate: seed.cliffDate,
      vestingCompletionDate: seed.vestingCompletionDate,
      scheduleLengthMonths: seed.scheduleLengthMonths,
      monthlyVestingRate: seed.unitsAwarded / Math.max(seed.scheduleLengthMonths - 12, 1),
      vestingTriggers: [],
      vestingSlowdowns: [],
    },
    currentVestedAmount: 0, // recomputed live in withLiveVesting
    currentPayoutValue: 0,
  };
  return employee;
}

/** Replaces seed vested amounts with schedule-derived values as of today. */
function withLiveVesting(employee: Employee): Employee {
  if (!employee.grant) return employee;
  const llc = mockLLCs.find((item) => item.id === employee.llcId);
  const history = llc?.valuationHistory ?? [];
  const units = employeeVestedUnits(employee);
  return {
    ...employee,
    grant: {
      ...employee.grant,
      currentVestedAmount: units,
      currentPayoutValue: employeeVestedPayout(employee, history),
    },
  };
}

/** Returns a single employee's grant details. */
export function getEmployeeGrant(
  employeeId: string
): Employee["grant"] | null {
  const emp = getEmployee(employeeId);
  return emp?.grant ?? null;
}

// ---------------------------------------------------------------------------
// LLC Authorized User queries
// ---------------------------------------------------------------------------

/** Returns the authorized user (owner) for a given LLC. */
export function getAuthorizedUser(llcId: string): LLCAuthorizedUser | null {
  return mockAuthorizedUsers.find((user) => user.llcId === llcId) ?? null;
}

/** Returns all authorized users (Platform Admin view). */
export function getAllAuthorizedUsers(): LLCAuthorizedUser[] {
  return mockAuthorizedUsers;
}

// ---------------------------------------------------------------------------
// Analyst queries
// ---------------------------------------------------------------------------

/** Returns all analysts. */
export function getAllAnalysts(): Analyst[] {
  return mockAnalysts;
}

/** Returns a single analyst by ID. */
export function getAnalyst(analystId: string): Analyst | null {
  return mockAnalysts.find((a) => a.id === analystId) ?? null;
}

/** Returns the analyst assigned to a given LLC. */
export function getAnalystForLLC(llcId: string): Analyst | null {
  const llc = getLLCDetails(llcId);
  if (!llc?.assignedAnalystId) return null;
  return getAnalyst(llc.assignedAnalystId);
}

// ---------------------------------------------------------------------------
// Analyst-LLC Engagement queries
// ---------------------------------------------------------------------------

/** Returns the engagement for a given LLC. */
export function getEngagementStatus(
  llcId: string
): AnalystLLCEngagement | null {
  return mockEngagements.find((eng) => eng.llcId === llcId) ?? null;
}

/** Returns all engagements (Platform Admin / Analyst view). */
export function getAllEngagements(): AnalystLLCEngagement[] {
  return mockEngagements;
}

/** Returns all engagements for a given analyst. */
export function getEngagementsByAnalyst(
  analystId: string
): AnalystLLCEngagement[] {
  return mockEngagements.filter((eng) => eng.analystId === analystId);
}

/** Returns the current lifecycle stage for a given LLC's engagement. */
export function getEngagementStage(llcId: string): EngagementStage | null {
  const eng = getEngagementStatus(llcId);
  return eng?.currentStage ?? null;
}

// ---------------------------------------------------------------------------
// Platform Admin queries
// ---------------------------------------------------------------------------

/** Returns all platform admins. */
export function getPlatformAdmins(): PlatformAdmin[] {
  return mockPlatformAdmins;
}

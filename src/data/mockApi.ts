// Aequi — Mock API Query Functions
// Screens call these functions. They return mock data now; later they can
// be swapped to Supabase queries without changing any screen code.

import type {
  Analyst,
  AnalystLLCEngagement,
  Employee,
  EngagementStage,
  LLCAuthorizedUser,
  LLC,
  PlatformAdmin,
  UnitHolderSegment,
  ValuationEvent,
} from "./types";
import {
  mockAnalysts,
  mockAuthorizedUsers,
  mockEmployees,
  mockEngagements,
  mockLLCs,
  mockPlatformAdmins,
} from "./mockData";

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

/** Returns all employees for a given LLC (LLC Owner view). */
export function getEmployeesByLLC(llcId: string): Employee[] {
  return mockEmployees.filter((emp) => emp.llcId === llcId);
}

/** Returns a single employee by ID. */
export function getEmployee(employeeId: string): Employee | null {
  return mockEmployees.find((emp) => emp.id === employeeId) ?? null;
}

/** Returns all employees across all LLCs (Platform Admin view). */
export function getAllEmployees(): Employee[] {
  return mockEmployees;
}

/** Returns all employees with grants for a given LLC. */
export function getEmployeeGrants(llcId: string): Employee[] {
  return mockEmployees.filter(
    (emp) => emp.llcId === llcId && emp.grant !== null
  );
}

/**
 * Returns the largest unit holders plus one combined remainder segment.
 * Percentages are based on total authorized units so unissued pool capacity
 * remains visible as "Other / Unallocated".
 */
export function getTopUnitHolders(
  llcId: string,
  limit = 3
): UnitHolderSegment[] {
  const llc = getLLCDetails(llcId);
  if (!llc) return [];

  const employees = getEmployeeGrants(llcId)
    .sort((a, b) => (b.grant?.unitsAwarded ?? 0) - (a.grant?.unitsAwarded ?? 0))
    .slice(0, limit);
  const topUnits = employees.reduce(
    (total, employee) => total + (employee.grant?.unitsAwarded ?? 0),
    0
  );
  const remainderUnits = Math.max(llc.totalUnitsAuthorized - topUnits, 0);
  const totalUnits = llc.totalUnitsAuthorized;

  const segments: UnitHolderSegment[] = employees.map((employee) => ({
    label: employee.name,
    employeeId: employee.id,
    role: employee.roleOrPosition,
    units: employee.grant?.unitsAwarded ?? 0,
    percentOfPool: ((employee.grant?.unitsAwarded ?? 0) / totalUnits) * 100,
  }));

  if (remainderUnits > 0) {
    segments.push({
      label: "Other / Unallocated",
      role: null,
      units: remainderUnits,
      percentOfPool: (remainderUnits / totalUnits) * 100,
    });
  }

  return segments;
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

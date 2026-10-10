// Aequi — Grant & pool store.
// Merges seeded demo data (mockData.ts) with rows created at runtime and
// persisted in Supabase (grants, pool_expansions, notifications). Seeded
// employees count toward the pool via unitsIssued; runtime grants are tracked
// as rows. Pool percent / authorized units live on the LLC seed but can be
// overridden by the latest approved pool expansion.

import { supabase } from "./supabaseClient";
import {
  mockEmployees,
  mockLLCs,
} from "./mockData";
import { todayIso } from "./vesting";
import type { Employee } from "./types";

export type GrantStatus = "pending" | "active";

export interface GrantRecord {
  id: string;
  llcId: string;
  employeeId: string;
  employeeName: string;
  employeeRole: string;
  unitsAwarded: number;
  strikePricePerUnit: number;
  grantDate: string;
  scheduleLengthMonths: number;
  cliffDate: string;
  vestingCompletionDate: string;
  monthlyVestingRate: number;
  contractDocumentName: string;
  status: GrantStatus;
  signedAt: string | null;
  createdAt: string;
}

export type ExpansionStatus = "pending" | "approved";

export interface PoolExpansionRecord {
  id: string;
  llcId: string;
  previousPercent: number;
  newPercent: number;
  previousAuthorizedUnits: number;
  newAuthorizedUnits: number;
  passcodeVerified: boolean;
  status: ExpansionStatus;
  createdAt: string;
  approvedAt: string | null;
}

export interface NotificationRecord {
  id: string;
  llcId: string | null;
  grantId: string | null;
  message: string;
  read: boolean;
  createdAt: string;
}

// --- Row <-> record mapping -------------------------------------------------

interface GrantRow {
  id: string;
  llc_id: string;
  employee_id: string;
  employee_name: string;
  employee_role: string;
  units_awarded: number;
  strike_price_per_unit: number;
  grant_date: string;
  schedule_length_months: number;
  cliff_date: string;
  vesting_completion_date: string;
  monthly_vesting_rate: number;
  contract_document_name: string;
  status: string;
  signed_at: string | null;
  created_at: string;
}

interface ExpansionRow {
  id: string;
  llc_id: string;
  previous_percent: number;
  new_percent: number;
  previous_authorized_units: number;
  new_authorized_units: number;
  passcode_verified: boolean;
  status: string;
  created_at: string;
  approved_at: string | null;
}

interface NotificationRow {
  id: string;
  llc_id: string | null;
  grant_id: string | null;
  message: string;
  read: boolean;
  created_at: string;
}

function toGrantRecord(row: GrantRow): GrantRecord {
  return {
    id: row.id,
    llcId: row.llc_id,
    employeeId: row.employee_id,
    employeeName: row.employee_name,
    employeeRole: row.employee_role,
    unitsAwarded: row.units_awarded,
    strikePricePerUnit: Number(row.strike_price_per_unit),
    grantDate: row.grant_date,
    scheduleLengthMonths: row.schedule_length_months,
    cliffDate: row.cliff_date,
    vestingCompletionDate: row.vesting_completion_date,
    monthlyVestingRate: Number(row.monthly_vesting_rate),
    contractDocumentName: row.contract_document_name,
    status: row.status as GrantStatus,
    signedAt: row.signed_at,
    createdAt: row.created_at,
  };
}

function toExpansionRecord(row: ExpansionRow): PoolExpansionRecord {
  return {
    id: row.id,
    llcId: row.llc_id,
    previousPercent: Number(row.previous_percent),
    newPercent: Number(row.new_percent),
    previousAuthorizedUnits: row.previous_authorized_units,
    newAuthorizedUnits: row.new_authorized_units,
    passcodeVerified: row.passcode_verified,
    status: row.status as ExpansionStatus,
    createdAt: row.created_at,
    approvedAt: row.approved_at,
  };
}

function toNotificationRecord(row: NotificationRow): NotificationRecord {
  return {
    id: row.id,
    llcId: row.llc_id,
    grantId: row.grant_id,
    message: row.message,
    read: row.read,
    createdAt: row.created_at,
  };
}

// --- Store ------------------------------------------------------------------

let grantsCache: GrantRecord[] | null = null;
let grantsPromise: Promise<GrantRecord[]> | null = null;
let expansionsCache: PoolExpansionRecord[] | null = null;
let expansionsPromise: Promise<PoolExpansionRecord[]> | null = null;
let notificationsCache: NotificationRecord[] | null = null;
let notificationsPromise: Promise<NotificationRecord[]> | null = null;

const listeners = new Set<() => void>();
let storeVersion = 0;

function notify() {
  storeVersion += 1;
  for (const listener of listeners) listener();
}

/** Monotonic version for useSyncExternalStore snapshots. */
export function getStoreVersion(): number {
  return storeVersion;
}

/** Subscribe to store changes (used by useGrantStore). Returns unsubscribe. */
export function subscribeStore(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

async function fetchGrants(): Promise<GrantRecord[]> {
  if (grantsCache) return grantsCache;
  if (!grantsPromise) {
    grantsPromise = (async () => {
      const { data, error } = await supabase
        .from("grants")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      grantsCache = (data as GrantRow[]).map(toGrantRecord);
      return grantsCache;
    })();
    grantsPromise.catch(() => {
      grantsPromise = null;
    });
  }
  return grantsPromise;
}

async function fetchExpansions(): Promise<PoolExpansionRecord[]> {
  if (expansionsCache) return expansionsCache;
  if (!expansionsPromise) {
    expansionsPromise = (async () => {
      const { data, error } = await supabase
        .from("pool_expansions")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      expansionsCache = (data as ExpansionRow[]).map(toExpansionRecord);
      return expansionsCache;
    })();
    expansionsPromise.catch(() => {
      expansionsPromise = null;
    });
  }
  return expansionsPromise;
}

async function fetchNotifications(): Promise<NotificationRecord[]> {
  if (notificationsCache) return notificationsCache;
  if (!notificationsPromise) {
    notificationsPromise = (async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      notificationsCache = (data as NotificationRow[]).map(toNotificationRecord);
      return notificationsCache;
    })();
    notificationsPromise.catch(() => {
      notificationsPromise = null;
    });
  }
  return notificationsPromise;
}

/** Load all store data. Call once at app start; safe to call repeatedly. */
export async function loadStore(): Promise<void> {
  await Promise.all([fetchGrants(), fetchExpansions(), fetchNotifications()]);
  notify();
}

// --- Grants -----------------------------------------------------------------

/** Runtime grants for an LLC, newest first. */
export function getGrantsForLLC(llcId: string): GrantRecord[] {
  return (grantsCache ?? [])
    .filter((grant) => grant.llcId === llcId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** All runtime grants for an employee, newest first. */
export function getGrantsForEmployee(employeeId: string): GrantRecord[] {
  return (grantsCache ?? [])
    .filter((grant) => grant.employeeId === employeeId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getGrantById(grantId: string): GrantRecord | null {
  return grantsCache?.find((grant) => grant.id === grantId) ?? null;
}

export async function createGrant(input: {
  llcId: string;
  employeeId: string;
  unitsAwarded: number;
  strikePricePerUnit: number;
  scheduleLengthMonths: number;
}): Promise<GrantRecord> {
  const employee = mockEmployees.find((emp) => emp.id === input.employeeId);
  if (!employee) throw new Error("Employee not found");

  const grantDate = todayIso();
  const cliff = new Date(grantDate);
  cliff.setFullYear(cliff.getFullYear() + 1);
  const completion = new Date(grantDate);
  completion.setMonth(completion.getMonth() + input.scheduleLengthMonths);

  const row = {
    llc_id: input.llcId,
    employee_id: input.employeeId,
    employee_name: employee.name,
    employee_role: employee.roleOrPosition,
    units_awarded: input.unitsAwarded,
    strike_price_per_unit: input.strikePricePerUnit,
    grant_date: grantDate,
    schedule_length_months: input.scheduleLengthMonths,
    cliff_date: cliff.toISOString().slice(0, 10),
    vesting_completion_date: completion.toISOString().slice(0, 10),
    monthly_vesting_rate: input.unitsAwarded / Math.max(input.scheduleLengthMonths - 12, 1),
    contract_document_name: `Aequi_Grant_${employee.name.replace(/\s+/g, "_")}_${grantDate.replace(/-/g, "")}.pdf`,
    status: "pending" as const,
  };

  const { data, error } = await supabase.from("grants").insert(row).select("*").single();
  if (error) throw error;
  const record = toGrantRecord(data as GrantRow);
  grantsCache = [...(grantsCache ?? []), record];
  notify();
  return record;
}

/** Simulated employee signature: pending -> active, plus bell notification. */
export async function signGrant(grantId: string): Promise<void> {
  const grant = getGrantById(grantId);
  if (!grant || grant.status !== "pending") return;

  const signedAt = new Date().toISOString();
  const { error } = await supabase
    .from("grants")
    .update({ status: "active", signed_at: signedAt })
    .eq("id", grantId);
  if (error) throw error;

  grantsCache = (grantsCache ?? []).map((grant) =>
    grant.id === grantId ? { ...grant, status: "active" as const, signedAt } : grant
  );

  const notification = {
    llc_id: grant.llcId,
    grant_id: grant.id,
    message: `${grant.employeeName} signed the Equity Agreement Contract`,
  };
  const { data, error: notificationError } = await supabase
    .from("notifications")
    .insert(notification)
    .select("*")
    .single();
  if (!notificationError && data) {
    notificationsCache = [toNotificationRecord(data as NotificationRow), ...(notificationsCache ?? [])];
  }
  notify();
}

// --- Pool -------------------------------------------------------------------

// Seeded base state for llc-1.
const LLC_BASE: Record<string, { equityPoolPercent: number; totalUnitsAuthorized: number }> = {
  "llc-1": { equityPoolPercent: 10, totalUnitsAuthorized: 50000 },
  "llc-2": { equityPoolPercent: 15, totalUnitsAuthorized: 80000 },
};

/**
 * Effective pool percent + authorized units for an LLC, after applying the
 * latest approved expansion (if any).
 */
export function getEffectivePool(llcId: string): {
  equityPoolPercent: number;
  totalUnitsAuthorized: number;
} {
  const base = LLC_BASE[llcId] ?? mockLLCs.find((llc) => llc.id === llcId);
  if (!base) return { equityPoolPercent: 0, totalUnitsAuthorized: 0 };
  const approved = (expansionsCache ?? [])
    .filter((expansion) => expansion.llcId === llcId && expansion.status === "approved")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  if (!approved) return base;
  return {
    equityPoolPercent: approved.newPercent,
    totalUnitsAuthorized: approved.newAuthorizedUnits,
  };
}

/**
 * Units allocated from the pool: seeded unitsIssued + signed runtime grants.
 * Pending grants and pending expansions do not count.
 */
export function getPoolAllocatedUnits(llcId: string): number {
  const baseIssued = mockLLCs.find((llc) => llc.id === llcId)?.unitsIssued ?? 0;
  const signedRuntime = (grantsCache ?? [])
    .filter((grant) => grant.llcId === llcId && grant.status === "active")
    .reduce((sum, grant) => sum + grant.unitsAwarded, 0);
  return baseIssued + signedRuntime;
}

/** Units pending employee signature (do not consume the pool). */
export function getPoolPendingUnits(llcId: string): number {
  return (grantsCache ?? [])
    .filter((grant) => grant.llcId === llcId && grant.status === "pending")
    .reduce((sum, grant) => sum + grant.unitsAwarded, 0);
}

// --- Pool expansions ----------------------------------------------------------

/** All expansions for an LLC, newest first (pending + approved). */
export function getExpansionsForLLC(llcId: string): PoolExpansionRecord[] {
  return (expansionsCache ?? [])
    .filter((expansion) => expansion.llcId === llcId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Placeholder verification passcode for the closed beta. */
export const EXPANSION_PASSCODE = "1234";

export async function createPoolExpansion(input: {
  llcId: string;
  newPercent: number;
}): Promise<PoolExpansionRecord> {
  const current = getEffectivePool(input.llcId);
  const poolSize = (current.equityPoolPercent / 100) * current.totalUnitsAuthorized;
  const newPoolSize = (input.newPercent / 100) * current.totalUnitsAuthorized;

  const row = {
    llc_id: input.llcId,
    previous_percent: current.equityPoolPercent,
    new_percent: input.newPercent,
    previous_authorized_units: Math.round(poolSize),
    new_authorized_units: Math.round(newPoolSize),
    passcode_verified: true,
    status: "pending" as const,
  };

  const { data, error } = await supabase.from("pool_expansions").insert(row).select("*").single();
  if (error) throw error;
  const record = toExpansionRecord(data as ExpansionRow);
  expansionsCache = [...(expansionsCache ?? []), record];
  notify();
  return record;
}

/** Simulated approval of a pool expansion. */
export async function approvePoolExpansion(expansionId: string): Promise<void> {
  const approvedAt = new Date().toISOString();
  const { error } = await supabase
    .from("pool_expansions")
    .update({ status: "approved", approved_at: approvedAt })
    .eq("id", expansionId);
  if (error) throw error;
  expansionsCache = (expansionsCache ?? []).map((expansion) =>
    expansion.id === expansionId ? { ...expansion, status: "approved" as const, approvedAt } : expansion
  );
  notify();
}

// --- Notifications ------------------------------------------------------------

export function getNotifications(llcId?: string): NotificationRecord[] {
  const all = notificationsCache ?? [];
  return llcId ? all.filter((n) => n.llcId === llcId || n.llcId === null) : all;
}

export function getUnreadCount(llcId?: string): number {
  return getNotifications(llcId).filter((n) => !n.read).length;
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase.from("notifications").update({ read: true }).eq("id", id);
  if (error) throw error;
  notificationsCache = (notificationsCache ?? []).map((n) =>
    n.id === id ? { ...n, read: true } : n
  );
  notify();
}

// --- Employees (seed + runtime merge) -------------------------------------------

/**
 * All seeded employees for an LLC. Runtime grants do not change the employee
 * record itself — they attach via getGrantsForEmployee.
 */
export function getSeededEmployees(llcId: string): Employee[] {
  return mockEmployees.filter((emp) => emp.llcId === llcId);
}

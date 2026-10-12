// Aequi — Employee store.
// Runtime employee records persisted in Supabase (employees table), fetched
// once at app start and cached in memory, mirroring grantStore's pattern.
// Screens never touch Supabase directly — they call these functions.

import { supabase } from "./supabaseClient";

export type EmployeeStatus = "active" | "terminated" | "resigned";

export interface EmployeeRecord {
  id: string;
  llcId: string;
  name: string;
  roleOrPosition: string;
  startDate: string;
  employmentStatus: EmployeeStatus;
  terminationDate: string | null;
  /** false = onboarded without equity yet (excluded from the portal for this build) */
  hasEquity: boolean;
  w2Salary: number;
  createdAt: string;
}

interface EmployeeRow {
  id: string;
  llc_id: string;
  name: string;
  role_or_position: string;
  start_date: string;
  employment_status: string;
  termination_date: string | null;
  has_equity: boolean;
  w2_salary: number;
  created_at: string;
}

function toEmployeeRecord(row: EmployeeRow): EmployeeRecord {
  return {
    id: row.id,
    llcId: row.llc_id,
    name: row.name,
    roleOrPosition: row.role_or_position,
    startDate: row.start_date,
    employmentStatus: row.employment_status as EmployeeStatus,
    terminationDate: row.termination_date,
    hasEquity: row.has_equity,
    w2Salary: row.w2_salary,
    createdAt: row.created_at,
  };
}

let employeesCache: EmployeeRecord[] | null = null;
let employeesPromise: Promise<EmployeeRecord[]> | null = null;

const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

export function subscribeEmployees(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

async function fetchEmployees(): Promise<EmployeeRecord[]> {
  if (employeesCache) return employeesCache;
  if (!employeesPromise) {
    employeesPromise = (async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      employeesCache = (data as EmployeeRow[]).map(toEmployeeRecord);
      return employeesCache;
    })();
    employeesPromise.catch(() => {
      employeesPromise = null;
    });
  }
  return employeesPromise;
}

/** Load employees once. Called at app start; safe to call repeatedly. */
export async function loadEmployees(): Promise<void> {
  await fetchEmployees();
  notify();
}

export function getEmployeeRecords(): EmployeeRecord[] {
  return employeesCache ?? [];
}

export function getEmployeeRecordById(employeeId: string): EmployeeRecord | null {
  return employeesCache?.find((employee) => employee.id === employeeId) ?? null;
}

export function getEmployeeRecordsForLLC(llcId: string): EmployeeRecord[] {
  return (employeesCache ?? []).filter((employee) => employee.llcId === llcId);
}

export async function createEmployeeRecord(input: {
  llcId: string;
  name: string;
  roleOrPosition: string;
  startDate: string;
  w2Salary: number;
}): Promise<EmployeeRecord> {
  const row = {
    llc_id: input.llcId,
    name: input.name.trim(),
    role_or_position: input.roleOrPosition.trim(),
    start_date: input.startDate,
    w2_salary: input.w2Salary,
  };
  const { data, error } = await supabase.from("employees").insert(row).select("*").single();
  if (error) throw error;
  const record = toEmployeeRecord(data as EmployeeRow);
  employeesCache = [...(employeesCache ?? []), record];
  notify();
  return record;
}

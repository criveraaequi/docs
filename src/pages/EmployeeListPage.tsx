import { ArrowLeft, ArrowUpRight, ChevronDown, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { getAuthorizedUser, getEmployeesByLLC, getLLCDetails } from "@/data/mockApi";
import type { Employee, EmploymentStatus } from "@/data/types";

const LLC_ID = "llc-1";

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

type SortField = "name" | "units" | "vested" | "payout";
type SortDirection = "asc" | "desc";
type StatusFilter = "all" | "active" | "former";

interface SortState {
  field: SortField;
  direction: SortDirection;
}

const SORT_OPTIONS: { field: SortField; label: string; direction: SortDirection }[] = [
  { field: "name", label: "Name (A–Z)", direction: "asc" },
  { field: "name", label: "Name (Z–A)", direction: "desc" },
  { field: "units", label: "Units awarded (high–low)", direction: "desc" },
  { field: "vested", label: "Vested units (high–low)", direction: "desc" },
  { field: "payout", label: "Payout value (high–low)", direction: "desc" },
];

const STATUS_LABEL: Record<EmploymentStatus, string> = {
  active: "Active",
  terminated: "Terminated",
  resigned: "Resigned",
};

function statusLabelClass(status: EmploymentStatus): string {
  if (status === "active") return "status-label status-active";
  return "status-label status-former";
}

function matchesSearch(employee: Employee, query: string): boolean {
  const haystack = `${employee.name} ${employee.roleOrPosition}`.toLowerCase();
  return query.trim() === "" || haystack.includes(query.trim().toLowerCase());
}

function matchesGroup(employee: Employee, group: StatusFilter): boolean {
  if (group === "active") return employee.employmentStatus === "active";
  if (group === "former") return employee.employmentStatus !== "active";
  return true;
}

function sortEmployees(employees: Employee[], sort: SortState): Employee[] {
  const factor = sort.direction === "asc" ? 1 : -1;
  return [...employees].sort((a, b) => {
    switch (sort.field) {
      case "name":
        return factor * a.name.localeCompare(b.name);
      case "units":
        return factor * ((a.grant?.unitsAwarded ?? 0) - (b.grant?.unitsAwarded ?? 0));
      case "vested":
        return factor * ((a.grant?.currentVestedAmount ?? 0) - (b.grant?.currentVestedAmount ?? 0));
      case "payout":
        return factor * ((a.grant?.currentPayoutValue ?? 0) - (b.grant?.currentPayoutValue ?? 0));
    }
  });
}

function EmployeeRow({ employee, onViewContract }: { employee: Employee; onViewContract: (name: string) => void }) {
  const grant = employee.grant;
  return (
    <div className="employee-row">
      <div className="employee-name-cell">
        <Link className="employee-link" to={`/employees/${employee.id}`}>{employee.name}</Link>
        <span>{employee.roleOrPosition}</span>
      </div>
      <span className={statusLabelClass(employee.employmentStatus)}>{STATUS_LABEL[employee.employmentStatus]}</span>
      <strong>{grant ? grant.unitsAwarded.toLocaleString() : "—"}</strong>
      <strong>{grant ? grant.currentVestedAmount.toLocaleString() : "—"}</strong>
      <strong>{grant ? currency.format(grant.currentPayoutValue) : "—"}</strong>
      {grant ? (
        <button className="contract-link" type="button" onClick={() => onViewContract(employee.name)}>
          View contract <ArrowUpRight size={13} />
        </button>
      ) : (
        <span className="no-contract">No grant</span>
      )}
    </div>
  );
}

function EmployeeTable({ employees, emptyMessage, onViewContract }: { employees: Employee[]; emptyMessage: string; onViewContract: (name: string) => void }) {
  if (employees.length === 0) {
    return <p className="empty-state">{emptyMessage}</p>;
  }
  return (
    <>
      <div className="employee-table-header">
        <span>Employee</span>
        <span>Status</span>
        <span>Units</span>
        <span>Vested</span>
        <span>Payout value</span>
        <span>Contract</span>
      </div>
      {employees.map((employee) => (
        <EmployeeRow key={employee.id} employee={employee} onViewContract={onViewContract} />
      ))}
    </>
  );
}

export function EmployeeListPage() {
  const llc = getLLCDetails(LLC_ID);
  const owner = llc ? getAuthorizedUser(llc.id) : null;
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<SortState>({ field: "name", direction: "asc" });
  const [showFormer, setShowFormer] = useState(false);
  const [contractNotice, setContractNotice] = useState<string | null>(null);

  const employees = useMemo(() => (llc ? getEmployeesByLLC(llc.id) : []), [llc]);

  const filtered = useMemo(
    () => employees.filter((e) => matchesSearch(e, search) && matchesGroup(e, statusFilter)),
    [employees, search, statusFilter]
  );
  const sorted = useMemo(() => sortEmployees(filtered, sort), [filtered, sort]);

  const active = sorted.filter((e) => e.employmentStatus === "active");
  const former = sorted.filter((e) => e.employmentStatus !== "active");

  const granted = employees.filter((e) => e.grant !== null);
  const totalUnits = granted.reduce((sum, e) => sum + (e.grant?.unitsAwarded ?? 0), 0);
  const totalPayout = granted.reduce((sum, e) => sum + (e.grant?.currentPayoutValue ?? 0), 0);

  const openContractNotice = (name: string) => setContractNotice(`Contract documents for ${name} are coming soon — the attorney-drafted agreement template is still in review.`);

  if (!llc) {
    return (
      <div className="page-state" style={{ padding: "48px" }}>
        <Link className="back-link" to="/">← Back to dashboard</Link>
        <p>LLC not found.</p>
      </div>
    );
  }

  return (
    <AppShell llc={llc} owner={owner}>
      <div className="history-page">
        <Link className="back-link" to="/"><ArrowLeft size={15} /> Back to dashboard</Link>

        <div className="page-intro history-intro">
          <div>
            <span className="eyebrow">Team · {llc.name}</span>
            <h1>Employees</h1>
            <p>Click any employee to view their grant and vesting details.</p>
          </div>
          <span className="mock-badge">Mock data</span>
        </div>

        <section className="stat-card-row">
          <div className="stat-card">
            <strong>{granted.length}</strong>
            <span className="stat-label">Employees with grants</span>
            <span className="stat-sub">of {employees.length} on the team</span>
          </div>
          <div className="stat-card">
            <strong>{totalUnits.toLocaleString()}</strong>
            <span className="stat-label">Units awarded</span>
            <span className="stat-sub">of {llc.totalUnitsAuthorized.toLocaleString()} authorized</span>
          </div>
          <div className="stat-card">
            <strong>{currency.format(totalPayout)}</strong>
            <span className="stat-label">Total vested payout value</span>
            <span className="stat-sub">at current unit price</span>
          </div>
        </section>

        <section className="card employee-list-card">
          <div className="employee-controls">
            <label className="search-box">
              <Search size={15} />
              <input
                type="search"
                placeholder="Search by name or role"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            <div className="filter-group">
              {(["all", "active", "former"] as StatusFilter[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  className={option === statusFilter ? "filter-chip is-selected" : "filter-chip"}
                  onClick={() => setStatusFilter(option)}
                >
                  {option === "all" ? "All" : option === "active" ? "Active" : "Former"}
                </button>
              ))}
            </div>
            <label className="sort-select">
              <span>Sort</span>
              <select
                value={`${sort.field}:${sort.direction}`}
                onChange={(event) => {
                  const [field, direction] = event.target.value.split(":") as [SortField, SortDirection];
                  setSort({ field, direction });
                }}
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.label} value={`${option.field}:${option.direction}`}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {statusFilter === "former" ? (
            <EmployeeTable employees={former} emptyMessage="No former employees match." onViewContract={openContractNotice} />
          ) : (
            <>
              <EmployeeTable employees={active} emptyMessage="No active employees match." onViewContract={openContractNotice} />
              {former.length > 0 && (
                <button className="former-toggle" type="button" onClick={() => setShowFormer((v) => !v)}>
                  <ChevronDown size={15} className={showFormer ? "chevron-open" : ""} />
                  {showFormer ? "Hide" : "Show"} former employees ({former.length})
                </button>
              )}
              {showFormer && (
                <EmployeeTable employees={former} emptyMessage="No former employees match." onViewContract={openContractNotice} />
              )}
            </>
          )}
        </section>

        {contractNotice && (
          <div className="contract-notice" role="status">
            {contractNotice}
            <button type="button" onClick={() => setContractNotice(null)}>Dismiss</button>
          </div>
        )}
      </div>
    </AppShell>
  );
}

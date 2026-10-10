// Aequi — Grant creation wizard (owner-facing).
// Steps: employee picker -> units -> vesting -> review -> submitted.
import { ArrowLeft, ArrowRight, Check, Search, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { ContractDocument } from "@/components/ContractDocument";
import { formatDate } from "@/components/ValuationDetailModal";
import {
  createGrant,
  getEffectivePool,
  getPoolAllocatedUnits,
  getGrantsForEmployee,
  type GrantRecord,
} from "@/data/grantStore";
import { getAuthorizedUser, getEmployeesByLLC, getLLCDetails, getLatestValuation } from "@/data/mockApi";
import type { Employee } from "@/data/types";
import { todayIso } from "@/data/vesting";

interface GrantWizardProps {
  llcId: string;
  onClose: () => void;
}

const LENGTH_OPTIONS = [24, 36, 48];

type SortMode = "ungranted" | "mostEquity";

export function GrantWizard({ llcId, onClose }: GrantWizardProps) {
  const llc = getLLCDetails(llcId);
  const owner = llc ? getAuthorizedUser(llc.id) : null;
  const employees = getEmployeesByLLC(llcId);
  const latestValuation = getLatestValuation(llcId);
  const strikePrice = latestValuation?.resultingStrikePrice ?? 0;
  const pool = getEffectivePool(llcId);
  const poolUnits = Math.round((pool.equityPoolPercent / 100) * pool.totalUnitsAuthorized);
  const allocatedUnits = getPoolAllocatedUnits(llcId);
  const remainingUnits = Math.max(poolUnits - allocatedUnits, 0);

  const [step, setStep] = useState(1);
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("ungranted");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [units, setUnits] = useState<string>("");
  const [lengthMonths, setLengthMonths] = useState<number>(36);
  const [useCustomLength, setUseCustomLength] = useState(false);
  const [submitted, setSubmitted] = useState<GrantRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  const employeesWithRuntime = useMemo(() => {
    return employees.map((employee) => {
      const runtimeGrants = getGrantsForEmployee(employee.id);
      const runtimeUnits = runtimeGrants
        .filter((grant) => grant.status === "active")
        .reduce((sum, grant) => sum + grant.unitsAwarded, 0);
      return {
        employee,
        totalUnits: (employee.grant?.unitsAwarded ?? 0) + runtimeUnits,
        hasGrant: employee.grant !== null || runtimeGrants.length > 0,
      };
    });
  }, [employees]);

  const ungrantedFirst = useMemo(() => {
    return [...employeesWithRuntime].sort((a, b) => {
      if (a.hasGrant !== b.hasGrant) return a.hasGrant ? 1 : -1;
      return b.totalUnits - a.totalUnits;
    });
  }, [employeesWithRuntime]);

  const sortedEmployees = useMemo(() => {
    const base = sortMode === "ungranted"
      ? ungrantedFirst
      : [...employeesWithRuntime].sort((a, b) => b.totalUnits - a.totalUnits);
    if (search.trim() === "") return base;
    const query = search.trim().toLowerCase();
    return base.filter((entry) =>
      `${entry.employee.name} ${entry.employee.roleOrPosition}`.toLowerCase().includes(query)
    );
  }, [sortMode, search, ungrantedFirst, employeesWithRuntime]);

  const unitCount = Number(units) || 0;
  const pendingUnitsForEmployee = selectedEmployee
    ? getGrantsForEmployee(selectedEmployee.id)
        .filter((grant) => grant.status === "pending")
        .reduce((sum, grant) => sum + grant.unitsAwarded, 0)
    : 0;
  const unitsOverPool = remainingUnits - unitCount < 0;
  const canContinueStep2 = unitCount > 0 && !unitsOverPool;

  const cliffDate = useMemo(() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 1);
    return date.toISOString().slice(0, 10);
  }, []);
  const completionDate = useMemo(() => {
    const date = new Date();
    date.setMonth(date.getMonth() + lengthMonths);
    return date.toISOString().slice(0, 10);
  }, [lengthMonths]);

  async function handleSubmit() {
    if (!selectedEmployee) return;
    setError(null);
    try {
      const grant = await createGrant({
        llcId,
        employeeId: selectedEmployee.id,
        unitsAwarded: unitCount,
        strikePricePerUnit: strikePrice,
        scheduleLengthMonths: lengthMonths,
      });
      setSubmitted(grant);
    } catch (submitError) {
      setError("Something went wrong saving the grant. Please try again.");
      console.error(submitError);
    }
  }

  function reset() {
    setStep(1);
    setSearch("");
    setSortMode("ungranted");
    setSelectedEmployee(null);
    setUnits("");
    setLengthMonths(36);
    setUseCustomLength(false);
    setSubmitted(null);
    setError(null);
  }

  function closeAfterSubmit() {
    reset();
    onClose();
  }

  if (!llc) return null;

  if (submitted) {
    return (
      <div className="wizard-overlay" role="dialog" aria-modal="true" aria-label="Grant created">
        <div className="wizard-modal wizard-confirm">
          <div className="wizard-confirm-icon"><Check size={26} /></div>
          <h2>Grant created</h2>
          <p>
            {submitted.unitsAwarded.toLocaleString()} units of phantom equity for{" "}
            <strong>{submitted.employeeName}</strong>. The grant is now{" "}
            <strong>pending employee signature</strong> — it does not count against the equity
            pool until the agreement is signed.
          </p>
          <p className="wizard-confirm-demo">
            Demo tip: use the "Simulate employee signing" button on the employee's page or the
            pending grants list to walk through the signature step.
          </p>
          <div className="wizard-actions">
            <button className="button-secondary" type="button" onClick={closeAfterSubmit}>
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="wizard-overlay" role="dialog" aria-modal="true" aria-label="Create equity grant">
      <div className="wizard-modal">
        <div className="wizard-header">
          <div>
            <span className="eyebrow">New equity grant · {llc.name}</span>
            <h2>
              {step === 1 && "Choose employee"}
              {step === 2 && "Set units"}
              {step === 3 && "Vesting schedule"}
              {step === 4 && "Review & send"}
            </h2>
          </div>
          <button className="wizard-close" type="button" aria-label="Close" onClick={onClose}>×</button>
        </div>

        <div className="wizard-steps" aria-label={`Step ${step} of 4`}>
          {[1, 2, 3, 4].map((marker) => (
            <span
              key={marker}
              className={`wizard-step-dot${marker === step ? " is-active" : ""}${marker < step ? " is-done" : ""}`}
            />
          ))}
          <span className="wizard-step-label">Step {step} of 4</span>
        </div>

        {step === 1 && (
          <div className="wizard-body">
            <div className="wizard-controls">
              <label className="search-box">
                <Search size={15} />
                <input
                  type="search"
                  placeholder="Search employees"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </label>
              <label className="sort-select">
                <span>Sort</span>
                <select
                  value={sortMode}
                  onChange={(event) => setSortMode(event.target.value as SortMode)}
                >
                  <option value="ungranted">Employees without grants first</option>
                  <option value="mostEquity">Most equity held (high–low)</option>
                </select>
              </label>
            </div>
            <div className="wizard-employee-list">
              {sortedEmployees.length === 0 && (
                <p className="empty-state">No employees match that search.</p>
              )}
              {sortedEmployees.map(({ employee, hasGrant, totalUnits }) => (
                <button
                  key={employee.id}
                  type="button"
                  className={`wizard-employee-row${selectedEmployee?.id === employee.id ? " is-selected" : ""}`}
                  onClick={() => {
                    setSelectedEmployee(employee);
                    setStep(2);
                  }}
                >
                  <span className="wizard-employee-avatar"><Users size={16} /></span>
                  <span className="wizard-employee-name">
                    {employee.name}
                    <span>{employee.roleOrPosition}</span>
                  </span>
                  {hasGrant && (
                    <span className="status-label status-pending">Has grant · {totalUnits.toLocaleString()} units</span>
                  )}
                </button>
              ))}
            </div>
            <p className="wizard-hint">
              Only existing employees on the platform can receive grants in the closed beta.
            </p>
          </div>
        )}

        {step === 2 && selectedEmployee && (
          <div className="wizard-body">
            <button className="wizard-back" type="button" onClick={() => setStep(1)}>
              <ArrowLeft size={14} /> {selectedEmployee.name}
            </button>
            <label className="wizard-field">
              <span>Units to grant</span>
              <input
                type="number"
                min={1}
                placeholder="e.g. 250"
                value={units}
                onChange={(event) => setUnits(event.target.value)}
              />
            </label>
            <div className="wizard-pool-status">
              <div>
                <strong>{remainingUnits.toLocaleString()}</strong>
                <span>pool units remaining</span>
              </div>
              <div>
                <strong>{unitCount > 0 ? `${((unitCount / poolUnits) * 100).toFixed(1)}%` : "—"}</strong>
                <span>share of the {pool.equityPoolPercent}% pool</span>
              </div>
              <div>
                <strong>${strikePrice.toFixed(2)}</strong>
                <span>unit price (latest valuation)</span>
                {latestValuation && <span className="wizard-hint-inline">as of {formatDate(latestValuation.date)}</span>}
              </div>
            </div>
            {unitsOverPool && (
              <p className="wizard-error">
                Not enough units left in the pool — only {remainingUnits.toLocaleString()} remain.
                You'll be able to expand the pool from the dashboard.
              </p>
            )}
            {pendingUnitsForEmployee > 0 && (
              <p className="wizard-hint">
                {selectedEmployee.name} already has {pendingUnitsForEmployee.toLocaleString()} units
                pending signature.
              </p>
            )}
            <div className="wizard-actions">
              <button className="button-secondary" type="button" onClick={() => setStep(1)}>Back</button>
              <button
                className="button-primary"
                type="button"
                disabled={!canContinueStep2}
                onClick={() => setStep(3)}
              >
                Continue <ArrowRight size={15} />
              </button>
            </div>
          </div>
        )}

        {step === 3 && selectedEmployee && (
          <div className="wizard-body">
            <button className="wizard-back" type="button" onClick={() => setStep(2)}>
              <ArrowLeft size={14} /> {unitCount.toLocaleString()} units
            </button>
            <div className="wizard-field-block">
              <span className="wizard-field-label">Vesting schedule</span>
              <p className="wizard-hint">
                Standard schedule: 1-year cliff, then monthly vesting. Only the total length can be
                changed in the closed beta.
              </p>
              <div className="wizard-length-options">
                {LENGTH_OPTIONS.map((months) => (
                  <button
                    key={months}
                    type="button"
                    className={`wizard-length-option${!useCustomLength && lengthMonths === months ? " is-selected" : ""}`}
                    onClick={() => {
                      setLengthMonths(months);
                      setUseCustomLength(false);
                    }}
                  >
                    <strong>{months / 12} years</strong>
                    <span>{months} months</span>
                  </button>
                ))}
                <div className={`wizard-length-option wizard-length-custom${useCustomLength ? " is-selected" : ""}`}>
                  <strong>Custom</strong>
                  <input
                    type="number"
                    min={13}
                    max={120}
                    placeholder="Months"
                    value={useCustomLength ? lengthMonths : ""}
                    onFocus={() => setUseCustomLength(true)}
                    onChange={(event) => {
                      setUseCustomLength(true);
                      const value = Number(event.target.value);
                      if (value >= 13 && value <= 120) setLengthMonths(value);
                    }}
                  />
                </div>
              </div>
            </div>
            <div className="wizard-dates">
              <div><span>Grant date</span><strong>{formatDate(todayIso())}</strong></div>
              <div><span>Cliff date</span><strong>{formatDate(cliffDate)}</strong></div>
              <div><span>Fully vested</span><strong>{formatDate(completionDate)}</strong></div>
            </div>
            <div className="wizard-actions">
              <button className="button-secondary" type="button" onClick={() => setStep(2)}>Back</button>
              <button className="button-primary" type="button" onClick={() => setStep(4)}>
                Continue <ArrowRight size={15} />
              </button>
            </div>
          </div>
        )}

        {step === 4 && selectedEmployee && (
          <div className="wizard-body">
            <div className="wizard-review-grid">
              <div><span>Employee</span><strong>{selectedEmployee.name}</strong></div>
              <div><span>Role</span><strong>{selectedEmployee.roleOrPosition}</strong></div>
              <div><span>Units</span><strong>{unitCount.toLocaleString()}</strong></div>
              <div><span>Share of pool</span><strong>{((unitCount / poolUnits) * 100).toFixed(1)}%</strong></div>
              <div><span>Unit price</span><strong>${strikePrice.toFixed(2)}</strong></div>
              <div><span>Vesting</span><strong>{lengthMonths} months, 1-year cliff</strong></div>
              <div><span>Grant date</span><strong>{formatDate(todayIso())}</strong></div>
              <div><span>Fully vested</span><strong>{formatDate(completionDate)}</strong></div>
            </div>
            <div className="wizard-contract-preview">
              <ContractDocument
                grant={{
                  id: "preview",
                  llcId,
                  employeeId: selectedEmployee.id,
                  employeeName: selectedEmployee.name,
                  employeeRole: selectedEmployee.roleOrPosition,
                  unitsAwarded: unitCount,
                  strikePricePerUnit: strikePrice,
                  grantDate: todayIso(),
                  scheduleLengthMonths: lengthMonths,
                  cliffDate,
                  vestingCompletionDate: completionDate,
                  monthlyVestingRate: unitCount / Math.max(lengthMonths - 12, 1),
                  contractDocumentName: `Aequi_Grant_${selectedEmployee.name.replace(/\s+/g, "_")}_${todayIso().replace(/-/g, "")}.pdf`,
                  status: "pending",
                  signedAt: null,
                  createdAt: todayIso(),
                }}
                llc={llc}
                owner={owner}
              />
            </div>
            {error && <p className="wizard-error">{error}</p>}
            <div className="wizard-actions">
              <button className="button-secondary" type="button" onClick={() => setStep(3)}>Back</button>
              <button className="button-primary" type="button" onClick={handleSubmit}>
                Create grant &amp; send for signature
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

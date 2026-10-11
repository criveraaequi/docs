// Aequi — New equity grant page (owner-facing).
// Full-page version of the grant flow. Steps: employee picker -> units ->
// vesting -> review -> created confirmation.
import { ArrowLeft, ArrowRight, Check, Search, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
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

interface GrantPageProps {
  llcId: string;
}

const LENGTH_OPTIONS = [24, 36, 48];
const CLIFF_OPTIONS = [6, 12, 24];

interface VestingPreviewPoint {
  label: string;
  vestedUnits: number;
  isCliff: boolean;
}

function buildVestingPreview(
  units: number,
  lengthMonths: number,
  cliffMonths: number
): VestingPreviewPoint[] {
  const rate = units / Math.max(lengthMonths - cliffMonths, 1);
  const points: VestingPreviewPoint[] = [];
  for (let month = 0; month <= lengthMonths; month += 1) {
    const date = new Date();
    date.setMonth(date.getMonth() + month);
    const vestedUnits = month < cliffMonths
      ? 0
      : Math.min(Math.round(month * rate), units);
    points.push({
      label: date.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      vestedUnits,
      isCliff: month === cliffMonths,
    });
  }
  return points;
}

type SortMode = "ungranted" | "mostEquity";

export function GrantPage({ llcId }: GrantPageProps) {
  const llc = getLLCDetails(llcId);
  const owner = llc ? getAuthorizedUser(llc.id) : null;
  const employees = getEmployeesByLLC(llcId);
  const latestValuation = getLatestValuation(llcId);
  const strikePrice = latestValuation?.resultingStrikePrice ?? 0;
  const pool = getEffectivePool(llcId);
  const poolUnits = Math.round((pool.equityPoolPercent / 100) * pool.totalUnitsAuthorized);
  const allocatedUnits = getPoolAllocatedUnits(llcId);
  const remainingUnits = Math.max(poolUnits - allocatedUnits, 0);
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("ungranted");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [units, setUnits] = useState<string>("");
  const [lengthMonths, setLengthMonths] = useState<number>(36);
  const [useCustomLength, setUseCustomLength] = useState(false);
  const [cliffMonths, setCliffMonths] = useState<number>(12);
  const [useCustomCliff, setUseCustomCliff] = useState(false);
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

  const cliffOverLength = cliffMonths >= lengthMonths;
  const cliffDate = useMemo(() => {
    const date = new Date();
    date.setMonth(date.getMonth() + cliffMonths);
    return date.toISOString().slice(0, 10);
  }, [cliffMonths]);
  const completionDate = useMemo(() => {
    const date = new Date();
    date.setMonth(date.getMonth() + lengthMonths);
    return date.toISOString().slice(0, 10);
  }, [lengthMonths]);
  const vestingPreviewSeries = useMemo(
    () => buildVestingPreview(unitCount, lengthMonths, cliffMonths),
    [unitCount, lengthMonths, cliffMonths]
  );
  const cliffPreviewPoint = vestingPreviewSeries.find((point) => point.isCliff);

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
        cliffMonths,
      });
      setSubmitted(grant);
    } catch (submitError) {
      setError("Something went wrong saving the grant. Please try again.");
      console.error(submitError);
    }
  }

  if (!llc) return null;

  if (submitted) {
    return (
      <div className="flow-page">
        <Link className="back-link" to="/"><ArrowLeft size={15} /> Back to dashboard</Link>
        <section className="card flow-confirm-card">
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
          <div className="wizard-actions flow-confirm-actions">
            <button className="button-primary" type="button" onClick={() => navigate("/")}>
              Done
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="flow-page">
      <Link className="back-link" to="/"><ArrowLeft size={15} /> Back to dashboard</Link>

      <div className="page-intro flow-intro">
        <div>
          <span className="eyebrow">New equity grant · {llc.name}</span>
          <h1>
            {step === 1 && "Choose employee"}
            {step === 2 && "Set units"}
            {step === 3 && "Vesting schedule"}
            {step === 4 && "Review & send"}
          </h1>
        </div>
      </div>

      <section className="card flow-card">
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
          <div className="flow-body">
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
            <div className="wizard-employee-list flow-employee-list">
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
          <div className="flow-body">
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
                Insufficient units left in the pool — only {remainingUnits.toLocaleString()} remain.
                You can expand the phantom pool <Link to="/pool/expand">here</Link>.
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
          <div className="flow-body">
            <button className="wizard-back" type="button" onClick={() => setStep(2)}>
              <ArrowLeft size={14} /> {unitCount.toLocaleString()} units
            </button>
            <div className="wizard-field-block">
              <span className="wizard-field-label">Vesting schedule</span>
              <p className="wizard-hint">
                Set the total length and the cliff. Nothing vests before the cliff; after it,
                units vest monthly until the schedule completes.
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
            <div className="wizard-field-block">
              <span className="wizard-field-label">Cliff</span>
              <div className="wizard-length-options">
                {CLIFF_OPTIONS.map((months) => (
                  <button
                    key={months}
                    type="button"
                    className={`wizard-length-option${!useCustomCliff && cliffMonths === months ? " is-selected" : ""}`}
                    onClick={() => {
                      setCliffMonths(months);
                      setUseCustomCliff(false);
                    }}
                  >
                    <strong>{months} months</strong>
                    <span>{(months / 12).toFixed(months % 12 === 0 ? 0 : 1)} years</span>
                  </button>
                ))}
                <div className={`wizard-length-option wizard-length-custom${useCustomCliff ? " is-selected" : ""}`}>
                  <strong>Custom</strong>
                  <input
                    type="number"
                    min={1}
                    max={lengthMonths - 1}
                    placeholder="Months"
                    value={useCustomCliff ? cliffMonths : ""}
                    onFocus={() => setUseCustomCliff(true)}
                    onChange={(event) => {
                      setUseCustomCliff(true);
                      const value = Number(event.target.value);
                      if (value >= 1 && value < lengthMonths) setCliffMonths(value);
                    }}
                  />
                </div>
              </div>
              {cliffOverLength && (
                <p className="wizard-error">
                  The cliff must end before the vesting schedule does ({lengthMonths} months).
                </p>
              )}
            </div>
            <div className="wizard-dates">
              <div><span>Grant date</span><strong>{formatDate(todayIso())}</strong></div>
              <div><span>Cliff date</span><strong>{formatDate(cliffDate)}</strong></div>
              <div><span>Fully vested</span><strong>{formatDate(completionDate)}</strong></div>
            </div>
            <div className="card wizard-vesting-chart">
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={vestingPreviewSeries} margin={{ top: 24, right: 16, left: 4, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(138, 147, 163, .18)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: "#8a93a3", fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={28} />
                    <YAxis
                      tick={{ fill: "#8a93a3", fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      width={58}
                      domain={[0, Math.max(unitCount, 1)]}
                      tickFormatter={(value: number) => value.toLocaleString()}
                    />
                    <Tooltip
                      cursor={{ stroke: "rgba(138, 147, 163, .35)" }}
                      contentStyle={{ border: "1px solid rgba(138, 147, 163, .25)", borderRadius: 5, background: "#fdfcf9", fontFamily: "Work Sans" }}
                      formatter={(value: unknown) => [`${Number(value).toLocaleString()} units`, "Vested units"]}
                      labelFormatter={(label: unknown) => String(label)}
                    />
                    {cliffPreviewPoint && (
                      <ReferenceLine
                        x={cliffPreviewPoint.label}
                        stroke="#b07d3a"
                        strokeDasharray="5 4"
                        label={{ value: "CLIFF", position: "top", fill: "#b07d3a", fontSize: 10, letterSpacing: "0.08em" }}
                      />
                    )}
                    <Area
                      type="monotone"
                      dataKey="vestedUnits"
                      stroke="#1f3164"
                      strokeWidth={2.5}
                      fill="rgba(31, 49, 100, .1)"
                      activeDot={{ r: 5, fill: "#1f3164", stroke: "#fdfcf9", strokeWidth: 2 }}
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <p className="wizard-hint">
                Projected vesting for {unitCount > 0 ? unitCount.toLocaleString() : "—"} units ·
                {" "}{lengthMonths} months with a {cliffMonths}-month cliff.
              </p>
            </div>
            <div className="wizard-actions">
              <button className="button-secondary" type="button" onClick={() => setStep(2)}>Back</button>
              <button
                className="button-primary"
                type="button"
                disabled={cliffOverLength}
                onClick={() => setStep(4)}
              >
                Continue <ArrowRight size={15} />
              </button>
            </div>
          </div>
        )}

        {step === 4 && selectedEmployee && (
          <div className="flow-body">
            <div className="wizard-review-grid">
              <div><span>Employee</span><strong>{selectedEmployee.name}</strong></div>
              <div><span>Role</span><strong>{selectedEmployee.roleOrPosition}</strong></div>
              <div><span>Units</span><strong>{unitCount.toLocaleString()}</strong></div>
              <div><span>Share of pool</span><strong>{((unitCount / poolUnits) * 100).toFixed(1)}%</strong></div>
              <div><span>Unit price</span><strong>${strikePrice.toFixed(2)}</strong></div>
              <div><span>Vesting</span><strong>{lengthMonths} months, {cliffMonths}-month cliff</strong></div>
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
                  monthlyVestingRate: unitCount / Math.max(lengthMonths - cliffMonths, 1),
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
      </section>
    </div>
  );
}

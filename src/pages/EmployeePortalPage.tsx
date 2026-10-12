// Aequi — Employee portal: "My Equity" home screen.
// Personal vesting dashboard for the closed beta: units, vested value,
// cliff countdown, progress, contract actions, valuations, analyst identity.
import { ArrowLeft, ArrowUpRight, Check, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
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
import { EmployeeShell } from "@/components/EmployeeShell";
import { ContractDocument } from "@/components/ContractDocument";
import { formatDate } from "@/components/ValuationDetailModal";
import {
  acceptGrant,
  getGrantsForEmployee,
  rejectGrant,
  resendGrant,
  type GrantRecord,
} from "@/data/grantStore";
import { getEmployeeRecords } from "@/data/employeeStore";
import { getAuthorizedUser, getEmployee, getEngagementStatus, getLLCDetails } from "@/data/mockApi";
import { useGrantStore } from "@/data/useGrantStore";
import type { EquityGrant, ValuationEvent } from "@/data/types";
import { fullMonthsBetween, todayIso, vestedUnitsAsOf } from "@/data/vesting";

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

interface VestingPoint {
  label: string;
  dateIso: string;
  vestedUnits: number;
  isCliff: boolean;
  isToday: boolean;
}

interface GrantView {
  key: string;
  grant: EquityGrant;
  status: "pending" | "active" | "rejected";
  contractId?: string;
}

function runtimeGrantToEquityGrant(record: GrantRecord): EquityGrant {
  return {
    unitsAwarded: record.unitsAwarded,
    strikePricePerUnit: record.strikePricePerUnit,
    grantDate: record.grantDate,
    contractDocumentName: record.contractDocumentName,
    vesting: {
      scheduleType: "standard",
      grantDate: record.grantDate,
      cliffDate: record.cliffDate,
      vestingCompletionDate: record.vestingCompletionDate,
      scheduleLengthMonths: record.scheduleLengthMonths,
      monthlyVestingRate: record.monthlyVestingRate,
      vestingTriggers: record.vestingTriggers,
      vestingSlowdowns: record.vestingSlowdowns,
    },
    currentVestedAmount: 0,
    currentPayoutValue: 0,
  };
}

function buildVestingSeries(grant: EquityGrant): VestingPoint[] {
  const { vesting } = grant;
  const months = Math.max(fullMonthsBetween(vesting.grantDate, vesting.vestingCompletionDate), 1);
  const cliffMonths = fullMonthsBetween(vesting.grantDate, vesting.cliffDate);
  const points: VestingPoint[] = [];
  for (let month = 0; month <= months; month += 1) {
    const date = new Date(vesting.grantDate);
    date.setMonth(date.getMonth() + month);
    const iso = date.toISOString().slice(0, 10);
    points.push({
      label: date.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      dateIso: iso,
      vestedUnits: vestedUnitsAsOf(grant, iso),
      isCliff: month === cliffMonths,
      isToday: false,
    });
  }
  return points;
}

function formatYears(months: number): string {
  if (months % 12 === 0) return `${months / 12} yr${months === 12 ? "" : "s"}`;
  return `${months} mo`;
}

export function EmployeePortalPage() {
  const { employeeId } = useParams<{ employeeId: string }>();
  useGrantStore();

  const record = employeeId
    ? getEmployeeRecords().find((item) => item.id === employeeId && item.hasEquity) ?? null
    : null;
  const employee = record ? getEmployee(record.id) : null;
  const llc = employee ? getLLCDetails(employee.llcId) : null;

  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [revising, setRevising] = useState<string | null>(null);
  const [revisedUnits, setRevisedUnits] = useState<string>("");
  const [revisedLength, setRevisedLength] = useState<string>("36");
  const navigate = useNavigate();

  const runtimeGrants = useMemo(
    () => (employeeId ? getGrantsForEmployee(employeeId) : []),
    [employeeId]
  );

  if (!record || !employee || !llc) {
    return (
      <div className="page-state" style={{ padding: "48px" }}>
        <Link className="back-link" to="/">← Back to dashboard</Link>
        <p>Employee portal not found.</p>
      </div>
    );
  }

  const history = llc.valuationHistory ?? [];
  const latestPrice = history.length > 0
    ? history[history.length - 1].resultingStrikePrice
    : employee.grant?.strikePricePerUnit ?? 0;

  const grantViews: GrantView[] = [];
  if (employee.grant) {
    grantViews.push({ key: "seed", grant: employee.grant, status: "active" });
  }
  for (const recordGrant of runtimeGrants) {
    grantViews.push({
      key: recordGrant.id,
      grant: runtimeGrantToEquityGrant(recordGrant),
      status: recordGrant.status,
      contractId: recordGrant.id,
    });
  }

  const liveViews = grantViews.map((view) => {
    const vestedUnits = vestedUnitsAsOf(view.grant, todayIso());
    return { ...view, vestedUnits, vestedValue: Math.round(vestedUnits * latestPrice) };
  });

  const totalUnitsAwarded = liveViews.reduce((sum, view) => sum + view.grant.unitsAwarded, 0);
  const totalVestedUnits = liveViews.reduce((sum, view) => sum + view.vestedUnits, 0);
  const totalVestedValue = liveViews.reduce((sum, view) => sum + view.vestedValue, 0);

  const engagement = getEngagementStatus(llc.id);
  const analystEngaged = engagement !== null && engagement.currentStage !== "Requested" && engagement.currentStage !== "Matching";
  const isPreCertification = engagement !== null && engagement.currentStage !== "Certified";

  const decide = async (grantId: string, decision: "accept" | "reject") => {
    setActionError(null);
    setBusy(grantId);
    try {
      if (decision === "accept") await acceptGrant(grantId);
      else await rejectGrant(grantId);
    } catch {
      setActionError(
        decision === "accept"
          ? "Couldn't accept the agreement. Check your connection and try again."
          : "Couldn't decline the agreement. Check your connection and try again."
      );
    } finally {
      setBusy(null);
    }
  };

  const submitRevision = async (grantId: string) => {
    setActionError(null);
    setBusy(grantId);
    try {
      await resendGrant(grantId, {
        unitsAwarded: Number(revisedUnits) || 0,
        scheduleLengthMonths: Number(revisedLength) || 36,
      });
      setRevising(null);
    } catch {
      setActionError("Couldn't re-send the agreement. Check your connection and try again.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <EmployeeShell employee={employee}>
      <div className="history-page employee-page">
        <Link className="back-link" to="/" onClick={(event) => { event.preventDefault(); navigate("/"); }}>
          <ArrowLeft size={15} /> Owner view
        </Link>

        <section className="card payout-hero">
          <div className="payout-hero-header">
            <div>
              <h1 className="payout-employee">My Equity</h1>
              <span className="payout-units">
                {liveViews.length} agreement{liveViews.length === 1 ? "" : "s"} · {totalUnitsAwarded.toLocaleString()} units · {employee.roleOrPosition}
              </span>
            </div>
          </div>
          <div className="payout-headline">
            <strong>{currency.format(totalVestedValue)}</strong>
            <span>VESTED PAYOUT VALUE · {totalVestedUnits.toLocaleString()} OF {totalUnitsAwarded.toLocaleString()} UNITS</span>
          </div>
          <div className="payout-price-note">
            Current unit price: <strong>${latestPrice.toFixed(2)}</strong>
            {isPreCertification && <span className="preliminary-pill">Preliminary — not yet certified</span>}
          </div>
        </section>

        {liveViews.map((view, index) => (
          <AgreementCard
            key={view.key}
            index={index}
            view={view}
            history={history}
            latestPrice={latestPrice}
            busy={busy === view.key}
            actionError={actionError}
            grantRecord={
              view.contractId
                ? runtimeGrants.find((grant) => grant.id === view.contractId)!
                : contractRecordFor(view, employee.name, employee.roleOrPosition, llc.id)
            }
            llc={llc}
            owner={getAuthorizedUser(llc.id)}
            onAccept={() => void decide(view.key, "accept")}
            onReject={() => void decide(view.key, "reject")}
            revising={revising === view.key}
            onStartRevise={() => {
              setRevising(view.key);
              setRevisedUnits(String(view.grant.unitsAwarded));
              setRevisedLength(String(view.grant.vesting.scheduleLengthMonths));
            }}
            onCancelRevise={() => setRevising(null)}
            revisedUnits={revisedUnits}
            onRevisedUnitsChange={setRevisedUnits}
            revisedLength={revisedLength}
            onRevisedLengthChange={setRevisedLength}
            onSubmitRevision={() => void submitRevision(view.key)}
          />
        ))}

        <ValuationHistoryCard
          history={history}
          isPreCertification={isPreCertification}
          analystEngaged={analystEngaged}
        />
      </div>
    </EmployeeShell>
  );
}

/** Builds a persisted GrantRecord shape for the contract document renderer. */
function contractRecordFor(view: GrantView, employeeName: string, employeeRole: string, llcId: string): GrantRecord {
  return {
    id: view.key,
    llcId,
    employeeId: view.key === "seed" ? "seeded" : view.key,
    employeeName,
    employeeRole,
    unitsAwarded: view.grant.unitsAwarded,
    strikePricePerUnit: view.grant.strikePricePerUnit,
    grantDate: view.grant.grantDate,
    scheduleLengthMonths: view.grant.vesting.scheduleLengthMonths,
    cliffDate: view.grant.vesting.cliffDate,
    vestingCompletionDate: view.grant.vesting.vestingCompletionDate,
    monthlyVestingRate: view.grant.vesting.monthlyVestingRate,
    vestingTriggers: view.grant.vesting.vestingTriggers,
    vestingSlowdowns: view.grant.vesting.vestingSlowdowns,
    contractDocumentName: view.grant.contractDocumentName,
    status: view.status === "rejected" ? "rejected" : view.status,
    signedAt: view.status === "active" ? new Date().toISOString() : null,
    createdAt: view.grant.grantDate,
  };
}

interface AgreementCardProps {
  index: number;
  view: GrantView & { vestedUnits: number; vestedValue: number };
  history: ValuationEvent[];
  latestPrice: number;
  busy: boolean;
  actionError: string | null;
  grantRecord: GrantRecord;
  llc: NonNullable<ReturnType<typeof getLLCDetails>>;
  owner: ReturnType<typeof getAuthorizedUser>;
  onAccept: () => void;
  onReject: () => void;
  revising: boolean;
  onStartRevise: () => void;
  onCancelRevise: () => void;
  revisedUnits: string;
  onRevisedUnitsChange: (value: string) => void;
  revisedLength: string;
  onRevisedLengthChange: (value: string) => void;
  onSubmitRevision: () => void;
}

function AgreementCard({
  index,
  view,
  history,
  latestPrice,
  busy,
  actionError,
  grantRecord,
  llc,
  owner,
  onAccept,
  onReject,
  revising,
  onStartRevise,
  onCancelRevise,
  revisedUnits,
  onRevisedUnitsChange,
  revisedLength,
  onRevisedLengthChange,
  onSubmitRevision,
}: AgreementCardProps) {
  const { grant, status } = view;
  const series = useMemo(() => buildVestingSeries(grant), [grant]);

  const cliffMonths = Math.max(fullMonthsBetween(grant.vesting.grantDate, grant.vesting.cliffDate), 0);
  const vestedPercent = grant.unitsAwarded > 0
    ? Math.min((view.vestedUnits / grant.unitsAwarded) * 100, 100)
    : 0;
  const stillInCliff = view.vestedUnits === 0 && vestedPercent < 100;
  const monthsToCliff = stillInCliff
    ? Math.max(fullMonthsBetween(todayIso(), grant.vesting.cliffDate), 0)
    : 0;
  const currentPrice = history.length > 0 ? latestPrice : grant.strikePricePerUnit;

  const today = todayIso();
  const todayTime = new Date(today).getTime();
  const grantStartTime = new Date(grant.vesting.grantDate).getTime();
  const completionTime = new Date(grant.vesting.vestingCompletionDate).getTime();

  const displaySeries = useMemo(() => {
    if (todayTime < grantStartTime || todayTime > completionTime || series.length === 0) return series;
    const todayPoint: VestingPoint = {
      label: new Date(today).toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      dateIso: today,
      vestedUnits: view.vestedUnits,
      isCliff: false,
      isToday: true,
    };
    const insertIndex = series.findIndex((point) => new Date(point.dateIso).getTime() > todayTime);
    const next = [...series];
    if (insertIndex === -1) next.push(todayPoint);
    else next.splice(insertIndex, 0, todayPoint);
    return next;
  }, [series, todayTime, grantStartTime, completionTime, today, view.vestedUnits]);

  const cliffPoint = series.find((point) => point.isCliff);
  const cliffMarkers = cliffPoint ? [{ label: cliffPoint.label, text: "CLIFF" }] : [];

  return (
    <section className="card grant-agreement-card">
      <div className="card-heading">
        <div>
          <span className="eyebrow">Agreement {index + 1}</span>
          <h2>
            {grant.unitsAwarded.toLocaleString()} units · {formatYears(grant.vesting.scheduleLengthMonths)} schedule
            {status === "pending" && <span className="status-label status-pending">Awaiting your decision</span>}
            {status === "rejected" && <span className="status-label status-pending">Declined — owner revising</span>}
          </h2>
        </div>
        {view.contractId ? (
          <span className="updated-label">{grant.contractDocumentName}</span>
        ) : (
          <span className="updated-label">{grant.contractDocumentName}</span>
        )}
      </div>

      <div className="grant-facts">
        <div className="grant-fact"><span>Issue date</span><strong>{formatDate(grant.grantDate)}</strong></div>
        <div className="grant-fact"><span>Cliff</span><strong>{formatYears(cliffMonths)} · {formatDate(grant.vesting.cliffDate)}</strong></div>
        <div className="grant-fact"><span>Fully vested</span><strong>{formatDate(grant.vesting.vestingCompletionDate)}</strong></div>
        <div className="grant-fact"><span>Unit price at issue</span><strong>${grant.strikePricePerUnit.toFixed(2)}</strong></div>
      </div>

      <VestingChart data={displaySeries} yMax={grant.unitsAwarded} cliffMarkers={cliffMarkers} />

      <div className="vesting-progress">
        <div className="vesting-progress-header">
          <span>Vesting progress</span>
          <strong>{view.vestedUnits.toLocaleString()} of {grant.unitsAwarded.toLocaleString()} units · {vestedPercent.toFixed(0)}%</strong>
        </div>
        <div className="vesting-progress-bar">
          <div className="vesting-progress-fill" style={{ width: `${vestedPercent}%` }} />
        </div>
      </div>

      {stillInCliff && status !== "rejected" && (
        <p className="payout-projected">
          {monthsToCliff > 0
            ? <>Vesting begins in {monthsToCliff} month{monthsToCliff === 1 ? "" : "s"} — projected value upon full vesting:{" "}</>
            : <>Still in the cliff — projected value upon full vesting:{" "}</>}
          <strong>{currency.format(grant.unitsAwarded * currentPrice)}</strong>
          <span> — all {grant.unitsAwarded.toLocaleString()} units × ${currentPrice.toFixed(2)} current unit price</span>
        </p>
      )}

      {status === "pending" && (
        <div className="employee-decision">
          <p>Review the agreement below, then accept or decline. Accepting activates your grant; declining sends it back to the owner.</p>
          {actionError && <p className="thread-send-error">{actionError}</p>}
          <div className="employee-decision-actions">
            <button className="button-secondary" type="button" disabled={busy} onClick={onReject}>
              <X size={15} /> <span>{busy ? "Working…" : "Decline"}</span>
            </button>
            <button className="button-primary" type="button" disabled={busy} onClick={onAccept}>
              <Check size={15} /> <span>{busy ? "Working…" : "Accept agreement"}</span>
            </button>
          </div>
        </div>
      )}

      {status === "rejected" && (
        <div className="employee-decision">
          <p>This offer was declined. As the owner you can revise the units or schedule and send it back to the employee.</p>
          {actionError && <p className="thread-send-error">{actionError}</p>}
          {!revising ? (
            <div className="employee-decision-actions">
              <button className="button-secondary" type="button" onClick={onStartRevise}>
                Revise &amp; re-send
              </button>
            </div>
          ) : (
            <div className="revision-fields">
              <label className="wizard-field">
                <span>Units</span>
                <input
                  type="number"
                  min={1}
                  value={revisedUnits}
                  onChange={(event) => onRevisedUnitsChange(event.target.value)}
                />
              </label>
              <label className="wizard-field">
                <span>Schedule length (months)</span>
                <input
                  type="number"
                  min={13}
                  value={revisedLength}
                  onChange={(event) => onRevisedLengthChange(event.target.value)}
                />
              </label>
              <div className="employee-decision-actions">
                <button className="button-secondary" type="button" onClick={onCancelRevise}>
                  Cancel
                </button>
                <button
                  className="button-primary"
                  type="button"
                  disabled={busy || !(Number(revisedUnits) > 0) || !(Number(revisedLength) > 12)}
                  onClick={onSubmitRevision}
                >
                  {busy ? "Sending…" : "Send revised offer"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <details className="contract-collapse">
        <summary>View full agreement document <ArrowUpRight size={13} /></summary>
        <ContractDocument grant={grantRecord} llc={llc} owner={owner} />
      </details>
    </section>
  );
}

function VestingChart({
  data,
  yMax,
  cliffMarkers,
}: {
  data: VestingPoint[];
  yMax: number;
  cliffMarkers: { label: string; text: string }[];
}) {
  return (
    <div className="chart-wrap payout-chart">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 24, right: 16, left: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(138, 147, 163, .18)" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: "#8a93a3", fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={28} />
          <YAxis
            tick={{ fill: "#8a93a3", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={58}
            domain={[0, yMax]}
            tickFormatter={(value: number) => value.toLocaleString()}
          />
          <Tooltip
            cursor={{ stroke: "rgba(138, 147, 163, .35)" }}
            contentStyle={{ border: "1px solid rgba(138, 147, 163, .25)", borderRadius: 5, background: "#fdfcf9", fontFamily: "Work Sans" }}
            formatter={(value: unknown) => [`${Number(value).toLocaleString()} units`, "Vested units"]}
            labelFormatter={(label: unknown) => String(label)}
          />
          {cliffMarkers.map((marker) => (
            <ReferenceLine
              key={`${marker.label}-${marker.text}`}
              x={marker.label}
              stroke="#b07d3a"
              strokeDasharray="5 4"
              label={{ value: marker.text, position: "top", fill: "#b07d3a", fontSize: 10, letterSpacing: "0.08em" }}
            />
          ))}
          <Area
            type="monotone"
            dataKey="vestedUnits"
            stroke="#1f3164"
            strokeWidth={2.5}
            fill="rgba(31, 49, 100, .1)"
            activeDot={{ r: 5, fill: "#1f3164", stroke: "#fdfcf9", strokeWidth: 2 }}
            dot={(props: unknown) => {
              const { cx, cy, payload, key } = props as { cx?: number; cy?: number; payload?: VestingPoint; key?: string };
              if (cx === undefined || cy === undefined || !payload) return <g key={key} />;
              if (payload.isToday) {
                return (
                  <g key={key} className="today-marker" tabIndex={0}>
                    <circle cx={cx} cy={cy} r={11} fill="#b07d3a" className="today-marker-pulse" />
                    <circle cx={cx} cy={cy} r={4.5} fill="#b07d3a" stroke="#fdfcf9" strokeWidth={2} className="today-dot" />
                    <text x={cx} y={cy - 18} textAnchor="middle" fill="#b07d3a" fontSize={10} letterSpacing="0.08em">TODAY</text>
                  </g>
                );
              }
              return <circle key={key} cx={cx} cy={cy} r={3} fill="#1f3164" />;
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function ValuationHistoryCard({
  history,
  isPreCertification,
  analystEngaged,
}: {
  history: ValuationEvent[];
  isPreCertification: boolean;
  analystEngaged: boolean;
}) {
  const analystName = "Dr. Eleanor Cho";
  return (
    <section className="card">
      <div className="card-heading">
        <div>
          <span className="eyebrow">Company valuations</span>
          <h2>Valuation history</h2>
        </div>
        {isPreCertification && <span className="preliminary-pill">Latest figure preliminary</span>}
      </div>
      {history.length === 0 ? (
        <p className="empty-state">No certified valuations yet.</p>
      ) : (
        <ul className="employee-valuation-list">
          {history.map((event, index) => {
            const isLatest = index === history.length - 1;
            return (
              <li key={event.date} className="employee-valuation-row">
                <div>
                  <strong>{formatDate(event.date)}</strong>
                  <span>{event.cpaFirm ?? "Independent valuation"}</span>
                </div>
                <div className="employee-valuation-figures">
                  <strong>{currency.format(event.valuationAmount)}</strong>
                  <span>${event.resultingStrikePrice.toFixed(2)} / unit</span>
                </div>
                {isLatest && isPreCertification && (
                  <span className="status-label status-pending">Preliminary</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {analystEngaged && (
        <p className="employee-analyst-note">
          Valuation performed by <strong>{analystName}</strong>, CVA — Aequi Certified Analyst.
        </p>
      )}
    </section>
  );
}

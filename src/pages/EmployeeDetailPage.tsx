import { ArrowLeft, ArrowUpRight, ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
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
import { AppShell } from "@/components/AppShell";
import { formatDate } from "@/components/ValuationDetailModal";
import {
  getGrantsForEmployee,
  type GrantRecord,
} from "@/data/grantStore";
import { getAuthorizedUser, getEmployee, getLLCDetails } from "@/data/mockApi";
import { useGrantStore } from "@/data/useGrantStore";
import type { EquityGrant, ValuationEvent } from "@/data/types";
import { fullMonthsBetween, strikePriceAt, todayIso, vestedUnitsAsOf } from "@/data/vesting";

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

interface VestingPoint {
  label: string;
  dateIso: string;
  vestedUnits: number;
  vestedValue: number;
  isCliff: boolean;
  isToday: boolean;
}

function buildVestingSeries(grant: EquityGrant, valuationHistory: ValuationEvent[]): VestingPoint[] {
  const { vesting } = grant;
  const months = Math.max(fullMonthsBetween(vesting.grantDate, vesting.vestingCompletionDate), 1);
  const cliffMonths = fullMonthsBetween(vesting.grantDate, vesting.cliffDate);

  const points: VestingPoint[] = [];
  for (let month = 0; month <= months; month += 1) {
    const date = new Date(vesting.grantDate);
    date.setMonth(date.getMonth() + month);
    const iso = date.toISOString().slice(0, 10);
    const vestedUnits = vestedUnitsAsOf(grant, iso);
    points.push({
      label: date.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      dateIso: iso,
      vestedUnits,
      vestedValue: Math.round(vestedUnits * strikePriceAt(valuationHistory, iso)),
      isCliff: month === cliffMonths,
      isToday: false,
    });
  }
  return points;
}

/** Turn a runtime grant row into the EquityGrant shape the vesting math uses. */
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
    currentVestedAmount: 0, // recomputed below, live
    currentPayoutValue: 0,
  };
}

/**
 * Merge several schedules onto one calendar timeline. Points are keyed by
 * calendar month (not exact day, since agreements are issued on different
 * days), and each agreement's cumulative vested units are carried forward so
 * the combined line stays a true running total.
 */
function buildCombinedSeries(grants: EquityGrant[], history: ValuationEvent[]): VestingPoint[] {
  const monthKeys = new Set<string>();
  const perGrantMonths = grants.map((grant) => {
    const { vesting } = grant;
    const months = Math.max(fullMonthsBetween(vesting.grantDate, vesting.vestingCompletionDate), 1);
    const vestedByMonth = new Map<string, number>();
    for (let month = 0; month <= months; month += 1) {
      const date = new Date(vesting.grantDate);
      date.setMonth(date.getMonth() + month);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      vestedByMonth.set(key, vestedUnitsAsOf(grant, date.toISOString().slice(0, 10)));
      monthKeys.add(key);
    }
    return vestedByMonth;
  });

  const points: VestingPoint[] = [];
  const carryForward = grants.map(() => 0);
  for (const key of [...monthKeys].sort()) {
    let combinedUnits = 0;
    for (let i = 0; i < perGrantMonths.length; i += 1) {
      const vested = perGrantMonths[i].get(key);
      if (vested !== undefined) carryForward[i] = vested;
      combinedUnits += carryForward[i];
    }
    const [year, month] = key.split("-").map(Number);
    const date = new Date(year, month - 1, 1);
    points.push({
      label: date.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      dateIso: key,
      vestedUnits: combinedUnits,
      vestedValue: 0,
      isCliff: false,
      isToday: false,
    });
  }
  for (const point of points) {
    point.vestedValue = Math.round(point.vestedUnits * strikePriceAt(history, point.dateIso));
  }
  return points;
}

function formatYears(months: number): string {
  if (months % 12 === 0) return `${months / 12} yr${months === 12 ? "" : "s"}`;
  return `${months} mo`;
}

interface GrantView {
  key: string;
  grant: EquityGrant;
  status: "pending" | "active" | "rejected";
  /** For runtime agreements: link to the contract document. */
  contractId?: string;
}

export function EmployeeDetailPage() {
  const { employeeId } = useParams<{ employeeId: string }>();
  useGrantStore();
  const employee = employeeId ? getEmployee(employeeId) : null;
  const llc = employee ? getLLCDetails(employee.llcId) : null;
  const owner = llc ? getAuthorizedUser(llc.id) : null;
  const [showValue, setShowValue] = useState(true);
  const [expandedAgreements, setExpandedAgreements] = useState<Set<string>>(new Set());

  const runtimeGrants = employeeId ? getGrantsForEmployee(employeeId) : [];

  const grantViews = useMemo<GrantView[]>(() => {
    if (!employee) return [];
    const views: GrantView[] = [];
    if (employee.grant) {
      views.push({ key: "seed", grant: employee.grant, status: "active" });
    }
    for (const record of runtimeGrants) {
      views.push({
        key: record.id,
        grant: runtimeGrantToEquityGrant(record),
        status: record.status,
        contractId: record.id,
      });
    }
    return views;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee, runtimeGrants]);

  if (!employee || !llc) {
    return (
      <div className="page-state" style={{ padding: "48px" }}>
        <Link className="back-link" to="/">← Back to dashboard</Link>
        <p>Employee not found.</p>
      </div>
    );
  }

  const history = llc.valuationHistory ?? [];

  if (grantViews.length === 0) {
    return (
      <AppShell llc={llc} owner={owner}>
        <div className="history-page">
          <Link className="back-link" to="/"><ArrowLeft size={15} /> Back to dashboard</Link>
          <div className="page-intro history-intro">
            <div>
              <span className="eyebrow">Equity grant · {llc.name}</span>
              <h1>{employee.name}</h1>
              <p>{employee.roleOrPosition}</p>
            </div>
            <span className="mock-badge">Mock data</span>
          </div>
          <section className="card">
            <p className="empty-state">No equity grant has been issued for this employee yet.</p>
          </section>
        </div>
      </AppShell>
    );
  }

  // Live vested amounts per agreement (vesting.ts is the single source of truth).
  const liveViews = grantViews.map((view) => {
    const vestedUnits = vestedUnitsAsOf(view.grant, todayIso());
    const latestPrice = history.length > 0 ? history[history.length - 1].resultingStrikePrice : view.grant.strikePricePerUnit;
    return { ...view, vestedUnits, vestedValue: Math.round(vestedUnits * latestPrice) };
  });

  const totalUnitsAwarded = liveViews.reduce((sum, view) => sum + view.grant.unitsAwarded, 0);
  const totalVestedUnits = liveViews.reduce((sum, view) => sum + view.vestedUnits, 0);
  const totalVestedValue = liveViews.reduce((sum, view) => sum + view.vestedValue, 0);

  return (
    <AppShell llc={llc} owner={owner}>
      <div className="history-page employee-page">
        <Link className="back-link" to="/"><ArrowLeft size={15} /> Back to dashboard</Link>

        <section className="card payout-hero">
          <div className="payout-hero-header">
            <div>
              <h1 className="payout-employee">{employee.name} <span className="payout-company">· {llc.name}</span></h1>
              <span className="payout-units">
                {liveViews.length} agreement{liveViews.length === 1 ? "" : "s"} · {totalUnitsAwarded.toLocaleString()} units
              </span>
            </div>
            <button
              className="scale-toggle"
              type="button"
              onClick={() => setShowValue((current) => !current)}
              aria-pressed={showValue}
            >
              {showValue ? "Show vested units" : "Show vested value"}
            </button>
          </div>
          <div className="payout-headline">
            <strong>{currency.format(totalVestedValue)}</strong>
            <span>TOTAL VESTED PAYOUT · {totalVestedUnits.toLocaleString()} UNITS ACROSS ALL AGREEMENTS</span>
          </div>
        </section>

        <TotalVestingCard views={liveViews} history={history} showValue={showValue} />

        {liveViews.map((view, index) => (
          <AgreementDisclosure
            key={view.key}
            index={index}
            view={view}
            history={history}
            showValue={showValue}
            expanded={expandedAgreements.has(view.key)}
            onToggle={() =>
              setExpandedAgreements((current) => {
                const next = new Set(current);
                if (next.has(view.key)) next.delete(view.key);
                else next.add(view.key);
                return next;
              })
            }
          />
        ))}
      </div>
    </AppShell>
  );
}

interface CliffMarker {
  label: string;
  text: string;
}

interface VestingChartProps {
  data: VestingPoint[];
  showValue: boolean;
  yMax: number;
  cliffMarkers: CliffMarker[];
}

function VestingChart({ data, showValue, yMax, cliffMarkers }: VestingChartProps) {
  const dataKey = showValue ? "vestedValue" : "vestedUnits";
  const formatTick = (value: number) =>
    showValue
      ? `${value >= 1000 ? `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k` : value.toFixed(0)}`
      : value.toLocaleString();
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
            tickFormatter={formatTick}
          />
          <Tooltip
            cursor={{ stroke: "rgba(138, 147, 163, .35)" }}
            contentStyle={{ border: "1px solid rgba(138, 147, 163, .25)", borderRadius: 5, background: "#fdfcf9", fontFamily: "Work Sans" }}
            formatter={(value: unknown) =>
              showValue
                ? [currency.format(Number(value)), "Vested value"]
                : [`${Number(value).toLocaleString()} units`, "Vested units"]
            }
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
            dataKey={dataKey}
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

function TotalVestingCard({
  views,
  history,
  showValue,
}: {
  views: (GrantView & { vestedUnits: number; vestedValue: number })[];
  history: ValuationEvent[];
  showValue: boolean;
}) {
  if (views.length === 0) return null;

  const today = todayIso();
  const todayTime = new Date(today).getTime();
  const firstStart = Math.min(...views.map((v) => new Date(v.grant.vesting.grantDate).getTime()));
  const lastCompletion = Math.max(...views.map((v) => new Date(v.grant.vesting.vestingCompletionDate).getTime()));

  const series = buildCombinedSeries(views.map((v) => v.grant), history);

  const displaySeries = (() => {
    if (todayTime < firstStart || todayTime > lastCompletion || series.length === 0) return series;
    const units = views.reduce((sum, v) => sum + vestedUnitsAsOf(v.grant, today), 0);
    const todayPoint: VestingPoint = {
      label: new Date(today).toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      dateIso: today,
      vestedUnits: units,
      vestedValue: Math.round(units * strikePriceAt(history, today)),
      isCliff: false,
      isToday: true,
    };
    const insertIndex = series.findIndex((point) => new Date(point.dateIso).getTime() > todayTime);
    const next = [...series];
    if (insertIndex === -1) next.push(todayPoint);
    else next.splice(insertIndex, 0, todayPoint);
    return next;
  })();

  const cliffMarkers: CliffMarker[] = [];
  views.forEach((view, index) => {
    const cliffMonth = fullMonthsBetween(view.grant.vesting.grantDate, view.grant.vesting.cliffDate);
    const date = new Date(view.grant.vesting.grantDate);
    date.setMonth(date.getMonth() + cliffMonth);
    const label = date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    const existing = cliffMarkers.find((marker) => marker.label === label);
    if (existing) existing.text = `${existing.text}, ${index + 1}`;
    else cliffMarkers.push({ label, text: `CLIFF · AGMT ${index + 1}` });
  });

  const yMax = showValue
    ? Math.max(...displaySeries.map((p) => p.vestedValue), 1)
    : Math.max(...displaySeries.map((p) => p.vestedUnits), 1);

  const latestValuation = history[history.length - 1];
  const constantPrice = latestValuation?.resultingStrikePrice ?? views[0].grant.strikePricePerUnit;
  const fullyVestedLabel = formatDate(new Date(lastCompletion).toISOString().slice(0, 10));

  return (
    <section className="card total-vesting-card">
      <div className="card-heading">
        <div>
          <span className="eyebrow">All agreements combined</span>
          <h2>Total influx as schedules mature</h2>
        </div>
        <span className="updated-label">Fully vested by {fullyVestedLabel}</span>
      </div>
      <VestingChart data={displaySeries} showValue={showValue} yMax={yMax} cliffMarkers={cliffMarkers} />
      <p className="total-caption">
        Combined vested units across {views.length} agreement{views.length === 1 ? "" : "s"}, priced at the unit
        price in effect on each date.
        {latestValuation && (
          <> Beyond the {formatDate(latestValuation.date)} valuation, value is held constant at
          ${constantPrice.toFixed(2)} per unit until the next certified valuation.</>
        )}
      </p>
    </section>
  );
}

interface GrantAgreementCardProps {
  index: number;
  view: GrantView & { vestedUnits: number; vestedValue: number };
  history: ValuationEvent[];
  showValue: boolean;
}

/** Collapsible summary row for one agreement; the full card is revealed on click. */
function AgreementDisclosure({
  index,
  view,
  history,
  showValue,
  expanded,
  onToggle,
}: {
  index: number;
  view: GrantView & { vestedUnits: number; vestedValue: number };
  history: ValuationEvent[];
  showValue: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { grant, status } = view;
  const summary =
    status === "pending"
      ? "Awaiting signature"
      : `${formatYears(grant.vesting.scheduleLengthMonths)} schedule`;

  return (
    <section className={`card grant-agreement-card${expanded ? " disclosure-open" : ""}`}>
      <button className="disclosure-toggle" type="button" aria-expanded={expanded} onClick={onToggle}>
        <span className="disclosure-bullet">{index + 1}</span>
        <span className="disclosure-title">
          <span className="eyebrow">Agreement {index + 1}</span>
          <strong>
            {grant.unitsAwarded.toLocaleString()} units · {summary}
          </strong>
        </span>
        <span className="disclosure-meta">
          {formatDate(grant.vesting.cliffDate)} — {formatDate(grant.vesting.vestingCompletionDate)}
        </span>
        <ChevronDown size={16} className="disclosure-chevron" />
      </button>
      {expanded && (
        <GrantAgreementCard index={index} view={view} history={history} showValue={showValue} />
      )}
    </section>
  );
}

function GrantAgreementCard({ index, view, history, showValue }: GrantAgreementCardProps) {
  const { grant, status, contractId } = view;
  const today = todayIso();
  const todayTime = new Date(today).getTime();
  const grantStartTime = new Date(grant.vesting.grantDate).getTime();
  const completionTime = new Date(grant.vesting.vestingCompletionDate).getTime();

  const series = useMemo(
    () => buildVestingSeries(grant, history),
    [grant, history]
  );

  const cliffMonths = Math.max(fullMonthsBetween(grant.vesting.grantDate, grant.vesting.cliffDate), 0);
  const vestedPercent = grant.unitsAwarded > 0
    ? Math.min((view.vestedUnits / grant.unitsAwarded) * 100, 100)
    : 0;
  const latestValuation = history[history.length - 1];
  const currentPrice = latestValuation?.resultingStrikePrice ?? grant.strikePricePerUnit;
  const triggers = grant.vesting.vestingTriggers.filter((trigger) => trigger.percentOfAward > 0);
  const slowdowns = grant.vesting.vestingSlowdowns.filter(
    (slowdown) => slowdown.toMonth > slowdown.fromMonth && slowdown.paceMultiplier < 1
  );
  const stillInCliff = view.vestedUnits === 0 && vestedPercent < 100;

  // Insert a "today" marker into the series.
  const displaySeries = useMemo(() => {
    if (todayTime < grantStartTime || todayTime > completionTime || series.length === 0) return series;
    const todayPoint: VestingPoint = {
      label: new Date(today).toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      dateIso: today,
      vestedUnits: view.vestedUnits,
      vestedValue: view.vestedValue,
      isCliff: false,
      isToday: true,
    };
    const insertIndex = series.findIndex((point) => new Date(point.dateIso).getTime() > todayTime);
    const next = [...series];
    if (insertIndex === -1) next.push(todayPoint);
    else next.splice(insertIndex, 0, todayPoint);
    return next;
  }, [series, todayTime, grantStartTime, completionTime, today, view.vestedUnits, view.vestedValue]);

  const cliffPoint = series.find((point) => point.isCliff);
  const cliffMarkers: CliffMarker[] = cliffPoint ? [{ label: cliffPoint.label, text: "CLIFF" }] : [];

  return (
    <>
      <div className="card-heading">
        <div>
          <span className="eyebrow">Agreement {index + 1}</span>
          <h2>
            {grant.unitsAwarded.toLocaleString()} units · {formatYears(grant.vesting.scheduleLengthMonths)} schedule
            {status === "pending" && <span className="status-label status-pending">Awaiting signature</span>}
          </h2>
        </div>
        {contractId ? (
          <Link className="contract-link" to={`/contracts/${contractId}`}>
            View contract <ArrowUpRight size={13} />
          </Link>
        ) : (
          <span className="updated-label">{grant.contractDocumentName}</span>
        )}
      </div>

      <div className="grant-facts">
        <div className="grant-fact"><span>Issue date</span><strong>{formatDate(grant.grantDate)}</strong></div>
        <div className="grant-fact"><span>Cliff</span><strong>{formatYears(cliffMonths)} · {formatDate(grant.vesting.cliffDate)}</strong></div>
        <div className="grant-fact"><span>Fully vested</span><strong>{formatDate(grant.vesting.vestingCompletionDate)}</strong></div>
        <div className="grant-fact"><span>Unit price at issue</span><strong>${grant.strikePricePerUnit.toFixed(2)}</strong></div>
        {triggers.length > 0 && (
          <div className="grant-fact">
            <span>Triggers</span>
            <strong>{triggers.map((trigger) => `${trigger.percentOfAward}% @ mo ${trigger.atMonth}`).join(", ")}</strong>
          </div>
        )}
        {slowdowns.length > 0 && (
          <div className="grant-fact">
            <span>Slow windows</span>
            <strong>{slowdowns.map((slowdown) => `mo ${slowdown.fromMonth}–${slowdown.toMonth} @ ${Math.round(slowdown.paceMultiplier * 100)}%`).join(", ")}</strong>
          </div>
        )}
      </div>

      <VestingChart
        data={displaySeries}
        showValue={showValue}
        yMax={showValue ? Math.max(...displaySeries.map((p) => p.vestedValue), 1) : grant.unitsAwarded}
        cliffMarkers={cliffMarkers}
      />

      <div className="vesting-progress">
        <div className="vesting-progress-header">
          <span>Vesting progress</span>
          <strong>{view.vestedUnits.toLocaleString()} of {grant.unitsAwarded.toLocaleString()} units · {vestedPercent.toFixed(0)}%</strong>
        </div>
        <div className="vesting-progress-bar">
          <div className="vesting-progress-fill" style={{ width: `${vestedPercent}%` }} />
        </div>
      </div>

      {status === "pending" && (
        <p className="payout-projected">
          Awaiting the employee's decision — they can accept or decline this agreement in their
          own portal.
        </p>
      )}
      {status === "rejected" && (
        <p className="payout-projected payout-projected-warning">
          Declined by the employee — revise the terms and re-send, or withdraw this offer.
        </p>
      )}

      {stillInCliff && (
        <p className="payout-projected">
          Still in the cliff — projected value upon full vesting:{" "}
          <strong>{currency.format(grant.unitsAwarded * currentPrice)}</strong>
          <span> — all {grant.unitsAwarded.toLocaleString()} units × ${currentPrice.toFixed(2)} current unit price</span>
        </p>
      )}
    </>
  );
}

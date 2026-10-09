import { ArrowLeft, ArrowUpRight } from "lucide-react";
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
import { getAuthorizedUser, getEmployee, getLLCDetails } from "@/data/mockApi";
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

function formatYears(months: number): string {
  if (months % 12 === 0) return `${months / 12} yr${months === 12 ? "" : "s"}`;
  return `${months} mo`;
}

export function EmployeeDetailPage() {
  const { employeeId } = useParams<{ employeeId: string }>();
  const employee = employeeId ? getEmployee(employeeId) : null;
  const llc = employee ? getLLCDetails(employee.llcId) : null;
  const owner = llc ? getAuthorizedUser(llc.id) : null;
  const [showValue, setShowValue] = useState(true);

  const grant = employee?.grant ?? null;
  const history = llc?.valuationHistory ?? [];
  const series = grant && history.length > 0 ? buildVestingSeries(grant, history) : [];

  if (!employee || !llc) {
    return (
      <div className="page-state" style={{ padding: "48px" }}>
        <Link className="back-link" to="/">← Back to dashboard</Link>
        <p>Employee not found.</p>
      </div>
    );
  }

  if (!grant) {
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

  const cliffMonths = Math.max(fullMonthsBetween(grant.vesting.grantDate, grant.vesting.cliffDate), 0);
  const cliffLabel = formatDate(grant.vesting.cliffDate);
  const fullyVestedLabel = formatDate(grant.vesting.vestingCompletionDate);
  const latestValuation = history[history.length - 1];
  const currentPrice = latestValuation?.resultingStrikePrice ?? grant.strikePricePerUnit;
  const initialPrice = grant.strikePricePerUnit;
  const finalPrice = latestValuation?.resultingStrikePrice ?? initialPrice;

  const avgYoY =
    history.length >= 2
      ? (() => {
          const first = history[0];
          const last = history[history.length - 1];
          const years = (new Date(last.date).getTime() - new Date(first.date).getTime()) / (365.25 * 24 * 60 * 60 * 1000);
          if (years <= 0 || first.resultingStrikePrice <= 0) return null;
          return (Math.pow(last.resultingStrikePrice / first.resultingStrikePrice, 1 / years) - 1) * 100;
        })()
      : null;

  const vestedPercent = grant.unitsAwarded > 0
    ? Math.min((grant.currentVestedAmount / grant.unitsAwarded) * 100, 100)
    : 0;
  const stillInCliff = grant.currentVestedAmount === 0 && vestedPercent < 100;
  const projectedPayout = grant.unitsAwarded * currentPrice;

  const dataKey = showValue ? "vestedValue" : "vestedUnits";
  const formatTick = (value: number) =>
    showValue
      ? `$${value >= 1000 ? `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k` : value.toFixed(0)}`
      : value.toLocaleString();
  const cliffPoint = series.find((point) => point.isCliff);

  const today = todayIso();
  const todayTime = new Date(today).getTime();
  const grantStartTime = new Date(grant.vesting.grantDate).getTime();
  const completionTime = new Date(grant.vesting.vestingCompletionDate).getTime();
  const showTodayMarker = todayTime >= grantStartTime && todayTime <= completionTime;

  const displaySeries = useMemo(() => {
    if (!showTodayMarker || series.length === 0) return series;
    const vestedUnits = vestedUnitsAsOf(grant, today);
    const todayPoint: VestingPoint = {
      label: new Date(today).toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      dateIso: today,
      vestedUnits,
      vestedValue: Math.round(vestedUnits * strikePriceAt(history, today)),
      isCliff: false,
      isToday: true,
    };
    const insertIndex = series.findIndex((point) => new Date(point.dateIso).getTime() > todayTime);
    const next = [...series];
    if (insertIndex === -1) next.push(todayPoint);
    else next.splice(insertIndex, 0, todayPoint);
    return next;
  }, [series, showTodayMarker, todayTime, today, grant, history, completionTime]);

  return (
    <AppShell llc={llc} owner={owner}>
      <div className="history-page employee-page">
        <Link className="back-link" to="/"><ArrowLeft size={15} /> Back to dashboard</Link>

        <section className="card payout-hero">
          <div className="payout-hero-header">
            <div>
              <h1 className="payout-employee">{employee.name} <span className="payout-company">· {llc.name}</span></h1>
              <span className="payout-units">{grant.unitsAwarded.toLocaleString()} units</span>
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
            <strong>{currency.format(showValue ? grant.currentPayoutValue : grant.currentVestedAmount)}</strong>
            <span>TOTAL VESTED {showValue ? "PAYOUT" : "UNITS"}</span>
          </div>
          {stillInCliff && (
            <p className="payout-projected">
              Projected value upon vesting: <strong>{currency.format(projectedPayout)}</strong>
              <span> — all {grant.unitsAwarded.toLocaleString()} units × ${currentPrice.toFixed(2)} current unit price, if held to {fullyVestedLabel}</span>
            </p>
          )}
        </section>

        <section className="card payout-chart-card">
          <div className="chart-wrap payout-chart">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={displaySeries} margin={{ top: 24, right: 16, left: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(138, 147, 163, .18)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "#8a93a3", fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={28} />
                <YAxis
                  tick={{ fill: "#8a93a3", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={58}
                  domain={[0, showValue ? Math.max(...displaySeries.map((p) => p.vestedValue)) : grant.unitsAwarded]}
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
                {cliffPoint && (
                  <ReferenceLine
                    x={cliffPoint.label}
                    stroke="#b07d3a"
                    strokeDasharray="5 4"
                    label={{ value: "CLIFF · YR 1", position: "top", fill: "#b07d3a", fontSize: 10, letterSpacing: "0.08em" }}
                  />
                )}
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
          <div className="payout-stat-row">
            <div className="payout-stat"><span>Vesting</span><strong>{formatYears(grant.vesting.scheduleLengthMonths)}</strong></div>
            <div className="payout-stat"><span>Cliff</span><strong>{formatYears(cliffMonths)}</strong></div>
            <div className="payout-stat"><span>Initial price</span><strong>${initialPrice.toFixed(2)}</strong></div>
            <div className="payout-stat"><span>Final price</span><strong>${finalPrice.toFixed(2)}</strong></div>
            <div className="payout-stat"><span>Avg YoY</span><strong>{avgYoY === null ? "—" : `${avgYoY.toFixed(2)}%`}</strong></div>
          </div>
        </section>

        <section className="card">
          <div className="card-heading">
            <div>
              <span className="eyebrow">Grant details</span>
              <h2>Schedule &amp; agreement</h2>
            </div>
            <span className="updated-label">
              {employee.roleOrPosition} · {employee.employmentStatus === "active" ? "Active" : `Terminated ${formatDate(employee.terminationDate ?? "")}`}
            </span>
          </div>
          <div className="grant-facts">
            <div className="grant-fact"><span>Issue date</span><strong>{formatDate(grant.grantDate)}</strong></div>
            <div className="grant-fact"><span>Cliff date</span><strong>{cliffLabel}</strong></div>
            <div className="grant-fact"><span>Fully vested</span><strong>{fullyVestedLabel}</strong></div>
            <div className="grant-fact"><span>Monthly rate</span><strong>{grant.vesting.monthlyVestingRate.toFixed(2).replace(/\.00$/, "")} units</strong></div>
            <div className="grant-fact"><span>Units awarded</span><strong>{grant.unitsAwarded.toLocaleString()}</strong></div>
            <div className="grant-fact">
              <span>Equity agreement</span>
              <strong className="document-link">{grant.contractDocumentName} <ArrowUpRight size={14} /></strong>
            </div>
          </div>
          <div className="vesting-progress">
            <div className="vesting-progress-header">
              <span>Vesting progress</span>
              <strong>{grant.currentVestedAmount.toLocaleString()} of {grant.unitsAwarded.toLocaleString()} units · {vestedPercent.toFixed(0)}%</strong>
            </div>
            <div className="vesting-progress-bar">
              <div className="vesting-progress-fill" style={{ width: `${vestedPercent}%` }} />
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/AppShell";
import { getAuthorizedUser, getEmployee, getLLCDetails } from "@/data/mockApi";
import type { EquityGrant } from "@/data/types";
import { formatDate } from "@/components/ValuationDetailModal";

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

interface VestingPoint {
  label: string;
  vested: number;
  isCliff: boolean;
}

function buildVestingSeries(grant: EquityGrant): VestingPoint[] {
  const { unitsAwarded, vesting } = grant;
  const months = vesting.scheduleLengthMonths;
  const cliffMonths = Math.max(
    Math.round(
      (new Date(vesting.cliffDate).getTime() - new Date(vesting.grantDate).getTime()) /
        (365.25 * 24 * 60 * 60 * 1000) * 12
    ),
    0
  );
  const monthsAfterCliff = Math.max(months - cliffMonths, 1);
  const monthlyAfterCliff = unitsAwarded / monthsAfterCliff;

  const points: VestingPoint[] = [];
  for (let month = 0; month <= months; month += 1) {
    const date = new Date(vesting.grantDate);
    date.setMonth(date.getMonth() + month);
    const vested =
      month < cliffMonths
        ? 0
        : Math.min(Math.round((month - cliffMonths) * monthlyAfterCliff), unitsAwarded);
    points.push({
      label: date.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      vested,
      isCliff: month === cliffMonths,
    });
  }
  return points;
}

export function EmployeeDetailPage() {
  const { employeeId } = useParams<{ employeeId: string }>();
  const employee = employeeId ? getEmployee(employeeId) : null;
  const llc = employee ? getLLCDetails(employee.llcId) : null;
  const owner = llc ? getAuthorizedUser(llc.id) : null;

  const vestingSeries = useMemo(
    () => (employee?.grant ? buildVestingSeries(employee.grant) : []),
    [employee]
  );

  if (!employee || !llc) {
    return (
      <div className="page-state" style={{ padding: "48px" }}>
        <Link className="back-link" to="/">← Back to dashboard</Link>
        <p>Employee not found.</p>
      </div>
    );
  }

  const grant = employee.grant;
  const cliffLabel = grant ? formatDate(grant.vesting.cliffDate) : "—";
  const fullyVestedLabel = grant ? formatDate(grant.vesting.vestingCompletionDate) : "—";
  const vestedPercent = grant && grant.unitsAwarded > 0
    ? Math.min((grant.currentVestedAmount / grant.unitsAwarded) * 100, 100)
    : 0;

  return (
    <AppShell llc={llc} owner={owner}>
      <div className="history-page">
        <Link className="back-link" to="/">
          <ArrowLeft size={15} /> Back to dashboard
        </Link>
        <div className="page-intro history-intro">
          <div>
            <span className="eyebrow">Equity grant · {llc.name}</span>
            <h1>{employee.name}</h1>
            <p>
              {employee.roleOrPosition} · {employee.employmentStatus === "active" ? "Active" : "Terminated"}
              {employee.terminationDate ? ` ${formatDate(employee.terminationDate)}` : ""}
            </p>
          </div>
          <span className="mock-badge">Mock data</span>
        </div>

        {grant ? (
          <>
            <div className="vesting-stats">
              <section className="card stat-card">
                <span className="stat-label">Units awarded</span>
                <strong>{grant.unitsAwarded.toLocaleString()}</strong>
                <span className="stat-sub">phantom units</span>
              </section>
              <section className="card stat-card">
                <span className="stat-label">Unit price (strike)</span>
                <strong>${grant.strikePricePerUnit.toFixed(2)}</strong>
                <span className="stat-sub">per unit, set at grant</span>
              </section>
              <section className="card stat-card">
                <span className="stat-label">Vested to date</span>
                <strong>{grant.currentVestedAmount.toLocaleString()}</strong>
                <span className="stat-sub">units · {vestedPercent.toFixed(0)}% of grant</span>
              </section>
              <section className="card stat-card">
                <span className="stat-label">Vested value</span>
                <strong>{currency.format(grant.currentPayoutValue)}</strong>
                <span className="stat-sub">vested units × current unit price</span>
              </section>
              <section className="card stat-card">
                <span className="stat-label">Fully vested</span>
                <strong>{fullyVestedLabel}</strong>
                <span className="stat-sub">{grant.vesting.scheduleLengthMonths}-month schedule</span>
              </section>
            </div>

            <div className="vesting-grid">
              <section className="card">
                <div className="card-heading">
                  <div>
                    <span className="eyebrow">Vesting schedule</span>
                    <h2>Cumulative units vested</h2>
                  </div>
                  <span className="updated-label">
                    Grant {formatDate(grant.vesting.grantDate)} · Cliff {cliffLabel}
                  </span>
                </div>
                <div className="chart-wrap">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={vestingSeries} margin={{ top: 16, right: 12, left: -14, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(138, 147, 163, .18)" vertical={false} />
                      <XAxis dataKey="label" tick={{ fill: "#8a93a3", fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={28} />
                      <YAxis hide domain={[0, grant.unitsAwarded]} />
                      <Tooltip
                        cursor={{ stroke: "rgba(138, 147, 163, .35)" }}
                        contentStyle={{ border: "1px solid rgba(138, 147, 163, .25)", borderRadius: 5, background: "#fdfcf9", fontFamily: "IBM Plex Sans" }}
                        formatter={(value: unknown) => [`${Number(value).toLocaleString()} units`, "Vested"]}
                        labelFormatter={(label: unknown) => String(label)}
                      />
                      <Area
                        type="stepAfter"
                        dataKey="vested"
                        stroke="#1f3164"
                        strokeWidth={2}
                        fill="rgba(31, 49, 100, .08)"
                        dot={false}
                        activeDot={{ r: 5, fill: "#1f3164", stroke: "#fdfcf9", strokeWidth: 2 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <p className="chart-note">
                  <span className="chart-line" /> Flat until the 1-year cliff ({cliffLabel}), then
                  {" "}{grant.vesting.monthlyVestingRate.toFixed(2).replace(/\.00$/, "")} units/month until fully vested on {fullyVestedLabel}.
                </p>
              </section>

              <section className="card">
                <div className="card-heading">
                  <div>
                    <span className="eyebrow">Grant facts</span>
                    <h2>Details</h2>
                  </div>
                </div>
                <div className="grant-facts">
                  <div className="grant-fact"><span>Issue date</span><strong>{formatDate(grant.grantDate)}</strong></div>
                  <div className="grant-fact"><span>Cliff date</span><strong>{cliffLabel}</strong></div>
                  <div className="grant-fact"><span>Fully vested</span><strong>{fullyVestedLabel}</strong></div>
                  <div className="grant-fact"><span>Vesting length</span><strong>{grant.vesting.scheduleLengthMonths} months</strong></div>
                  <div className="grant-fact"><span>Monthly rate</span><strong>{grant.vesting.monthlyVestingRate.toFixed(2).replace(/\.00$/, "")} units</strong></div>
                  <div className="grant-fact">
                    <span>Equity agreement</span>
                    <strong className="document-link">{grant.contractDocumentName} <ArrowUpRight size={14} /></strong>
                  </div>
                </div>
              </section>
            </div>
          </>
        ) : (
          <section className="card">
            <p className="empty-state">No equity grant has been issued for this employee yet.</p>
          </section>
        )}
      </div>
    </AppShell>
  );
}

import { ArrowUpRight } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import type { LLC, UnitHolderSegment } from "@/data/types";

interface EquityPoolSummaryProps {
  llc: LLC;
  holders: UnitHolderSegment[];
}

const segmentColors = ["#1f3164", "#4a7c59", "#8a93a3"];

type BarScale = "company" | "pool";

export function EquityPoolSummary({ llc, holders }: EquityPoolSummaryProps) {
  const [scale, setScale] = useState<BarScale>("company");

  const authorized = llc.totalUnitsAuthorized;
  const poolUnits = (llc.equityPoolPercent / 100) * authorized;
  const roleHolders = holders.filter((holder) => holder.role !== null);
  const allocatedUnits = roleHolders.reduce((sum, holder) => sum + holder.units, 0);

  // Company view: one solid navy block for the whole pool, then the rest of
  // the company — no per-holder separations at this zoom. Pool view: the bar
  // is the 10% pool, so each segment is units/poolUnits and the tail is
  // unallocated pool capacity. The tail keeps one stable key so it morphs
  // rather than remounts when toggling.
  const denominator = scale === "company" ? authorized : poolUnits;
  const tailUnits = scale === "company"
    ? Math.max(authorized - allocatedUnits, 0)
    : Math.max(poolUnits - allocatedUnits, 0);

  const segments = scale === "company"
    ? [
        { label: "pool", role: null, units: poolUnits, percentOfPool: 0 },
        { label: "remainder", role: null, units: tailUnits, percentOfPool: 0 },
      ]
    : [
      ...roleHolders,
      ...(tailUnits > 0
        ? [{ label: "remainder", role: null, units: tailUnits, percentOfPool: 0 }]
        : []),
    ];

  return (
    <section className="card summary-card">
      <div className="card-heading">
        <div>
          <span className="eyebrow">Equity pool</span>
          <h2>Pool allocation</h2>
        </div>
        <button
          className="scale-toggle"
          type="button"
          onClick={() => setScale((current) => (current === "company" ? "pool" : "company"))}
          aria-pressed={scale === "pool"}
        >
          {scale === "company" ? "View Pool" : "View Company"}
        </button>
      </div>
      <div className="pool-visual">
        <div className="pool-stat">
          <strong>{llc.unitsIssued.toLocaleString()}</strong>
          <span>
            issued units of {authorized.toLocaleString()} authorized
          </span>
        </div>
        <div
          className="pool-bar"
          role="img"
          aria-label={scale === "company"
            ? `Pool allocation (share of company): equity pool ${(poolUnits / authorized * 100).toFixed(1)}%`
            : `Pool allocation (share of equity pool): ${roleHolders
              .map((holder) => `${holder.label} ${holder.percentOfPool.toFixed(1)}%`)
              .join(", ")}`}
        >
          {segments.map((segment, index) => {
            const isTail = segment.label === "remainder";
            const isPoolBlock = segment.label === "pool";
            const color = isTail
              ? scale === "company" ? "#d9d7ce" : "#eceae2"
              : isPoolBlock ? segmentColors[0] : segmentColors[index % segmentColors.length];
            return (
              <div
                className={isPoolBlock && scale === "company"
                  ? "pool-bar-segment pool-bar-segment-clickable"
                  : "pool-bar-segment"}
                key={segment.label}
                onClick={isPoolBlock && scale === "company"
                  ? () => setScale("pool")
                  : undefined}
                style={{
                  width: `${(segment.units / denominator) * 100}%`,
                  backgroundColor: color,
                }}
                title={
                  isTail
                    ? scale === "company"
                      ? `Not in pool — ${(segment.units / authorized * 100).toFixed(1)}% of company (${segment.units.toLocaleString()} units)`
                      : `Unallocated pool — ${(segment.units / poolUnits * 100).toFixed(1)}% of pool (${segment.units.toLocaleString()} units)`
                    : isPoolBlock
                      ? `Equity pool — ${(segment.units / authorized * 100).toFixed(1)}% of company (${segment.units.toLocaleString()} units) — click to view breakdown`
                      : `${segment.label} — ${segment.percentOfPool.toFixed(1)}% (${segment.units.toLocaleString()} units)`
                }
              />
            );
          })}
        </div>
        <p className="pool-scale-note">
          {scale === "company"
            ? `Bar is the full ${authorized.toLocaleString()}-unit company.`
            : `Bar is the ${llc.equityPoolPercent}% equity pool (${poolUnits.toLocaleString()} units) — holders shown as shares of the pool.`}
        </p>
        <div className="pool-legend" aria-label="Top unit holders">
          {roleHolders.map((holder, index) => (
            <div className="legend-item" key={holder.label}>
              <span
                className="legend-swatch"
                style={{ backgroundColor: segmentColors[index % segmentColors.length] }}
              />
              {holder.employeeId ? (
                <Link className="holder-link" to={`/employees/${holder.employeeId}`}>
                  {holder.label}
                </Link>
              ) : (
                <span>{holder.label}</span>
              )}
              <strong>{holder.percentOfPool.toFixed(1)}%</strong>
            </div>
          ))}
        </div>
      </div>
      <div className="holder-list">
        <div className="list-header"><span>Holder</span><span>Share</span></div>
        {roleHolders.map((holder) => (
          <div className="holder-row" key={holder.label}>
            <div>
              {holder.employeeId ? (
                <Link className="holder-link" to={`/employees/${holder.employeeId}`}>
                  {holder.label}
                </Link>
              ) : (
                <strong>{holder.label}</strong>
              )}
              <span>{holder.role}</span>
            </div>
            <strong className="tnum">{holder.percentOfPool.toFixed(1)}%</strong>
          </div>
        ))}
      </div>
      <Link className="card-link" to="/employees">
        View full Employee List <ArrowUpRight size={15} />
      </Link>
    </section>
  );
}

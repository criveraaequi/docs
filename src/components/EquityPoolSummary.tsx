import { ArrowUpRight } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import type { LLC, UnitHolderSegment } from "@/data/types";

interface EquityPoolSummaryProps {
  llc: LLC;
  holders: UnitHolderSegment[];
}

const segmentColors = ["#1f3164", "#4a7c59", "#8a93a3", "#d9d7ce"];

type BarScale = "company" | "pool";

export function EquityPoolSummary({ llc, holders }: EquityPoolSummaryProps) {
  const [scale, setScale] = useState<BarScale>("company");

  const allocated = holders
    .filter((holder) => holder.role !== null)
    .reduce((sum, holder) => sum + holder.units, 0);
  const authorized = llc.totalUnitsAuthorized;
  const scaleDenominator = scale === "company" ? authorized : allocated;
  const scalePercent = scale === "company" ? 100 : (allocated / authorized) * 100;

  const segmentWidth = (holder: UnitHolderSegment) => {
    const relative = (holder.units / scaleDenominator) * 100;
    return scale === "company" ? relative : relative * (scalePercent / 100);
  };

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
          aria-label={`Pool allocation (${scale === "company" ? "share of company" : "share of equity pool"}): ${holders
            .map((holder) => `${holder.label} ${holder.percentOfPool.toFixed(1)}%`)
            .join(", ")}`}
        >
          {holders.map((holder, index) => (
            <div
              className="pool-bar-segment"
              key={holder.label}
              style={{
                width: `${segmentWidth(holder)}%`,
                backgroundColor: segmentColors[index % segmentColors.length],
              }}
              title={`${holder.label} — ${holder.percentOfPool.toFixed(1)}% (${holder.units.toLocaleString()} units)`}
            />
          ))}
        </div>
        <p className="pool-scale-note">
          {scale === "company"
            ? `Segments show each holder's share of the full ${authorized.toLocaleString()}-unit company.`
            : `Bar rescaled to the ${llc.equityPoolPercent}% equity pool — segments show each holder's share of issued units.`}
        </p>
        <div className="pool-legend" aria-label="Top unit holders">
          {holders.map((holder, index) => (
            <div className="legend-item" key={holder.label}>
              <span
                className="legend-swatch"
                style={{ backgroundColor: segmentColors[index % segmentColors.length] }}
              />
              <span>{holder.label}</span>
              <strong>{holder.percentOfPool.toFixed(1)}%</strong>
            </div>
          ))}
        </div>
      </div>
      <div className="holder-list">
        <div className="list-header"><span>Holder</span><span>Share</span></div>
        {holders.filter((holder) => holder.role).map((holder) => (
          <div className="holder-row" key={holder.label}>
            <div><strong>{holder.label}</strong><span>{holder.role}</span></div>
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

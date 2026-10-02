import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { LLC, UnitHolderSegment } from "@/data/types";

interface EquityPoolSummaryProps {
  llc: LLC;
  holders: UnitHolderSegment[];
}

const segmentColors = ["#1f3164", "#4a7c59", "#8a93a3", "#d9d7ce"];

export function EquityPoolSummary({ llc, holders }: EquityPoolSummaryProps) {
  const conicStops = holders
    .map((holder, index) => `${segmentColors[index % segmentColors.length]} ${holder.percentOfPool}%`)
    .reduce((stops, stop, index) => {
      const prior = index === 0 ? 0 : holders.slice(0, index).reduce((sum, item) => sum + item.percentOfPool, 0);
      return [...stops, `${stop.replace(`${holders[index].percentOfPool}%`, `${prior}% ${prior + holders[index].percentOfPool}%`)}`];
    }, [] as string[])
    .join(", ");

  return (
    <section className="card summary-card">
      <div className="card-heading">
        <div>
          <span className="eyebrow">Equity pool</span>
          <h2>Pool allocation</h2>
        </div>
        <span className="pool-size">Pool: {llc.equityPoolPercent}%</span>
      </div>
      <div className="pool-visual">
        <div className="donut" style={{ background: `conic-gradient(${conicStops})` }}>
          <div className="donut-center">
            <strong>{llc.unitsIssued.toLocaleString()}</strong>
            <span>issued units</span>
          </div>
        </div>
        <div className="pool-legend" aria-label="Top unit holders">
          {holders.map((holder, index) => (
            <div className="legend-item" key={holder.label}>
              <span className="legend-swatch" style={{ backgroundColor: segmentColors[index % segmentColors.length] }} />
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

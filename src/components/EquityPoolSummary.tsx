import { ArrowUpRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { LLC, UnitHolderSegment } from "@/data/types";

interface EquityPoolSummaryProps {
  llc: LLC;
  holders: UnitHolderSegment[];
}

// Ordered so adjacent segments contrast in hue and lightness; the rank-1
// holder always takes the first color and keeps it across visits.
const holderColors = [
  "#1f3164", // navy
  "#4a7c59", // sage green
  "#c0803c", // ochre
  "#8a93a3", // slate
  "#ad5f3e", // terracotta
  "#3d7a7a", // teal
  "#a56b6b", // dusty rose
  "#76793d", // olive
  "#c4b581", // warm sand
];
const poolRemainderColor = "#eceae2";
const companyRemainderColor = "#d9d7ce";

type BarScale = "company" | "pool";

interface Segment {
  label: string;
  role: string | null;
  units: number;
  percentOfPool: number;
  color: string;
}

const EXIT_MS = 300;

export function EquityPoolSummary({ llc, holders }: EquityPoolSummaryProps) {
  const [scale, setScale] = useState<BarScale>("company");

  const authorized = llc.totalUnitsAuthorized;
  const poolUnits = (llc.equityPoolPercent / 100) * authorized;
  const roleHolders = holders.filter((holder) => holder.role !== null);
  const allocatedUnits = roleHolders.reduce((sum, holder) => sum + holder.units, 0);
  const companyFactor = poolUnits / authorized;
  const displayPercent = (percentOfPool: number) =>
    scale === "company" ? percentOfPool * companyFactor : percentOfPool;
  const visibleHolders = roleHolders.slice(0, 3);
  const hiddenHolderCount = roleHolders.length - visibleHolders.length;

  // Company view: one solid navy block for the whole pool, then the rest of
  // the company — no per-holder separations at this zoom. Pool view: the bar
  // is the 10% pool, so each segment is units/poolUnits and the tail is
  // unallocated pool capacity. The tail keeps one stable key so it morphs
  // rather than remounts when toggling.
  const denominator = scale === "company" ? authorized : poolUnits;
  const tailUnits = scale === "company"
    ? Math.max(authorized - allocatedUnits, 0)
    : Math.max(poolUnits - allocatedUnits, 0);

  const currentSegments: Segment[] = scale === "company"
    ? [
        { label: "pool", role: null, units: poolUnits, percentOfPool: 0, color: holderColors[0] },
        { label: "remainder", role: null, units: tailUnits, percentOfPool: 0, color: companyRemainderColor },
      ]
    : [
      ...roleHolders.map((holder, index) => ({
        ...holder,
        color: holderColors[index % holderColors.length],
      })),
      ...(tailUnits > 0
        ? [{ label: "remainder", role: null, units: tailUnits, percentOfPool: 0, color: poolRemainderColor }]
        : []),
    ];

  // Hold segments that are leaving the bar mounted briefly so they fade out
  // instead of vanishing in a single frame.
  const [renderedSegments, setRenderedSegments] = useState<Segment[]>(currentSegments);
  const exitingKeys = useRef<Set<string>>(new Set());
  const exitTimer = useRef<number | null>(null);

  useEffect(() => {
    const rendered = new Map(renderedSegments.map((segment) => [segment.label, segment]));
    const nextKeys = new Set(currentSegments.map((segment) => segment.label));
    const stillExiting = [...exitingKeys.current].filter((key) => !nextKeys.has(key));
    const merged = currentSegments.map((segment) => {
      const previous = rendered.get(segment.label);
      return previous ? { ...segment, color: previous.color } : segment;
    });
    for (const key of stillExiting) {
      const previous = rendered.get(key);
      if (previous) merged.push(previous);
    }
    setRenderedSegments(merged);
    exitingKeys.current = new Set(stillExiting);

    if (exitTimer.current !== null) window.clearTimeout(exitTimer.current);
    if (stillExiting.length > 0) {
      exitTimer.current = window.setTimeout(() => {
        exitingKeys.current = new Set();
        setRenderedSegments((segments) => segments.filter((segment) => !exitingKeys.current.has(segment.label) && nextKeys.has(segment.label)));
      }, EXIT_MS);
    }
    return () => {
      if (exitTimer.current !== null) {
        window.clearTimeout(exitTimer.current);
        exitTimer.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scale]);

  const [noteText, setNoteText] = useState(
    `Bar is the full ${authorized.toLocaleString()}-unit company — holders shown as shares of the company.`
  );
  const [noteVisible, setNoteVisible] = useState(true);
  useEffect(() => {
    setNoteVisible(false);
    const timer = window.setTimeout(() => {
      setNoteText(
        scale === "company"
          ? `Bar is the full ${authorized.toLocaleString()}-unit company — holders shown as shares of the company.`
          : `Bar is the ${llc.equityPoolPercent}% equity pool (${poolUnits.toLocaleString()} units) — holders shown as shares of the pool.`
      );
      setNoteVisible(true);
    }, 200);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scale]);

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
              .map((holder) => `${holder.label} ${displayPercent(holder.percentOfPool).toFixed(1)}%`)
              .join(", ")}`}
        >
          {renderedSegments.map((segment) => {
            const isExiting = exitingKeys.current.has(segment.label);
            const isTail = segment.label === "remainder";
            const isPoolBlock = segment.label === "pool";
            return (
              <div
                className={isPoolBlock && scale === "company"
                  ? "pool-bar-segment pool-bar-segment-clickable"
                  : `pool-bar-segment${isExiting ? " is-exiting" : ""}`}
                key={segment.label}
                onClick={isPoolBlock && scale === "company"
                  ? () => setScale("pool")
                  : undefined}
                style={{
                  width: `${(segment.units / denominator) * 100}%`,
                  backgroundColor: segment.color,
                }}
                title={
                  isTail
                    ? scale === "company"
                      ? `Not in pool — ${(segment.units / authorized * 100).toFixed(1)}% of company (${segment.units.toLocaleString()} units)`
                      : `Unallocated pool — ${(segment.units / poolUnits * 100).toFixed(1)}% of pool (${segment.units.toLocaleString()} units)`
                    : isPoolBlock
                      ? `Equity pool — ${(segment.units / authorized * 100).toFixed(1)}% of company (${segment.units.toLocaleString()} units) — click to view breakdown`
                      : `${segment.label} — ${displayPercent(segment.percentOfPool).toFixed(1)}% of ${scale === "company" ? "company" : "pool"} (${segment.units.toLocaleString()} units)`
                }
              />
            );
          })}
        </div>
        <p className={`pool-scale-note${noteVisible ? "" : " is-switching"}`}>{noteText}</p>
        <div className="pool-legend" aria-label="Top unit holders">
          {visibleHolders.map((holder, index) => (
            <div className="legend-item" key={holder.label}>
              <span
                className="legend-swatch"
                style={{ backgroundColor: holderColors[index % holderColors.length] }}
              />
              {holder.employeeId ? (
                <Link className="holder-link" to={`/employees/${holder.employeeId}`}>
                  {holder.label}
                </Link>
              ) : (
                <span>{holder.label}</span>
              )}
              <strong>{displayPercent(holder.percentOfPool).toFixed(1)}%</strong>
            </div>
          ))}
        </div>
      </div>
      <div className="holder-list">
        <div className="list-header"><span>Holder</span><span>Share</span></div>
        {visibleHolders.map((holder, index) => (
          <div className="holder-row" key={holder.label}>
            <div>
              <div className="holder-name-line">
                <span
                  className="legend-swatch"
                  style={{ backgroundColor: holderColors[index % holderColors.length] }}
                />
                {holder.employeeId ? (
                  <Link className="holder-link" to={`/employees/${holder.employeeId}`}>
                    {holder.label}
                  </Link>
                ) : (
                  <strong>{holder.label}</strong>
                )}
              </div>
              <span>{holder.role}</span>
            </div>
            <strong className="tnum">{displayPercent(holder.percentOfPool).toFixed(1)}%</strong>
          </div>
        ))}
        {hiddenHolderCount > 0 && (
          <Link className="more-holders-link" to="/employees">
            And {hiddenHolderCount} more holder{hiddenHolderCount === 1 ? "" : "s"}
          </Link>
        )}
      </div>
      <Link className="card-link" to="/employees">
        View full Employee List <ArrowUpRight size={15} />
      </Link>
    </section>
  );
}

import { ArrowUpRight, TrendingUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  approvePoolExpansion,
  getEffectivePool,
  getExpansionsForLLC,
  getPoolAllocatedUnits,
  getPoolPendingUnits,
} from "@/data/grantStore";
import type { LLC, UnitHolderSegment } from "@/data/types";

interface EquityPoolSummaryProps {
  llc: LLC;
  holders: UnitHolderSegment[];
  onExpandPool?: () => void;
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
const othersColor = "#8a93a3"; // slate — shared by all non-top-3 holders when consolidated

type BarScale = "company" | "pool";

interface Segment {
  label: string;
  role: string | null;
  units: number;
  percentOfPool: number;
  color: string;
  employeeId?: string;
}

const EXIT_MS = 300;

export function EquityPoolSummary({ llc, holders, onExpandPool }: EquityPoolSummaryProps) {
  const [scale, setScale] = useState<BarScale>("company");
  const [consolidated, setConsolidated] = useState(false);
  const navigate = useNavigate();

  // Hover infobox state. Anchored to the hovered segment, not the cursor,
  // so it stays stable while the pointer moves within one segment.
  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);
  const [hoverInfo, setHoverInfo] = useState<{ title: string; detail: string; segmentLabel: string } | null>(null);
  const hideTimer = useRef<number | null>(null);

  const authorized = llc.totalUnitsAuthorized;
  const effectivePool = getEffectivePool(llc.id);
  const poolUnits = Math.round((effectivePool.equityPoolPercent / 100) * effectivePool.totalUnitsAuthorized);
  const pendingExpansion = getExpansionsForLLC(llc.id).find((expansion) => expansion.status === "pending");
  const allocatedRuntimeUnits = getPoolAllocatedUnits(llc.id);
  const pendingUnits = getPoolPendingUnits(llc.id);
  const roleHolders = holders.filter((holder) => holder.role !== null);
  const allocatedUnits = roleHolders.reduce((sum, holder) => sum + holder.units, 0);
  const companyFactor = poolUnits / authorized;
  const displayPercent = (percentOfPool: number) =>
    scale === "company" ? percentOfPool * companyFactor : percentOfPool;
  const visibleHolders = roleHolders.slice(0, 3);
  const hiddenHolderCount = roleHolders.length - visibleHolders.length;
  const othersUnits = roleHolders.slice(3).reduce((sum, holder) => sum + holder.units, 0);
  const othersPercent = roleHolders.slice(3).reduce((sum, holder) => sum + holder.percentOfPool, 0);

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
      ...(consolidated
        ? [
            ...visibleHolders.map((holder, index) => ({
              ...holder,
              color: holderColors[index],
            })),
            ...(othersUnits > 0
              ? [{ label: "Others", role: null, units: othersUnits, percentOfPool: othersPercent, color: othersColor }]
              : []),
          ]
        : roleHolders.map((holder, index) => ({
            ...holder,
            color: holderColors[index % holderColors.length],
          }))),
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
  }, [scale, consolidated]);

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

  const barAriaHolders = consolidated
    ? [...visibleHolders, { label: "Others", percentOfPool: othersPercent }]
    : roleHolders;

  const clearHideTimer = () => {
    if (hideTimer.current !== null) {
      window.clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  };

  const showSegmentInfo = (title: string, detail: string, segmentLabel: string) => {
    clearHideTimer();
    setHoveredLabel(segmentLabel);
    setHoverInfo({ title, detail, segmentLabel });
  };

  const scheduleSegmentHide = () => {
    clearHideTimer();
    hideTimer.current = window.setTimeout(() => {
      setHoveredLabel(null);
      setHoverInfo(null);
    }, 120);
  };

  const routeSegment = (segment: Segment) => {
    if (scale !== "pool") return;
    if (segment.label === "remainder" || segment.label === "pool") return;
    if (segment.label === "Others" && consolidated) {
      navigate("/employees");
      return;
    }
    if (segment.employeeId) navigate(`/employees/${segment.employeeId}`);
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
          <strong>{allocatedRuntimeUnits.toLocaleString()}</strong>
          <span>
            issued units of {poolUnits.toLocaleString()} in the {effectivePool.equityPoolPercent}% pool
          </span>
        </div>
        {pendingUnits > 0 && (
          <div className="pool-pending-note" role="status">
            <strong>{pendingUnits.toLocaleString()} units</strong> pending employee signature — not
            yet counted against the pool.
          </div>
        )}
        {pendingExpansion && (
          <div className="pool-expansion-note" role="status">
            <div>
              <strong>
                Pool expansion to {pendingExpansion.newPercent}% ({pendingExpansion.newAuthorizedUnits.toLocaleString()} units)
                pending approval
              </strong>
              <span>Demo: approve to apply the new pool size.</span>
            </div>
            <button
              className="button-secondary"
              type="button"
              onClick={() => {
                void approvePoolExpansion(pendingExpansion.id);
              }}
            >
              <TrendingUp size={14} /> Approve
            </button>
          </div>
        )}
        <div className="pool-bar-wrap">
          {hoverInfo && (
            <div className="segment-infobox" role="status">
              <strong>{hoverInfo.title}</strong>
              <span>{hoverInfo.detail}</span>
            </div>
          )}
          <div
            className="pool-bar"
            role="img"
            aria-label={scale === "company"
            ? `Pool allocation (share of company): equity pool ${(poolUnits / authorized * 100).toFixed(1)}%`
            : `Pool allocation (share of equity pool): ${barAriaHolders
              .map((holder) => `${holder.label} ${displayPercent(holder.percentOfPool).toFixed(1)}%`)
              .join(", ")}`}
          >
          {renderedSegments.map((segment) => {
            const isExiting = exitingKeys.current.has(segment.label);
            const isTail = segment.label === "remainder";
            const isPoolBlock = segment.label === "pool";
            const isHovered = hoveredLabel === segment.label;
            const isOther = consolidated && segment.label === "Others";
            const routable = scale === "pool" && !isTail && !isPoolBlock && (isOther || segment.employeeId);
            const infoTitle = isOther
              ? "Others"
              : isPoolBlock || isTail
                ? null
                : segment.label;
            const infoDetail = isOther
              ? `${displayPercent(segment.percentOfPool).toFixed(1)}% of pool · ${segment.units.toLocaleString()} units`
              : isPoolBlock || isTail
                ? null
                : `${displayPercent(segment.percentOfPool).toFixed(1)}% of ${scale === "company" ? "company" : "pool"} · ${segment.units.toLocaleString()} units`;
            const segmentTitle = isTail
              ? (scale === "company"
                ? `Not in pool — ${(segment.units / authorized * 100).toFixed(1)}% of company (${segment.units.toLocaleString()} units)`
                : `Unallocated pool — ${(segment.units / poolUnits * 100).toFixed(1)}% of pool (${segment.units.toLocaleString()} units)`)
              : isPoolBlock
                ? `Equity pool — ${(segment.units / authorized * 100).toFixed(1)}% of company (${segment.units.toLocaleString()} units) — click to view breakdown`
                : null;
            return (
              <div
                className={`pool-bar-segment${isExiting ? " is-exiting" : ""}${isPoolBlock && scale === "company" ? " pool-bar-segment-clickable" : ""}${routable ? " pool-bar-segment-clickable" : ""}${isHovered ? " is-hovered" : ""}`}
                key={segment.label}
                onClick={isPoolBlock && scale === "company"
                  ? () => setScale("pool")
                  : routable
                    ? () => routeSegment(segment)
                    : undefined}
                onMouseEnter={infoTitle && infoDetail
                  ? () => showSegmentInfo(infoTitle, infoDetail, segment.label)
                  : undefined}
                onMouseLeave={infoTitle && infoDetail
                  ? () => scheduleSegmentHide()
                  : undefined}
                style={{
                  width: `${(segment.units / denominator) * 100}%`,
                  backgroundColor: segment.color,
                }}
                title={segmentTitle ?? undefined}
              />
            );
          })}
          </div>
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
          {hiddenHolderCount > 0 && (
            <Link className="more-holders-link" to="/employees">
              And {hiddenHolderCount} more holder{hiddenHolderCount === 1 ? "" : "s"}
            </Link>
          )}
          {scale === "pool" && consolidated && hiddenHolderCount > 0 && (
            <div className="legend-item" key="others">
              <span className="legend-swatch" style={{ backgroundColor: othersColor }} />
              <span>Others ({hiddenHolderCount})</span>
              <strong>{displayPercent(othersPercent).toFixed(1)}%</strong>
            </div>
          )}
        </div>
        {scale === "pool" && hiddenHolderCount > 0 && (
          <button
            className="consolidate-toggle"
            type="button"
            onClick={() => setConsolidated((current) => !current)}
            aria-pressed={consolidated}
          >
            {consolidated ? "Explode" : "Consolidate"}
          </button>
        )}
      </div>
      <div className="card-link-row">
        {onExpandPool && (
          <button className="card-link card-link-button" type="button" onClick={onExpandPool}>
            Expand phantom pool <TrendingUp size={15} />
          </button>
        )}
        <Link className="card-link" to="/employees">
          View full Employee List <ArrowUpRight size={15} />
        </Link>
      </div>
    </section>
  );
}

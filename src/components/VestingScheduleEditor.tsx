// Aequi — Vesting schedule editor (grant wizard, step 3).
// One schedule state, two views: form fields and draggable hinges on the
// simulation chart. Both write through onChange, so they can never disagree.
import { ChevronUp, Plus, X } from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
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
import { formatDate } from "@/components/ValuationDetailModal";
import type { VestingSlowdown, VestingTrigger } from "@/data/types";
import { todayIso } from "@/data/vesting";

export interface VestingScheduleState {
  lengthMonths: number;
  cliffMonths: number;
  triggers: VestingTrigger[];
  slowdowns: VestingSlowdown[];
}

export function activeSlowdownsOf(schedule: VestingScheduleState): VestingSlowdown[] {
  return schedule.slowdowns.filter(
    (slowdown) => slowdown.toMonth > slowdown.fromMonth && slowdown.paceMultiplier < 1
  );
}

export function scheduleHasErrors(schedule: VestingScheduleState): boolean {
  return (
    schedule.cliffMonths >= schedule.lengthMonths ||
    schedule.slowdowns.some(
      (slowdown) =>
        slowdown.toMonth > slowdown.fromMonth && slowdown.toMonth >= schedule.lengthMonths
    )
  );
}

/** ISO date `months` from today — used for the cliff and completion dates. */
export function scheduleDateFor(months: number): string {
  const date = new Date();
  date.setMonth(date.getMonth() + months);
  return date.toISOString().slice(0, 10);
}

const LENGTH_OPTIONS = [24, 36, 48];
const CLIFF_OPTIONS = [6, 12, 24];
const PACE_PRESETS = [
  { value: 0.75, label: "75% speed" },
  { value: 0.5, label: "Half speed" },
  { value: 0.25, label: "Quarter speed" },
  { value: 0, label: "Paused" },
];

// Plot-area geometry: must match the Recharts margins and axis widths below
// so the hinge overlays line up with the curve.
const CHART_HEIGHT = 260;
const PLOT_TOP = 24;
const PLOT_BOTTOM = CHART_HEIGHT - 4 - 30; // margin.bottom + x-axis height
const PLOT_LEFT = 4 + 58; // margin.left + y-axis width
const PLOT_RIGHT_INSET = 16;

interface NumberFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onCommit: (value: number) => void;
}

// Free-typing number input: keystrokes are never rejected mid-type; the value
// is validated (and clamped with a note) only when the field is left.
function NumberField({ label, value, min, max, onCommit }: NumberFieldProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const shown = draft ?? String(value);

  function commit() {
    if (draft === null) return;
    const trimmed = draft.trim();
    setDraft(null);
    if (trimmed === "") return;
    const parsed = Math.round(Number(trimmed));
    if (!Number.isFinite(parsed)) return;
    if (parsed < min || parsed > max) {
      const clamped = Math.min(Math.max(parsed, min), max);
      onCommit(clamped);
      setFlash(`Set to ${clamped} — allowed range is ${min} to ${max}.`);
      return;
    }
    setFlash(null);
    if (parsed !== value) onCommit(parsed);
  }

  return (
    <label className="wizard-trigger-field">
      <span>{label}</span>
      <input
        type="number"
        inputMode="numeric"
        value={shown}
        onChange={(event) => {
          setDraft(event.target.value);
          setFlash(null);
        }}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
        }}
      />
      {flash && <em className="hinge-flash">{flash}</em>}
    </label>
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function monthLabel(month: number): string {
  const date = new Date();
  date.setMonth(date.getMonth() + month);
  return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

interface VestingPreviewPoint {
  month: number;
  vestedUnits: number;
}

// Mirrors vestedUnitsAsOf in vesting.ts so the preview always matches the
// numbers saved with the grant: triggered chunks vest at their month, the
// remainder vests monthly at the slowest applicable pace, and slowdown
// shortfalls are recovered in later months (still 100% by the end date).
function buildVestingPreview(
  units: number,
  lengthMonths: number,
  cliffMonths: number,
  triggers: VestingTrigger[],
  slowdowns: VestingSlowdown[]
): VestingPreviewPoint[] {
  const triggerPercent = Math.min(
    triggers.reduce((sum, trigger) => sum + (trigger.percentOfAward || 0), 0),
    100
  );
  const monthlyUnits = (units * (100 - triggerPercent)) / 100;
  const baseMonthlyRate = monthlyUnits / Math.max(lengthMonths - cliffMonths, 1);
  const paceAt = (month: number) => {
    let pace = 1;
    for (const slowdown of slowdowns) {
      if (month >= slowdown.fromMonth && month < slowdown.toMonth) {
        pace = Math.min(pace, slowdown.paceMultiplier);
      }
    }
    return pace;
  };

  const points: VestingPreviewPoint[] = [];
  let vested = 0;
  let recoveryDebt = 0;
  for (let month = 0; month <= lengthMonths; month += 1) {
    if (month >= cliffMonths) {
      vested += (baseMonthlyRate + recoveryDebt) * paceAt(month);
      recoveryDebt += baseMonthlyRate * (1 - paceAt(month));
    }
    const triggerUnits = triggers.reduce(
      (sum, trigger) =>
        sum + (trigger.atMonth <= month ? (units * trigger.percentOfAward) / 100 : 0),
      0
    );
    points.push({ month, vestedUnits: Math.min(Math.round(vested + triggerUnits), units) });
  }
  return points;
}

type DragState =
  | {
      kind: "trigger";
      index: number;
      startX: number;
      startY: number;
      startMonth: number;
      startPercent: number;
    }
  | { kind: "slowFrom"; index: number; startX: number; startMonth: number }
  | { kind: "slowTo"; index: number; startX: number; startMonth: number }
  | { kind: "pace"; index: number; startY: number; startPace: number };

interface VestingScheduleEditorProps {
  units: number;
  schedule: VestingScheduleState;
  onChange: (next: VestingScheduleState) => void;
}

export function VestingScheduleEditor({ units, schedule, onChange }: VestingScheduleEditorProps) {
  const { lengthMonths, cliffMonths, triggers, slowdowns } = schedule;
  const [useCustomLength, setUseCustomLength] = useState(false);
  const [useCustomCliff, setUseCustomCliff] = useState(false);
  const [triggersOpen, setTriggersOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [drag, setDrag] = useState<DragState | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const element = wrapRef.current;
    if (!element) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setWidth(entry.contentRect.width);
    });
    observer.observe(element);
    setWidth(element.clientWidth);
    return () => observer.disconnect();
  }, []);

  const plotWidth = Math.max(width - PLOT_LEFT - PLOT_RIGHT_INSET, 1);
  const plotHeight = PLOT_BOTTOM - PLOT_TOP;
  const pxPerMonth = plotWidth / lengthMonths;
  const x = (month: number) => PLOT_LEFT + (month / lengthMonths) * plotWidth;
  const y = (value: number) => PLOT_TOP + (1 - value / Math.max(units, 1)) * plotHeight;
  const yPace = (pace: number) => PLOT_TOP + (1 - clamp(pace, 0, 1)) * plotHeight;

  const previewSeries = useMemo(
    () => buildVestingPreview(units, lengthMonths, cliffMonths, triggers, slowdowns),
    [units, lengthMonths, cliffMonths, triggers, slowdowns]
  );
  const activeSlowdowns = activeSlowdownsOf(schedule);
  const totalTriggerPercent = Math.min(
    triggers.reduce((sum, trigger) => sum + (trigger.percentOfAward || 0), 0),
    100
  );
  const slowdownOverSchedule = slowdowns.some(
    (slowdown) => slowdown.toMonth > slowdown.fromMonth && slowdown.toMonth >= lengthMonths
  );
  const cliffDate = scheduleDateFor(cliffMonths);
  const completionDate = scheduleDateFor(lengthMonths);

  function updateTrigger(index: number, patch: Partial<VestingTrigger>) {
    onChange({
      ...schedule,
      triggers: schedule.triggers.map((trigger, triggerIndex) =>
        triggerIndex === index ? { ...trigger, ...patch } : trigger
      ),
    });
  }

  function updateSlowdown(index: number, patch: Partial<VestingSlowdown>) {
    onChange({
      ...schedule,
      slowdowns: schedule.slowdowns.map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, ...patch } : entry
      ),
    });
  }

  function beginDrag(event: ReactPointerEvent<HTMLButtonElement>, state: DragState) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag(state);
  }

  function handleDragMove(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!drag) return;
    if (drag.kind === "trigger") {
      const othersPercent = triggers.reduce(
        (sum, trigger, index) => (index === drag.index ? sum : sum + (trigger.percentOfAward || 0)),
        0
      );
      updateTrigger(drag.index, {
        atMonth: clamp(
          Math.round(drag.startMonth + (event.clientX - drag.startX) / pxPerMonth),
          cliffMonths,
          lengthMonths
        ),
        percentOfAward: clamp(
          Math.round(drag.startPercent - (event.clientY - drag.startY) / 3),
          0,
          100 - othersPercent
        ),
      });
    } else if (drag.kind === "slowFrom") {
      const entry = slowdowns[drag.index];
      if (!entry) return;
      updateSlowdown(drag.index, {
        fromMonth: clamp(
          Math.round(drag.startMonth + (event.clientX - drag.startX) / pxPerMonth),
          cliffMonths,
          entry.toMonth - 1
        ),
      });
    } else if (drag.kind === "slowTo") {
      const entry = slowdowns[drag.index];
      if (!entry) return;
      updateSlowdown(drag.index, {
        toMonth: clamp(
          Math.round(drag.startMonth + (event.clientX - drag.startX) / pxPerMonth),
          entry.fromMonth + 1,
          lengthMonths - 1
        ),
      });
    } else {
      updateSlowdown(drag.index, {
        paceMultiplier: clamp(
          Math.round((drag.startPace + (drag.startY - event.clientY) / 120) * 20) / 20,
          0,
          1
        ),
      });
    }
  }

  function endDrag() {
    setDrag(null);
  }

  const dragHandlers = {
    onPointerMove: handleDragMove,
    onPointerUp: endDrag,
    onPointerCancel: endDrag,
    onLostPointerCapture: endDrag,
  };

  return (
    <>
      <div className="wizard-field-block">
        <span className="wizard-field-label">Vesting schedule</span>
        <p className="wizard-hint">
          Set the total length and the cliff. Nothing vests before the cliff; after it, units
          vest monthly until the schedule completes.
        </p>
        <div className="wizard-length-options">
          {LENGTH_OPTIONS.map((months) => (
            <button
              key={months}
              type="button"
              className={`wizard-length-option${!useCustomLength && lengthMonths === months ? " is-selected" : ""}`}
              onClick={() => {
                onChange({ ...schedule, lengthMonths: months });
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
              onBlur={(event) => {
                const parsed = Math.round(Number(event.target.value));
                if (Number.isFinite(parsed) && parsed !== 0) {
                  const clamped = clamp(parsed, 13, 120);
                  if (clamped !== lengthMonths) onChange({ ...schedule, lengthMonths: clamped });
                  event.target.value = String(useCustomLength ? lengthMonths : "");
                }
              }}
              onChange={(event) => {
                setUseCustomLength(true);
                const parsed = Math.round(Number(event.target.value));
                if (Number.isFinite(parsed) && parsed >= 13 && parsed <= 120) {
                  onChange({ ...schedule, lengthMonths: parsed });
                }
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
                onChange({ ...schedule, cliffMonths: months });
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
              onBlur={(event) => {
                const parsed = Math.round(Number(event.target.value));
                if (Number.isFinite(parsed) && parsed !== 0) {
                  const clamped = clamp(parsed, 1, lengthMonths - 1);
                  if (clamped !== cliffMonths) onChange({ ...schedule, cliffMonths: clamped });
                  event.target.value = String(useCustomCliff ? cliffMonths : "");
                }
              }}
              onChange={(event) => {
                setUseCustomCliff(true);
                const parsed = Math.round(Number(event.target.value));
                if (Number.isFinite(parsed) && parsed >= 1 && parsed < lengthMonths) {
                  onChange({ ...schedule, cliffMonths: parsed });
                }
              }}
            />
          </div>
        </div>
        {cliffMonths >= lengthMonths && (
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
      {!triggersOpen ? (
        <button className="wizard-triggers-link" type="button" onClick={() => setTriggersOpen(true)}>
          Add post-vesting cliffs <Plus size={14} />
        </button>
      ) : (
        <div className="wizard-field-block wizard-triggers-editor">
          <div className="wizard-triggers-header">
            <span className="wizard-field-label">Post-vesting cliffs</span>
            <button className="wizard-triggers-collapse" type="button" onClick={() => setTriggersOpen(false)}>
              Hide <ChevronUp size={14} />
            </button>
          </div>
          <p className="wizard-hint">
            Optional. Each trigger vests a percent of the total award at a set month. The
            remainder keeps vesting monthly after the cliff.
          </p>
          {triggers.map((trigger, index) => {
            const othersPercent = triggers.reduce(
              (sum, entry, entryIndex) =>
                entryIndex === index ? sum : sum + (entry.percentOfAward || 0),
              0
            );
            return (
              <div className="wizard-trigger-row" key={index}>
                <NumberField
                  label="Month"
                  value={trigger.atMonth}
                  min={cliffMonths}
                  max={lengthMonths}
                  onCommit={(value) => updateTrigger(index, { atMonth: value })}
                />
                <NumberField
                  label="Percent of award"
                  value={trigger.percentOfAward}
                  min={0}
                  max={100 - othersPercent}
                  onCommit={(value) => updateTrigger(index, { percentOfAward: value })}
                />
                <button
                  className="wizard-trigger-remove"
                  type="button"
                  aria-label="Remove trigger"
                  onClick={() =>
                    onChange({
                      ...schedule,
                      triggers: schedule.triggers.filter((_, triggerIndex) => triggerIndex !== index),
                    })
                  }
                >
                  <X size={14} />
                </button>
              </div>
            );
          })}
          <button
            className="wizard-triggers-add"
            type="button"
            disabled={totalTriggerPercent >= 100}
            onClick={() =>
              onChange({
                ...schedule,
                triggers: [
                  ...triggers,
                  { atMonth: Math.min(cliffMonths + 6, lengthMonths), percentOfAward: 0 },
                ],
              })
            }
          >
            <Plus size={14} /> Add trigger
          </button>
          <div className="wizard-slowdowns-section">
            <div className="wizard-triggers-header">
              <span className="wizard-field-label">Slow down vesting</span>
              <button
                className={`wizard-triggers-collapse${advancedOpen ? " is-on" : ""}`}
                type="button"
                onClick={() => setAdvancedOpen((current) => !current)}
              >
                {advancedOpen ? "Hide advanced pace control" : "Show advanced pace control"}
              </button>
            </div>
            <p className="wizard-hint">
              Optional. Pick a window after the cliff and a pace — monthly vesting runs slower
              during the window, then catches up so the grant still finishes on the original
              fully-vested date. The window must end at least one month before the schedule ends.
              {advancedOpen && " Drag the amber pace line on the chart up or down for a custom pace."}
            </p>
            {slowdowns.map((slowdown, index) => {
              const paceKnown = PACE_PRESETS.some(
                (preset) => Math.abs(preset.value - slowdown.paceMultiplier) < 1e-9
              );
              return (
                <div className="wizard-trigger-row" key={index}>
                  <NumberField
                    label="From month"
                    value={slowdown.fromMonth}
                    min={cliffMonths}
                    max={lengthMonths - 1}
                    onCommit={(value) => updateSlowdown(index, { fromMonth: value })}
                  />
                  <NumberField
                    label="To month"
                    value={slowdown.toMonth}
                    min={cliffMonths + 1}
                    max={lengthMonths - 1}
                    onCommit={(value) => updateSlowdown(index, { toMonth: value })}
                  />
                  <label>
                    <span>Pace</span>
                    <select
                      value={paceKnown ? String(slowdown.paceMultiplier) : "custom"}
                      onChange={(event) => {
                        if (event.target.value === "custom") return;
                        updateSlowdown(index, { paceMultiplier: Number(event.target.value) });
                      }}
                    >
                      {!paceKnown && (
                        <option value="custom">Custom ({Math.round(slowdown.paceMultiplier * 100)}%)</option>
                      )}
                      {PACE_PRESETS.map((preset) => (
                        <option key={preset.value} value={preset.value}>
                          {preset.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    className="wizard-trigger-remove"
                    type="button"
                    aria-label="Remove slowdown"
                    onClick={() =>
                      onChange({
                        ...schedule,
                        slowdowns: schedule.slowdowns.filter((_, entryIndex) => entryIndex !== index),
                      })
                    }
                  >
                    <X size={14} />
                  </button>
                </div>
              );
            })}
            {slowdownOverSchedule && (
              <p className="wizard-error">
                The slow window must end at least one month before the vesting schedule ends
                ({lengthMonths} months), so the missed vesting can be recovered.
              </p>
            )}
            <button
              className="wizard-triggers-add"
              type="button"
              onClick={() => {
                const from = clamp(
                  Math.min(cliffMonths + 3, lengthMonths - 3),
                  cliffMonths,
                  lengthMonths - 2
                );
                onChange({
                  ...schedule,
                  slowdowns: [
                    ...slowdowns,
                    {
                      fromMonth: from,
                      toMonth: clamp(from + 6, from + 1, lengthMonths - 1),
                      paceMultiplier: 0.5,
                    },
                  ],
                });
              }}
            >
              <Plus size={14} /> Add slow window
            </button>
          </div>
        </div>
      )}
      <div className="card wizard-vesting-chart">
        <div className="chart-wrap" ref={wrapRef}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={previewSeries} margin={{ top: 24, right: 16, left: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(138, 147, 163, .18)" vertical={false} />
              <XAxis
                dataKey="month"
                type="number"
                domain={[0, lengthMonths]}
                allowDecimals={false}
                tick={{ fill: "#8a93a3", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value: number) => monthLabel(value)}
              />
              <YAxis
                tick={{ fill: "#8a93a3", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={58}
                domain={[0, Math.max(units, 1)]}
                tickFormatter={(value: number) => value.toLocaleString()}
              />
              <Tooltip
                cursor={{ stroke: "rgba(138, 147, 163, .35)" }}
                contentStyle={{
                  border: "1px solid rgba(138, 147, 163, .25)",
                  borderRadius: 5,
                  background: "#fdfcf9",
                  fontFamily: "Work Sans",
                }}
                formatter={(value: unknown) => [`${Number(value).toLocaleString()} units`, "Vested units"]}
                labelFormatter={(label: unknown) => monthLabel(Number(label))}
              />
              <ReferenceLine
                x={cliffMonths}
                stroke="#b07d3a"
                strokeDasharray="5 4"
                label={{ value: "CLIFF", position: "top", fill: "#b07d3a", fontSize: 10, letterSpacing: "0.08em" }}
              />
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
          {width > 0 && (
            <div className="hinge-layer">
              {activeSlowdowns.map((slowdown, index) => (
                <div
                  className="slow-window-shade"
                  key={`shade-${index}`}
                  style={{
                    left: x(slowdown.fromMonth),
                    width: Math.max(x(slowdown.toMonth) - x(slowdown.fromMonth), 2),
                    top: PLOT_TOP,
                    height: plotHeight,
                  }}
                />
              ))}
              {advancedOpen &&
                activeSlowdowns.map((slowdown, index) => {
                  const lineLeft = x(slowdown.fromMonth);
                  const lineRight = x(slowdown.toMonth);
                  if (lineRight <= lineLeft) return null;
                  return (
                    <div key={`pace-${index}`}>
                      <div
                        className="pace-line"
                        style={{
                          left: lineLeft,
                          width: lineRight - lineLeft,
                          top: yPace(slowdown.paceMultiplier),
                        }}
                      />
                      <button
                        type="button"
                        className="hinge hinge-pace"
                        style={{
                          left: (lineLeft + lineRight) / 2,
                          top: yPace(slowdown.paceMultiplier),
                        }}
                        title={`Pace: ${Math.round(slowdown.paceMultiplier * 100)}% — drag up or down`}
                        onPointerDown={(event) =>
                          beginDrag(event, {
                            kind: "pace",
                            index,
                            startY: event.clientY,
                            startPace: slowdown.paceMultiplier,
                          })
                        }
                        {...dragHandlers}
                      />
                    </div>
                  );
                })}
              {cliffMonths > 0 && previewSeries[cliffMonths] && (
                <div
                  className="hinge-cliff"
                  style={{ left: x(cliffMonths), top: y(previewSeries[cliffMonths].vestedUnits) }}
                  title="Cliff — set with the buttons above (fixed)"
                />
              )}
              {triggers.map((trigger, index) => {
                const point = previewSeries[trigger.atMonth];
                if (!point) return null;
                return (
                  <button
                    type="button"
                    className="hinge hinge-trigger"
                    key={`trigger-${index}`}
                    style={{ left: x(trigger.atMonth), top: y(point.vestedUnits) }}
                    title={`Trigger: month ${trigger.atMonth}, ${trigger.percentOfAward}% of award — drag to adjust`}
                    onPointerDown={(event) =>
                      beginDrag(event, {
                        kind: "trigger",
                        index,
                        startX: event.clientX,
                        startY: event.clientY,
                        startMonth: trigger.atMonth,
                        startPercent: trigger.percentOfAward,
                      })
                    }
                    {...dragHandlers}
                  />
                );
              })}
              {slowdowns.map((slowdown, index) => (
                <div key={`window-${index}`}>
                  <button
                    type="button"
                    className="hinge hinge-edge"
                    style={{ left: x(slowdown.fromMonth), top: PLOT_TOP + plotHeight / 2 }}
                    title={`Window start: month ${slowdown.fromMonth} — drag sideways`}
                    onPointerDown={(event) =>
                      beginDrag(event, {
                        kind: "slowFrom",
                        index,
                        startX: event.clientX,
                        startMonth: slowdown.fromMonth,
                      })
                    }
                    {...dragHandlers}
                  />
                  <button
                    type="button"
                    className="hinge hinge-edge"
                    style={{ left: x(slowdown.toMonth), top: PLOT_TOP + plotHeight / 2 }}
                    title={`Window end: month ${slowdown.toMonth} — drag sideways`}
                    onPointerDown={(event) =>
                      beginDrag(event, {
                        kind: "slowTo",
                        index,
                        startX: event.clientX,
                        startMonth: slowdown.toMonth,
                      })
                    }
                    {...dragHandlers}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="hinge-legend">
          <span><i className="legend-swatch is-trigger" /> Trigger — drag to move &amp; set %</span>
          <span><i className="legend-swatch is-edge" /> Slow window edge</span>
          <span><i className="legend-swatch is-pace" /> Pace line (advanced)</span>
          <span><i className="legend-swatch is-cliff" /> Cliff — fixed by buttons</span>
        </div>
        <p className="wizard-hint">
          Projected vesting for {units > 0 ? units.toLocaleString() : "—"} units · {lengthMonths}{" "}
          months with a {cliffMonths}-month cliff.
          {triggers.filter((trigger) => trigger.percentOfAward > 0).length > 0 &&
            ` ${triggers.filter((trigger) => trigger.percentOfAward > 0).length} trigger(s) applied.`}
          {activeSlowdowns.length > 0 && ` ${activeSlowdowns.length} slow window(s) applied.`}
        </p>
      </div>
    </>
  );
}

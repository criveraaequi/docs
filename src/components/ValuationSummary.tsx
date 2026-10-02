import { ArrowUpRight } from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Analyst, LLC, ValuationEvent } from "@/data/types";
import { formatDate } from "./ValuationDetailModal";

interface ValuationSummaryProps {
  llc: LLC;
  analyst: Analyst | null;
  onSelectValuation: (valuation: ValuationEvent) => void;
}

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export function ValuationSummary({ llc, analyst, onSelectValuation }: ValuationSummaryProps) {
  const history = llc.valuationHistory;
  const latest = history[history.length - 1];
  const chartData = history.map((event) => ({ ...event, label: formatDate(event.date) }));

  return (
    <section className="card summary-card valuation-card">
      <div className="card-heading">
        <div>
          <span className="eyebrow">Certified valuation</span>
          <h2>Valuation summary</h2>
        </div>
        <span className="updated-label">Updated {latest ? formatDate(latest.date) : "—"}</span>
      </div>
      {latest ? (
        <div className="valuation-headline">
          <strong>{currency.format(latest.valuationAmount)}</strong>
          <span>${latest.resultingStrikePrice.toFixed(2)} / unit</span>
        </div>
      ) : <p className="empty-state">No certified valuations yet.</p>}
      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 16, right: 12, left: -14, bottom: 4 }}
            onClick={(chartState) => {
              const index = chartState?.activeTooltipIndex;
              if (typeof index === "number" && history[index]) onSelectValuation(history[index]);
            }}
          >
            <XAxis dataKey="label" tick={{ fill: "#8a93a3", fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis hide domain={["dataMin - 300000", "dataMax + 300000"]} />
            <Tooltip
              cursor={{ stroke: "rgba(138, 147, 163, .35)" }}
              contentStyle={{ border: "1px solid rgba(138, 147, 163, .25)", borderRadius: 5, background: "#fdfcf9", fontFamily: "IBM Plex Sans" }}
              formatter={(value: unknown) => [currency.format(Number(value) || 0), "Certified value"]}
            />
            <Line type="monotone" dataKey="valuationAmount" stroke="#1f3164" strokeWidth={2} dot={{ r: 5, fill: "#fdfcf9", stroke: "#1f3164", strokeWidth: 2, cursor: "pointer" }} activeDot={{ r: 7, fill: "#1f3164", stroke: "#fdfcf9", strokeWidth: 2, cursor: "pointer" }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="chart-note"><span className="chart-line" /> Certified values only <span className="analyst-note">Analyst: {analyst?.name ?? "—"}</span></div>
      <a className="card-link" href="#valuation-history" onClick={(event) => { event.preventDefault(); window.history.pushState({}, "", `/valuation-history/${llc.id}`); window.dispatchEvent(new PopStateEvent("popstate")); }}>
        View full valuation history <ArrowUpRight size={15} />
      </a>
    </section>
  );
}

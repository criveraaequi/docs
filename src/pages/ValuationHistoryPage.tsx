import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { ValuationDetailModal, formatDate } from "@/components/ValuationDetailModal";
import { getAnalystForLLC, getAuthorizedUser, getEngagementStatus, getLLCDetails } from "@/data/mockApi";
import type { ValuationEvent } from "@/data/types";

interface ValuationHistoryPageProps { llcId: string; }
const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export function ValuationHistoryPage({ llcId }: ValuationHistoryPageProps) {
  const llc = getLLCDetails(llcId);
  const [selectedValuation, setSelectedValuation] = useState<ValuationEvent | null>(null);
  if (!llc) return <div className="page-state">LLC not found.</div>;
  const analyst = getAnalystForLLC(llc.id);
  const owner = getAuthorizedUser(llc.id);
  const engagement = getEngagementStatus(llc.id);
  const isPreCertification = engagement !== null && engagement.currentStage !== "Certified";

  return <AppShell llc={llc} owner={owner}>
    <div className="history-page">
      <Link className="back-link" to="/"><ArrowLeft size={15} /> Back to dashboard</Link>
      <div className="page-intro history-intro">
        <div>
          <span className="eyebrow">Certified record · {llc.name}</span>
          <h1>Valuation history</h1>
          <p>Every valuation event on record for your company, oldest to newest. Click one for the full detail.</p>
        </div>
        {isPreCertification && <span className="preliminary-pill">Latest figure preliminary</span>}
      </div>
      <section className="card history-card">
        <div className="history-table-header"><span>Certification date</span><span>Valuation amount</span><span>Strike price</span><span>Analyst</span><span>Document</span></div>
        {llc.valuationHistory.map((valuation, index) => {
          const isLatest = index === llc.valuationHistory.length - 1;
          return (
            <button className="history-row" type="button" key={valuation.date} onClick={() => setSelectedValuation(valuation)}>
              <span>{formatDate(valuation.date)}</span>
              <strong>{currency.format(valuation.valuationAmount)}</strong>
              <span>${valuation.resultingStrikePrice.toFixed(2)} / unit</span>
              <span>{analyst?.name ?? "—"}{isLatest && isPreCertification ? " · preliminary" : ""}</span>
              <span className="document-link">{valuation.documentName} <ArrowUpRight size={14} /></span>
            </button>
          );
        })}
      </section>
      <ValuationDetailModal llc={llc} valuation={selectedValuation} analyst={analyst} onClose={() => setSelectedValuation(null)} />
    </div>
  </AppShell>;
}

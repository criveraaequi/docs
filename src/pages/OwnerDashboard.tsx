import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { EquityPoolSummary } from "@/components/EquityPoolSummary";
import { ValuationDetailModal } from "@/components/ValuationDetailModal";
import { ValuationSummary } from "@/components/ValuationSummary";
import { getAnalystForLLC, getAuthorizedUser, getLLCDetails, getTopUnitHolders } from "@/data/mockApi";
import type { ValuationEvent } from "@/data/types";

const LLC_ID = "llc-1";

export function OwnerDashboard() {
  const llc = getLLCDetails(LLC_ID);
  const [selectedValuation, setSelectedValuation] = useState<ValuationEvent | null>(null);

  if (!llc) return <div className="page-state">LLC not found.</div>;

  const analyst = getAnalystForLLC(llc.id);
  const owner = getAuthorizedUser(llc.id);
  const holders = getTopUnitHolders(llc.id, 3);

  return (
    <AppShell llc={llc} owner={owner}>
      <div className="page-intro">
        <div><span className="eyebrow">Owner dashboard</span><h1>Good morning, {owner?.name.split(" ")[0] ?? "Owner"}.</h1></div>
        <span className="mock-badge">Mock data</span>
      </div>
      <div className="dashboard-grid">
        <EquityPoolSummary llc={llc} holders={holders} />
        <ValuationSummary llc={llc} analyst={analyst} onSelectValuation={setSelectedValuation} />
      </div>
      <ValuationDetailModal llc={llc} valuation={selectedValuation} analyst={analyst} onClose={() => setSelectedValuation(null)} />
    </AppShell>
  );
}

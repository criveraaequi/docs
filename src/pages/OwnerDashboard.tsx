import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { EquityPoolSummary } from "@/components/EquityPoolSummary";
import { GrantWizard } from "@/components/GrantWizard";
import { PoolExpansionModal } from "@/components/PoolExpansionModal";
import { ValuationDetailModal } from "@/components/ValuationDetailModal";
import { ValuationSummary } from "@/components/ValuationSummary";
import { useGrantStore } from "@/data/useGrantStore";
import { getAnalystForLLC, getAuthorizedUser, getLLCDetails, getTopUnitHolders } from "@/data/mockApi";
import type { ValuationEvent } from "@/data/types";

const LLC_ID = "llc-1";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 23 || hour < 3) return "Quite the night owl";
  if (hour < 5) return "Quite the early bird";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Wonderful evening";
}

export function OwnerDashboard() {
  const llc = getLLCDetails(LLC_ID);
  const [selectedValuation, setSelectedValuation] = useState<ValuationEvent | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [expansionOpen, setExpansionOpen] = useState(false);
  useGrantStore();

  if (!llc) return <div className="page-state">LLC not found.</div>;

  const analyst = getAnalystForLLC(llc.id);
  const owner = getAuthorizedUser(llc.id);
  const holders = getTopUnitHolders(llc.id, 25);

  return (
    <AppShell llc={llc} owner={owner}>
      <div className="page-intro">
        <div><span className="eyebrow">Owner dashboard</span><h1>{getGreeting()}, {owner?.name.split(" ")[0] ?? "Owner"}.</h1></div>
        <div className="page-intro-actions">
          <button className="button-primary" type="button" onClick={() => setWizardOpen(true)}>
            New grant
          </button>
          <span className="mock-badge">Mock data</span>
        </div>
      </div>
      <div className="dashboard-grid">
        <EquityPoolSummary
          llc={llc}
          holders={holders}
          onExpandPool={() => setExpansionOpen(true)}
        />
        <ValuationSummary llc={llc} analyst={analyst} onSelectValuation={setSelectedValuation} />
      </div>
      <ValuationDetailModal llc={llc} valuation={selectedValuation} analyst={analyst} onClose={() => setSelectedValuation(null)} />
      {wizardOpen && <GrantWizard llcId={llc.id} onClose={() => setWizardOpen(false)} />}
      {expansionOpen && <PoolExpansionModal llcId={llc.id} onClose={() => setExpansionOpen(false)} />}
    </AppShell>
  );
}

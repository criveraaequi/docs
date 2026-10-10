// Aequi — Contracts page: all signed grant agreements (seeded + runtime).
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { formatDate } from "@/components/ValuationDetailModal";
import {
  getGrantsForLLC,
  getSeededEmployees,
} from "@/data/grantStore";
import { getAuthorizedUser, getLLCDetails } from "@/data/mockApi";
import { useGrantStore } from "@/data/useGrantStore";

const LLC_ID = "llc-1";

interface ContractEntry {
  key: string;
  name: string;
  role: string;
  units: number;
  grantDate: string;
  documentName: string;
  contractId: string; // route id for the contract viewer
}

export function ContractsPage() {
  const llc = getLLCDetails(LLC_ID);
  const owner = llc ? getAuthorizedUser(llc.id) : null;
  useGrantStore();

  if (!llc) {
    return (
      <div className="page-state" style={{ padding: "48px" }}>
        <Link className="back-link" to="/">← Back to dashboard</Link>
        <p>LLC not found.</p>
      </div>
    );
  }

  // Seeded employees already have signed contracts (no bell activity for them).
  const seededEntries: ContractEntry[] = getSeededEmployees(LLC_ID)
    .filter((employee) => employee.grant !== null)
    .map((employee) => ({
      key: `seeded-${employee.id}`,
      name: employee.name,
      role: employee.roleOrPosition,
      units: employee.grant?.unitsAwarded ?? 0,
      grantDate: employee.grant?.grantDate ?? "",
      documentName: employee.grant?.contractDocumentName ?? "",
      contractId: `seeded-${employee.id}`,
    }));

  // Runtime grants that have been signed become contract entries too.
  const runtimeEntries: ContractEntry[] = getGrantsForLLC(LLC_ID)
    .filter((grant) => grant.status === "active")
    .map((grant) => ({
      key: `runtime-${grant.id}`,
      name: grant.employeeName,
      role: grant.employeeRole,
      units: grant.unitsAwarded,
      grantDate: grant.grantDate,
      documentName: grant.contractDocumentName,
      contractId: grant.id,
    }));

  const entries = [...seededEntries, ...runtimeEntries].sort((a, b) =>
    b.grantDate.localeCompare(a.grantDate)
  );

  return (
    <AppShell llc={llc} owner={owner}>
      <div className="history-page">
        <Link className="back-link" to="/"><ArrowLeft size={15} /> Back to dashboard</Link>
        <div className="page-intro history-intro">
          <div>
            <span className="eyebrow">Documents · {llc.name}</span>
            <h1>Contracts</h1>
            <p>Signed phantom equity grant agreements. Click a contract to view the signed document.</p>
          </div>
          <span className="mock-badge">Mock data</span>
        </div>

        <section className="card contracts-card">
          {entries.length === 0 ? (
            <p className="empty-state">No signed contracts yet.</p>
          ) : (
            <>
              <div className="contracts-table-header">
                <span>Contract</span>
                <span>Issued</span>
                <span>Document</span>
              </div>
              {entries.map((entry) => (
                <div className="contracts-row" key={entry.key}>
                  <div className="contracts-name-cell">
                    <Link className="contracts-link" to={`/contracts/${entry.contractId}`}>
                      {entry.name}, {entry.units.toLocaleString()} units <ArrowUpRight size={13} />
                    </Link>
                    <span>{entry.role}</span>
                  </div>
                  <span>{formatDate(entry.grantDate)}</span>
                  <span className="contracts-doc-name">{entry.documentName}</span>
                </div>
              ))}
            </>
          )}
        </section>
      </div>
    </AppShell>
  );
}

// Aequi — Contracts page: all signed grant agreements (seeded + runtime).
import { useState } from "react";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { formatDate } from "@/components/ValuationDetailModal";
import {
  getGrantsForLLC,
} from "@/data/grantStore";
import { getAuthorizedUser, getEmployeesByLLC, getLLCDetails } from "@/data/mockApi";
import { useGrantStore } from "@/data/useGrantStore";

const LLC_ID = "llc-1";

type ContractSort = "date-latest" | "alphabetical" | "size";

const CONTRACT_SORT_OPTIONS: { label: string; value: ContractSort }[] = [
  { label: "Issue date (latest to earliest)", value: "date-latest" },
  { label: "Contract size (largest to smallest)", value: "size" },
  { label: "Alphabetical (A–Z)", value: "alphabetical" },
];

function sortContractEntries(entries: ContractEntry[], sort: ContractSort): ContractEntry[] {
  const sorted = [...entries];
  switch (sort) {
    case "alphabetical":
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case "size":
      return sorted.sort((a, b) => b.units - a.units);
    case "date-latest":
      return sorted.sort((a, b) => b.grantDate.localeCompare(a.grantDate));
  }
}

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
  const [sort, setSort] = useState<ContractSort>("date-latest");
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
  const seededEntries: ContractEntry[] = getEmployeesByLLC(LLC_ID)
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

  const entries = sortContractEntries([...seededEntries, ...runtimeEntries], sort);

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
              <div className="contracts-toolbar">
                <label className="sort-select">
                  <span>Sort</span>
                  <select
                    value={sort}
                    onChange={(event) => setSort(event.target.value as ContractSort)}
                  >
                    {CONTRACT_SORT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
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

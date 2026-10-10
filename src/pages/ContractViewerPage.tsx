// Aequi — Signed contract viewer: renders the agreement with signature blocks.
import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { ContractDocument } from "@/components/ContractDocument";
import { getGrantById, type GrantRecord } from "@/data/grantStore";
import { getAuthorizedUser, getEmployee, getLLCDetails } from "@/data/mockApi";
import { useGrantStore } from "@/data/useGrantStore";

/** Builds a view-only contract record for a seeded employee's grant. */
function seededGrantRecord(employeeId: string): GrantRecord | null {
  const employee = getEmployee(employeeId);
  const grant = employee?.grant;
  if (!employee || !grant) return null;
  return {
    id: `seeded-${employee.id}`,
    llcId: employee.llcId,
    employeeId: employee.id,
    employeeName: employee.name,
    employeeRole: employee.roleOrPosition,
    unitsAwarded: grant.unitsAwarded,
    strikePricePerUnit: grant.strikePricePerUnit,
    grantDate: grant.grantDate,
    scheduleLengthMonths: grant.vesting.scheduleLengthMonths,
    cliffDate: grant.vesting.cliffDate,
    vestingCompletionDate: grant.vesting.vestingCompletionDate,
    monthlyVestingRate: grant.vesting.monthlyVestingRate,
    contractDocumentName: grant.contractDocumentName,
    status: "active",
    signedAt: grant.grantDate,
    createdAt: grant.grantDate,
  };
}

export function ContractViewerPage() {
  const { grantId } = useParams<{ grantId: string }>();
  useGrantStore();

  const isSeeded = grantId?.startsWith("seeded-") ?? false;
  const grant = isSeeded
    ? seededGrantRecord(grantId!.slice("seeded-".length))
    : grantId
      ? getGrantById(grantId)
      : null;
  const llc = grant ? getLLCDetails(grant.llcId) : null;
  const owner = llc ? getAuthorizedUser(llc.id) : null;

  if (!grant || !llc) {
    return (
      <div className="page-state" style={{ padding: "48px" }}>
        <Link className="back-link" to="/contracts">← Back to contracts</Link>
        <p>Contract not found.</p>
      </div>
    );
  }

  return (
    <AppShell llc={llc} owner={owner}>
      <div className="history-page contract-viewer-page">
        <Link className="back-link" to="/contracts"><ArrowLeft size={15} /> Back to contracts</Link>
        <div className="page-intro history-intro">
          <div>
            <span className="eyebrow">Signed contract · {llc.name}</span>
            <h1>{grant.employeeName}, {grant.unitsAwarded.toLocaleString()} units</h1>
            <p>
              Equity Agreement Contract — issued {grant.grantDate}
              {grant.status === "active" ? " · signed" : " · pending signature"}
            </p>
          </div>
        </div>
        <section className="card contract-viewer-card">
          <ContractDocument grant={grant} llc={llc} owner={owner} />
        </section>
      </div>
    </AppShell>
  );
}

// Aequi — Employee portal: full equity agreement viewer.
// Renders the complete contract document for one of the signed-in employee's
// grants (seeded or runtime), scoped so an employee can only view their own.
import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { EmployeeShell } from "@/components/EmployeeShell";
import { ContractDocument } from "@/components/ContractDocument";
import { getEmployeeRecords } from "@/data/employeeStore";
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
    vestingTriggers: grant.vesting.vestingTriggers,
    vestingSlowdowns: grant.vesting.vestingSlowdowns,
    contractDocumentName: grant.contractDocumentName,
    status: "active",
    signedAt: grant.grantDate,
    createdAt: grant.grantDate,
  };
}

export function EmployeeContractViewerPage() {
  const { employeeId, grantId } = useParams<{ employeeId: string; grantId: string }>();
  useGrantStore();

  const record = employeeId
    ? getEmployeeRecords().find((item) => item.id === employeeId && item.hasEquity) ?? null
    : null;
  const employee = record ? getEmployee(record.id) : null;
  const llc = employee ? getLLCDetails(employee.llcId) : null;

  if (!record || !employee || !llc) {
    return (
      <div className="page-state" style={{ padding: "48px" }}>
        <Link className="back-link" to="/">← Back to dashboard</Link>
        <p>Employee portal not found.</p>
      </div>
    );
  }

  const isSeeded = grantId?.startsWith("seeded-") ?? false;
  const grant = isSeeded
    ? seededGrantRecord(grantId!.slice("seeded-".length))
    : grantId
      ? getGrantById(grantId)
      : null;

  if (!grant || grant.employeeId !== employee.id) {
    return (
      <div className="page-state" style={{ padding: "48px" }}>
        <Link className="back-link" to={`/portal/${employee.id}`}>← Back to My Equity</Link>
        <p>Agreement not found.</p>
      </div>
    );
  }

  const owner = getAuthorizedUser(llc.id);
  const statusNote = grant.status === "active"
    ? "· signed"
    : grant.status === "pending"
      ? "· awaiting your decision"
      : "· declined — owner revising";

  return (
    <EmployeeShell employee={employee}>
      <div className="history-page contract-viewer-page">
        <Link className="back-link" to={`/portal/${employee.id}`}>
          <ArrowLeft size={15} /> Back to My Equity
        </Link>
        <div className="page-intro history-intro">
          <div>
            <span className="eyebrow">Equity agreement · {llc.name}</span>
            <h1>{grant.unitsAwarded.toLocaleString()} units</h1>
            <p>Equity Agreement Contract — issued {grant.grantDate} {statusNote}</p>
          </div>
        </div>
        <section className="card contract-viewer-card">
          <ContractDocument grant={grant} llc={llc} owner={owner} />
        </section>
      </div>
    </EmployeeShell>
  );
}

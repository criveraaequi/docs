// Aequi — Employee portal: full valuation history page.
// Read-only certified valuation timeline for the employee's company, with the
// latest figure marked preliminary while a review is underway, and the
// analyst identified only while engaged on the review.
import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { EmployeeShell } from "@/components/EmployeeShell";
import { formatDate } from "@/components/ValuationDetailModal";
import { getEmployeeRecords } from "@/data/employeeStore";
import { getEmployee, getEngagementStatus, getLLCDetails } from "@/data/mockApi";
import { useGrantStore } from "@/data/useGrantStore";

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export function EmployeeValuationsPage() {
  const { employeeId } = useParams<{ employeeId: string }>();
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

  const history = llc.valuationHistory ?? [];
  const engagement = getEngagementStatus(llc.id);
  const isPreCertification = engagement !== null && engagement.currentStage !== "Certified";
  // The analyst is identified only while actively engaged on a review
  // touching this company's data (role-permission map).
  const analystEngaged = engagement !== null
    && !["Requested", "Matching"].includes(engagement.currentStage);

  return (
    <EmployeeShell employee={employee}>
      <div className="history-page">
        <Link className="back-link" to={`/portal/${employee.id}`}>
          <ArrowLeft size={15} /> Back to My Equity
        </Link>
        <div className="page-intro history-intro">
          <div>
            <span className="eyebrow">Company valuations · {llc.name}</span>
            <h1>Valuation history</h1>
            <p>Every valuation event on record for your company, oldest to newest.</p>
          </div>
          {isPreCertification && <span className="preliminary-pill">Latest figure preliminary</span>}
        </div>

        <section className="card">
          {history.length === 0 ? (
            <p className="empty-state">No certified valuations yet.</p>
          ) : (
            <ul className="employee-valuation-list">
              {history.map((event, index) => {
                const isLatest = index === history.length - 1;
                return (
                  <li key={event.date} className="employee-valuation-row">
                    <div>
                      <strong>{formatDate(event.date)}</strong>
                      <span>{event.cpaFirm ?? "Independent valuation"}</span>
                    </div>
                    <div className="employee-valuation-figures">
                      <strong>{currency.format(event.valuationAmount)}</strong>
                      <span>${event.resultingStrikePrice.toFixed(2)} / unit</span>
                    </div>
                    {isLatest && isPreCertification && (
                      <span className="status-label status-pending">Preliminary</span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {analystEngaged && (
            <p className="employee-analyst-note">
              Valuation performed by <strong>Dr. Eleanor Cho</strong>, CVA — Aequi Certified Analyst.
            </p>
          )}
        </section>
      </div>
    </EmployeeShell>
  );
}

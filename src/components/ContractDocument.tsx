// Aequi — Phantom Equity Grant Agreement (mock contract document).
// Rendered as a formatted page rather than a real PDF for the closed beta.
import { formatDate } from "@/components/ValuationDetailModal";
import type { GrantRecord } from "@/data/grantStore";
import type { LLCAuthorizedUser, LLC } from "@/data/types";

interface ContractDocumentProps {
  grant: GrantRecord;
  llc: LLC;
  owner: LLCAuthorizedUser | null;
}

export function ContractDocument({ grant, llc, owner }: ContractDocumentProps) {
  const isSigned = grant.status === "active";

  return (
    <article className="contract-doc">
      <header className="contract-doc-header">
        <span className="eyebrow">Phantom Equity Grant Agreement</span>
        <h1>{llc.name}</h1>
        <p className="contract-doc-sub">
          {grant.contractDocumentName} · Issued {formatDate(grant.grantDate)}
        </p>
      </header>

      <div className="contract-doc-body">
        <p>
          This Phantom Equity Grant Agreement (the “Agreement”) is made as of{" "}
          <strong>{formatDate(grant.grantDate)}</strong> by and between{" "}
          <strong>{llc.name}</strong>, a limited liability company (the “Company”), and{" "}
          <strong>{grant.employeeName}</strong> ({grant.employeeRole}) (the “Participant”).
        </p>

        <h2>1. Grant of Phantom Units</h2>
        <p>
          The Company hereby grants the Participant <strong>{grant.unitsAwarded.toLocaleString()}</strong>{" "}
          phantom units (the “Units”), representing a hypothetical interest in the Company’s
          phantom equity pool. The Units do not constitute actual equity, ownership, or shares in
          the Company, and carry no voting rights.
        </p>

        <h2>2. Unit Price</h2>
        <p>
          The initial unit price is <strong>${grant.strikePricePerUnit.toFixed(2)}</strong> per
          Unit, derived from the Company’s most recent certified valuation as of the grant date.
          The unit price may be adjusted upon future certified valuations.
        </p>

        <h2>3. Vesting Schedule</h2>
        <p>
          The Units vest under the Company’s standard schedule: a one-year cliff followed by
          monthly vesting over a total period of{" "}
          <strong>{grant.scheduleLengthMonths} months</strong>.
        </p>
        <ul>
          <li>
            <strong>Cliff date:</strong> {formatDate(grant.cliffDate)} —{" "}
            {Math.round((grant.scheduleLengthMonths / 12) * 100) / 100 > 0
              ? `${Math.round((grant.unitsAwarded * 12 / grant.scheduleLengthMonths) * 100) / 100} units`
              : "0 units"}{" "}
            vest upon completion of the cliff (one year of service).
          </li>
          <li>
            <strong>Monthly vesting:</strong>{" "}
            {grant.monthlyVestingRate.toFixed(2).replace(/\.00$/, "")} units per month thereafter.
          </li>
          <li>
            <strong>Fully vested:</strong> {formatDate(grant.vestingCompletionDate)}.
          </li>
        </ul>

        <h2>4. Termination</h2>
        <p>
          If the Participant’s employment ends for any reason before the applicable vesting date,
          all unvested Units are forfeited. Vested Units remain payable at the then-current unit
          price upon a liquidity event, subject to the terms of the plan.
        </p>

        <h2>5. Nature of Award</h2>
        <p>
          This award is a purely contractual, unfunded promise to pay. It is not intended to
          qualify as equity compensation under any tax code section, and the Participant is
          responsible for all applicable taxes on any payout received.
        </p>

        <p className="contract-doc-note">
          Closed-beta placeholder document — a attorney-drafted template is still in review.
        </p>
      </div>

      <footer className="contract-signatures">
        <div className={`signature-block${isSigned ? " is-signed" : ""}`}>
          <span className="signature-line">
            {isSigned ? grant.employeeName : "Pending signature"}
          </span>
          <span className="signature-role">Participant — {grant.employeeName}</span>
          <span className="signature-date">
            {isSigned && grant.signedAt ? `Signed ${formatDate(grant.signedAt.slice(0, 10))}` : "Awaiting signature"}
          </span>
        </div>
        <div className={`signature-block${isSigned ? " is-signed" : ""}`}>
          <span className="signature-line">{isSigned ? (owner?.name ?? llc.name) : "Pending countersignature"}</span>
          <span className="signature-role">
            Company — {owner?.titleOrPosition ?? "Authorized Representative"}, {llc.name}
          </span>
          <span className="signature-date">
            {isSigned && grant.signedAt ? `Signed ${formatDate(grant.signedAt.slice(0, 10))}` : "Awaiting signature"}
          </span>
        </div>
      </footer>
    </article>
  );
}

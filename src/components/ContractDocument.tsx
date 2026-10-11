// Aequi — Phantom Equity Grant Agreement (mock contract document).
// Rendered as a formatted page rather than a real PDF for the closed beta.
import { formatDate } from "@/components/ValuationDetailModal";
import type { GrantRecord } from "@/data/grantStore";
import { getValuationHistory } from "@/data/mockApi";
import type { LLCAuthorizedUser, LLC } from "@/data/types";
import { currentStrikePrice, fullMonthsBetween } from "@/data/vesting";

interface ContractDocumentProps {
  grant: GrantRecord;
  llc: LLC;
  owner: LLCAuthorizedUser | null;
}

export function ContractDocument({ grant, llc, owner }: ContractDocumentProps) {
  const isSigned = grant.status === "active";

  const valuationHistory = getValuationHistory(grant.llcId);
  const currentPrice = currentStrikePrice(valuationHistory, grant.strikePricePerUnit);
  const latestValuation = valuationHistory.length > 0 ? valuationHistory[valuationHistory.length - 1] : null;
  const priceHasChanged = Math.abs(currentPrice - grant.strikePricePerUnit) > 0.005;

  const cliffMonths = Math.max(fullMonthsBetween(grant.grantDate, grant.cliffDate), 0);
  const triggers = grant.vestingTriggers.filter((trigger) => trigger.percentOfAward > 0);
  const triggerPercent = Math.min(
    triggers.reduce((sum, trigger) => sum + trigger.percentOfAward, 0),
    100
  );
  const slowdowns = grant.vestingSlowdowns.filter(
    (slowdown) => slowdown.toMonth > slowdown.fromMonth && slowdown.paceMultiplier < 1
  );
  const vestingMonths = Math.max(grant.scheduleLengthMonths - cliffMonths, 1);
  const monthlyRate = (grant.unitsAwarded * (100 - triggerPercent)) / 100 / vestingMonths;

  const dateAt = (month: number) => {
    const date = new Date(grant.grantDate);
    date.setMonth(date.getMonth() + month);
    return date.toISOString().slice(0, 10);
  };
  const slowdownDuration = (slowdown: (typeof grant.vestingSlowdowns)[number]) =>
    slowdown.toMonth - slowdown.fromMonth;

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
          Unit, derived from the Company’s certified valuation as of the grant date.
        </p>
        {priceHasChanged && latestValuation && (
          <p>
            Following the certified valuation of {formatDate(latestValuation.date)}, the unit
            price currently in effect is <strong>${currentPrice.toFixed(2)}</strong> per Unit.
          </p>
        )}
        <p>
          The unit price is recalculated upon each future certified valuation of the Company.
          Vested Units remain payable at the unit price in effect at the time of payout, so a
          future valuation may increase or decrease the per-Unit payout value.
        </p>

        <h2>3. Vesting Schedule</h2>
        <p>
          The Units vest over a total period of{" "}
          <strong>{grant.scheduleLengthMonths} months</strong> from the grant date, with a
          cliff of <strong>{cliffMonths} months</strong>. No Units vest before the cliff date;
          after the cliff, the remaining Units vest in monthly installments until the schedule
          completes.
        </p>
        <ul>
          <li>
            <strong>Cliff:</strong> {formatDate(grant.cliffDate)} — {cliffMonths} months of
            service ({Math.round((cliffMonths / 12) * 10) / 10} years). Nothing vests before
            this date.
          </li>
          <li>
            <strong>Monthly vesting:</strong>{" "}
            {monthlyRate.toFixed(2).replace(/\.00$/, "")} units per month from the cliff date
            through the completion date{triggerPercent > 0 && ", covering the portion of the award not released by trigger"}.
          </li>
          {triggers.map((trigger, index) => (
            <li key={`trigger-${index}`}>
              <strong>Vesting trigger {index + 1}:</strong>{" "}
              {Math.round((grant.unitsAwarded * trigger.percentOfAward) / 100).toLocaleString()}
              units ({trigger.percentOfAward}% of the award) release on{" "}
              {formatDate(dateAt(trigger.atMonth))} — month {trigger.atMonth} of the schedule.
            </li>
          ))}
          {slowdowns.map((slowdown, index) => (
            <li key={`slowdown-${index}`}>
              <strong>Slowdown window {index + 1}:</strong> from month {slowdown.fromMonth} ({formatDate(dateAt(slowdown.fromMonth))}) to
              month {slowdown.toMonth} ({formatDate(dateAt(slowdown.toMonth))}) — {slowdownDuration(slowdown)} months, during which
              monthly vesting runs at {Math.round(slowdown.paceMultiplier * 100)}% of the normal
              pace (about {(monthlyRate * slowdown.paceMultiplier).toFixed(2)} units per month).
              Vesting missed during the window is recovered in later months, so the award still
              fully vests on the completion date.
            </li>
          ))}
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

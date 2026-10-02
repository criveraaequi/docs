import { X } from "lucide-react";
import { Link } from "react-router-dom";
import type { Analyst, LLC, ValuationEvent } from "@/data/types";

interface ValuationDetailModalProps {
  llc: LLC;
  valuation: ValuationEvent | null;
  analyst: Analyst | null;
  onClose: () => void;
}

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function ValuationDetailModal({
  llc,
  valuation,
  analyst,
  onClose,
}: ValuationDetailModalProps) {
  if (!valuation) return null;

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="valuation-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <span className="eyebrow">Certified valuation</span>
            <h2 id="valuation-modal-title">Valuation details</h2>
          </div>
          <button className="close-button" type="button" aria-label="Close valuation details" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="modal-grid">
          <div className="modal-field">
            <span>Valuation amount</span>
            <strong>{currency.format(valuation.valuationAmount)}</strong>
          </div>
          <div className="modal-field">
            <span>Certification date</span>
            <strong>{formatDate(valuation.date)}</strong>
          </div>
          <div className="modal-field">
            <span>Certified by</span>
            <strong>{analyst?.name ?? "Assigned analyst"}</strong>
            <small>{analyst ? `${analyst.credentialType} · ${analyst.yearsOfExperience} years` : "Credential details unavailable"}</small>
          </div>
          <div className="modal-field">
            <span>CPA firm</span>
            <strong>{valuation.cpaFirm ?? "Not applicable"}</strong>
          </div>
          <div className="modal-field">
            <span>Resulting strike price</span>
            <strong>${valuation.resultingStrikePrice.toFixed(2)} / unit</strong>
          </div>
        </div>
        <div className="modal-footer">
          <a className="link" href={`mailto:analyst@aequi.example?subject=${encodeURIComponent(`${llc.name} valuation`)}`}>
            Contact Analyst
          </a>
          <Link className="button button-primary" to={`/valuation-history/${llc.id}`} onClick={onClose}>
            View Full Valuation History
          </Link>
        </div>
      </section>
    </div>
  );
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

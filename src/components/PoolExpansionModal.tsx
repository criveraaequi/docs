// Aequi — Phantom pool expansion modal (owner-facing).
// Flow: percent picker (presets + custom) with live units conversion note ->
// verification passcode (placeholder "1234") -> submitted, pending approval.
import { ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import {
  createPoolExpansion,
  EXPANSION_PASSCODE,
  getEffectivePool,
  type PoolExpansionRecord,
} from "@/data/grantStore";

interface PoolExpansionModalProps {
  llcId: string;
  onClose: () => void;
}

function suggestedPresets(currentPercent: number): number[] {
  return [currentPercent + 2, currentPercent + 5, currentPercent + 10];
}

export function PoolExpansionModal({ llcId, onClose }: PoolExpansionModalProps) {
  const pool = getEffectivePool(llcId);
  const currentPercent = pool.equityPoolPercent;
  const authorizedUnits = pool.totalUnitsAuthorized;

  const [percentChoice, setPercentChoice] = useState<number | null>(null);
  const [useCustom, setUseCustom] = useState(false);
  const [customPercent, setCustomPercent] = useState<string>("");
  const [passcode, setPasscode] = useState("");
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [submitted, setSubmitted] = useState<PoolExpansionRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  const effectivePercent = useCustom ? Number(customPercent) || 0 : percentChoice ?? 0;
  const newUnits = Math.round((effectivePercent / 100) * authorizedUnits);
  const oldUnits = Math.round((currentPercent / 100) * authorizedUnits);
  const addedUnits = newUnits - oldUnits;
  const isValid = effectivePercent > currentPercent && effectivePercent <= 100;

  async function handleSubmit() {
    setError(null);
    try {
      const record = await createPoolExpansion({ llcId, newPercent: effectivePercent });
      setSubmitted(record);
      setStep(3);
    } catch (submitError) {
      setError("Something went wrong submitting the expansion. Please try again.");
      console.error(submitError);
    }
  }

  const presets = useMemo(() => suggestedPresets(currentPercent), [currentPercent]);

  return (
    <div className="wizard-overlay" role="dialog" aria-modal="true" aria-label="Expand phantom pool">
      <div className="wizard-modal wizard-expansion">
        <div className="wizard-header">
          <div>
            <span className="eyebrow">Phantom equity pool · {llcId === "llc-1" ? "Summit HVAC Solutions LLC" : llcId}</span>
            <h2>Expand phantom pool</h2>
          </div>
          <button className="wizard-close" type="button" aria-label="Close" onClick={onClose}>×</button>
        </div>

        {step === 1 && (
          <div className="wizard-body">
            <p className="wizard-hint">
              Your pool is currently <strong>{currentPercent}%</strong> of the company
              ({oldUnits.toLocaleString()} units). Choose a new percentage to expand it to.
            </p>
            <div className="wizard-length-options">
              {presets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className={`wizard-length-option${!useCustom && percentChoice === preset ? " is-selected" : ""}`}
                  onClick={() => {
                    setPercentChoice(preset);
                    setUseCustom(false);
                  }}
                >
                  <strong>{preset}%</strong>
                  <span>+{(preset - currentPercent).toFixed(0)} points</span>
                </button>
              ))}
              <div className={`wizard-length-option wizard-length-custom${useCustom ? " is-selected" : ""}`}>
                <strong>Custom</strong>
                <input
                  type="number"
                  min={currentPercent + 1}
                  max={100}
                  placeholder="Percent"
                  value={useCustom ? customPercent : ""}
                  onFocus={() => setUseCustom(true)}
                  onChange={(event) => {
                    setUseCustom(true);
                    setCustomPercent(event.target.value);
                  }}
                />
              </div>
            </div>
            <p className="expansion-units-note">
              {effectivePercent > currentPercent
                ? <>
                    <strong>{effectivePercent}%</strong> converts to{" "}
                    <strong>{newUnits.toLocaleString()} units</strong> in your phantom pool
                    {addedUnits > 0 && <> — adds <strong>{addedUnits.toLocaleString()} new units</strong></>}.
                  </>
                : "Choose a percentage above your current one to see the conversion."}
            </p>
            <div className="wizard-actions">
              <button className="button-secondary" type="button" onClick={onClose}>Cancel</button>
              <button
                className="button-primary"
                type="button"
                disabled={!isValid}
                onClick={() => setStep(2)}
              >
                Continue to verification
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="wizard-body">
            <div className="expansion-verify-head">
              <ShieldCheck size={22} />
              <div>
                <h3>Verify &amp; certify expansion</h3>
                <p className="wizard-hint">
                  Confirm the expansion from {currentPercent}% to{" "}
                  <strong>{effectivePercent}%</strong> ({newUnits.toLocaleString()} units,
                  +{addedUnits.toLocaleString()} new).
                </p>
              </div>
            </div>
            <label className="wizard-field">
              <span>Verification passcode</span>
              <input
                type="password"
                inputMode="numeric"
                placeholder="Enter verification passcode"
                value={passcode}
                onChange={(event) => setPasscode(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && passcode === EXPANSION_PASSCODE) handleSubmit();
                }}
              />
            </label>
            {error && <p className="wizard-error">{error}</p>}
            <p className="wizard-hint">
              In production this will be a compliant verification code sent to the company's
              registered contact.
            </p>
            <div className="wizard-actions">
              <button className="button-secondary" type="button" onClick={() => setStep(1)}>Back</button>
              <button
                className="button-primary"
                type="button"
                disabled={passcode !== EXPANSION_PASSCODE}
                onClick={handleSubmit}
              >
                Submit expansion for approval
              </button>
            </div>
          </div>
        )}

        {step === 3 && submitted && (
          <div className="wizard-body wizard-confirm-body">
            <div className="wizard-confirm-icon"><ShieldCheck size={26} /></div>
            <h2>Expansion submitted</h2>
            <p>
              Request to expand the pool from {submitted.previousPercent}% to{" "}
              <strong>{submitted.newPercent}%</strong> ({submitted.newAuthorizedUnits.toLocaleString()}{" "}
              units) is now <strong>pending approval</strong>. Your pool stays at its current size
              until it is approved.
            </p>
            <p className="wizard-confirm-demo">
              Demo tip: approve it from the pool card's pending-expansion notice to apply the new
              pool size, then return here to grant more units.
            </p>
            <div className="wizard-actions">
              <button className="button-primary" type="button" onClick={onClose}>Done</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

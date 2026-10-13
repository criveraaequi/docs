// Aequi — Expand phantom pool page (owner-facing).
// Full-page version of the expansion flow: percent picker (presets + custom)
// with live units conversion note -> verification passcode (placeholder
// "1234") -> submitted, pending approval.
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  createPoolExpansion,
  EXPANSION_PASSCODE,
  getEffectivePool,
  type PoolExpansionRecord,
} from "@/data/grantStore";

interface PoolExpansionPageProps {
  llcId: string;
}

function suggestedPresets(currentPercent: number): number[] {
  return [currentPercent + 2, currentPercent + 5, currentPercent + 10];
}

export function PoolExpansionPage({ llcId }: PoolExpansionPageProps) {
  const pool = getEffectivePool(llcId);
  const currentPercent = pool.equityPoolPercent;
  const authorizedUnits = pool.totalUnitsAuthorized;
  const navigate = useNavigate();

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
    <div className="flow-page">
      <Link className="back-link" to="/"><ArrowLeft size={15} /> Back to dashboard</Link>

      <div className="page-intro flow-intro">
        <div>
          <span className="eyebrow">Phantom equity pool · {llcId === "llc-1" ? "Summit HVAC Solutions LLC" : llcId}</span>
          <h1>
            {step === 1 && "Expand phantom pool"}
            {step === 2 && "Verify & certify"}
            {step === 3 && "Expansion submitted"}
          </h1>
        </div>
      </div>

      <section className="card flow-card step-transition" key={step}>
        <div className="wizard-steps" aria-label={`Step ${step} of 3`}>
          {[1, 2, 3].map((marker) => (
            <span
              key={marker}
              className={`wizard-step-dot${marker === step ? " is-active" : ""}${marker < step ? " is-done" : ""}`}
            />
          ))}
          <span className="wizard-step-label">Step {step} of 3</span>
        </div>

        {step === 1 && (
          <div className="flow-body">
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
            <div className="expansion-sim" aria-label="Simulation: phantom pool size compared to the whole company">
              <div className="expansion-sim-head">
                <span className="eyebrow">Simulation · pool vs company</span>
                {isValid && (
                  <span className="expansion-sim-delta">
                    {effectivePercent}% of the company in the pool
                  </span>
                )}
              </div>
              {isValid ? (
                <>
                  <div className="pool-bar expansion-sim-bar">
                    <div
                      className="pool-bar-segment"
                      style={{ width: `${currentPercent}%`, backgroundColor: "#1f3164" }}
                      title={`Current pool — ${currentPercent}% of company (${oldUnits.toLocaleString()} units)`}
                    />
                    <div
                      className="pool-bar-segment"
                      style={{ width: `${effectivePercent - currentPercent}%`, backgroundColor: "#4a7c59" }}
                      title={`New expansion — +${(effectivePercent - currentPercent).toFixed(0)} points (${addedUnits.toLocaleString()} new units)`}
                    />
                    <div
                      className="pool-bar-segment"
                      style={{ width: `${100 - effectivePercent}%`, backgroundColor: "#d9d7ce" }}
                      title={`Everyone else — ${(100 - effectivePercent).toFixed(0)}% of company`}
                    />
                  </div>
                  <div className="expansion-sim-legend">
                    <div className="legend-item">
                      <span className="legend-swatch" style={{ backgroundColor: "#1f3164" }} />
                      <span>Current pool</span>
                      <strong>{currentPercent}%</strong>
                    </div>
                    <div className="legend-item">
                      <span className="legend-swatch" style={{ backgroundColor: "#4a7c59" }} />
                      <span>New expansion</span>
                      <strong>+{(effectivePercent - currentPercent).toFixed(0)} pts</strong>
                    </div>
                    <div className="legend-item">
                      <span className="legend-swatch" style={{ backgroundColor: "#d9d7ce" }} />
                      <span>Outside the pool</span>
                      <strong>{(100 - effectivePercent).toFixed(0)}%</strong>
                    </div>
                  </div>
                  <p className="expansion-sim-note">
                    If approved, <strong>{effectivePercent}%</strong> of all company value would flow
                    through the phantom pool — up from {currentPercent}% today.
                  </p>
                </>
              ) : (
                <p className="expansion-sim-note">
                  Pick a percentage above your current {currentPercent}% to preview how the pool
                  would sit inside the company.
                </p>
              )}
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
          <div className="flow-body">
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
          <div className="flow-body wizard-confirm-body">
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
            <div className="wizard-actions flow-confirm-actions">
              <button className="button-primary" type="button" onClick={() => navigate("/")}>
                Done
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

// Aequi — Vesting math
// Single source of truth for vesting calculations so every screen agrees and
// values stay correct as the calendar moves.

import type { Employee, EquityGrant, ValuationEvent } from "./types";

/** ISO date string for today. */
export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Whole months fully elapsed between two ISO dates (calendar-accurate). */
export function fullMonthsBetween(fromIso: string, toIso: string): number {
  const from = new Date(fromIso);
  const to = new Date(toIso);
  if (to.getTime() <= from.getTime()) return 0;
  let months =
    (to.getFullYear() - from.getFullYear()) * 12 +
    (to.getMonth() - from.getMonth());
  // If the day-of-month hasn't been reached yet, the last month isn't complete.
  const anchor = new Date(from);
  anchor.setMonth(from.getMonth() + months);
  if (anchor.getTime() > to.getTime()) months -= 1;
  return Math.max(months, 0);
}

/** Certified per-unit price in force at a given date (last valuation on or before it). */
export function strikePriceAt(history: ValuationEvent[], isoDate: string): number {
  if (history.length === 0) return 0;
  const time = new Date(isoDate).getTime();
  let price = history[0].resultingStrikePrice;
  for (const event of history) {
    if (new Date(event.date).getTime() <= time) price = event.resultingStrikePrice;
  }
  return price;
}

/** Latest certified strike price for an LLC (or the grant's original if no valuations). */
export function currentStrikePrice(history: ValuationEvent[], fallback: number): number {
  return history.length > 0 ? history[history.length - 1].resultingStrikePrice : fallback;
}

/**
 * Units vested as of a date under the standard schedule: nothing before the
 * cliff, then the monthly rate per full month elapsed, capped at the award and
 * frozen at any cutoff (e.g. a termination date).
 */
export function vestedUnitsAsOf(
  grant: EquityGrant,
  asOfIso: string,
  vestingCutoffIso?: string | null
): number {
  const { unitsAwarded, vesting } = grant;

  let endIso = asOfIso;
  if (vestingCutoffIso && new Date(vestingCutoffIso).getTime() < new Date(endIso).getTime()) {
    endIso = vestingCutoffIso;
  }
  if (new Date(vesting.vestingCompletionDate).getTime() < new Date(endIso).getTime()) {
    endIso = vesting.vestingCompletionDate;
  }

  const cliffMonths = fullMonthsBetween(vesting.grantDate, vesting.cliffDate);
  const monthsElapsed = fullMonthsBetween(vesting.grantDate, endIso);
  if (monthsElapsed < cliffMonths) return 0;

  const triggers = vesting.vestingTriggers ?? [];
  const slowdowns = vesting.vestingSlowdowns ?? [];
  const triggeredPercent = Math.min(
    triggers.reduce((sum, trigger) => sum + trigger.percentOfAward, 0),
    100
  );
  const remainderPercent = 100 - triggeredPercent;
  const monthlyUnits = (unitsAwarded * remainderPercent) / 100;
  const totalVestingMonths = Math.max(
    monthsBetween(vesting.grantDate, vesting.vestingCompletionDate) - cliffMonths,
    1
  );
  const baseMonthlyRate = monthlyUnits / totalVestingMonths;

  let vested = 0;
  for (const trigger of triggers) {
    if (trigger.atMonth <= monthsElapsed) {
      vested += Math.round((unitsAwarded * trigger.percentOfAward) / 100);
    }
  }

  // Walk each elapsed month after the cliff, applying the slowest applicable
  // pace. Slowed months vest less now and their shortfall (recoveryDebt) is
  // added to later months, so the award still reaches 100% on the original date.
  let recoveryDebt = 0;
  for (let month = cliffMonths; month <= monthsElapsed; month += 1) {
    let pace = 1;
    for (const slowdown of slowdowns) {
      if (month >= slowdown.fromMonth && month < slowdown.toMonth) {
        pace = Math.min(pace, slowdown.paceMultiplier);
      }
    }
    vested += (baseMonthlyRate + recoveryDebt) * pace;
    recoveryDebt += baseMonthlyRate * (1 - pace);
  }
  return Math.min(Math.round(vested), unitsAwarded);
}

function monthsBetween(fromIso: string, toIso: string): number {
  return fullMonthsBetween(fromIso, toIso);
}

/** Units an employee has vested as of today (frozen at termination if applicable). */
export function employeeVestedUnits(employee: Employee): number {
  if (!employee.grant) return 0;
  return vestedUnitsAsOf(employee.grant, todayIso(), employee.terminationDate);
}

/** Dollar value of vested units at the latest certified unit price. */
export function employeeVestedPayout(
  employee: Employee,
  valuationHistory: ValuationEvent[]
): number {
  if (!employee.grant) return 0;
  const price = currentStrikePrice(
    valuationHistory.filter((event) => event.date <= todayIso()),
    employee.grant.strikePricePerUnit
  );
  return Math.round(employeeVestedUnits(employee) * price);
}

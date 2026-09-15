import type { DerivedGeometry } from '../geometry/derive'
import type { ScaffoldInputs } from '../types/modules'
import { ceilDiv, mmToM } from './units'

export interface ScaffoldResult {
  heightM: number
  perimeterM: number
  lifts: number
  bays: number
  standards: number
  ledgers: number
  transoms: number
  boards: number
  toeBoards: number
  hireWeeks: number
  hireGbp: number
  notes: string[]
}

/** Indicative independent scaffold hire, £ / elevation m² / week (UK ballpark). */
export const SCAFFOLD_GBP_PER_M2_WEEK = 4.5
export const BAY_MM = 2100

/**
 * Scaffolding from building height + footprint/perimeter.
 *
 * Height = storey height × storeys + 1 m (working lift above eaves, no roof pitch here).
 * Lifts = ceil(height / liftHeight) + extra.
 * Bays = ceil(perimeter / 2.1 m).
 * Standards ≈ 2 × (bays + 1)  (two lines).
 * Ledgers ≈ 2 × bays × lifts; transoms ≈ bays × lifts.
 * Boards ≈ bays × 5 per lift (five 225 mm boards); toe boards = bays × lifts.
 * Edge protection included in the board/toe count.
 * Hire = elevation area × weeks × £4.50 / m² / week (indicative).
 */
export function calcScaffold(g: DerivedGeometry, input: ScaffoldInputs): ScaffoldResult {
  const heightM = mmToM(g.storeyHeightMm) * g.storeys + 1
  const perimeterM = mmToM(g.externalLengthMm)
  const lifts = ceilDiv(heightM * 1000, input.liftHeightMm) + input.extraLifts
  const bays = ceilDiv(perimeterM * 1000, BAY_MM)
  const standards = 2 * (bays + 1)
  const ledgers = 2 * bays * Math.max(1, lifts)
  const transoms = bays * Math.max(1, lifts)
  const boards = bays * 5 * Math.max(1, lifts)
  const toeBoards = bays * Math.max(1, lifts)
  const elevationM2 = perimeterM * heightM
  const hireGbp = elevationM2 * input.hireWeeks * SCAFFOLD_GBP_PER_M2_WEEK
  return {
    heightM,
    perimeterM,
    lifts: Math.max(1, lifts),
    bays,
    standards,
    ledgers,
    transoms,
    boards,
    toeBoards,
    hireWeeks: input.hireWeeks,
    hireGbp,
    notes: [
      'Independent scaffold take-off for a scaffolder’s schedule — not a TG20 design.',
      `Hire ≈ £${SCAFFOLD_GBP_PER_M2_WEEK.toFixed(2)} / m² elevation / week (supply & labour ballpark).`,
    ],
  }
}

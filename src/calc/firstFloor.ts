import type { DerivedGeometry } from '../geometry/derive'
import type { FirstFloorInputs } from '../types/modules'
import { mmToM } from './units'

export interface FirstFloorResult {
  spanMm: number
  lengthMm: number
  joists: number
  joistLinearM: number
  nogginsM: number
  struttingM: number
  herringboneM: number
  trimmers: number
  trimmerLengthMm: number
  notes: string[]
}

/**
 * First floor (load from above). Same joist logic as a suspended ground floor:
 *   n = floor(building length / centres) + 1, spanning the shorter plan dimension.
 * Noggins: one row mid-span, length ≈ building length.
 * Strutting / herringbone: extra mid-span bracing ≈ building length.
 * Trimmer schedule: one pair around the stair opening (2 trimmers at opening length,
 *   1 trimmer joist at opening width) — indicative, not designed.
 */
export function calcFirstFloor(g: DerivedGeometry, input: FirstFloorInputs): FirstFloorResult {
  const spanMm = g.spanMm
  const lengthMm = g.lengthMm
  const joists = spanMm > 0 ? Math.floor(lengthMm / input.joistCentresMm) + 1 : 0
  const joistLinearM = joists * mmToM(spanMm)
  const nogginsM = input.noggins ? mmToM(lengthMm) : 0
  const struttingM = input.strutting ? mmToM(lengthMm) : 0
  const herringboneM = input.herringbone ? mmToM(lengthMm) * 1.4 : 0
  const trimmers = input.stairOpeningLengthMm > 0 ? 3 : 0
  const trimmerLengthMm = input.stairOpeningLengthMm * 2 + input.stairOpeningWidthMm
  const notes: string[] = [
    `${input.joistWidthMm} × ${input.joistDepthMm} at ${input.joistCentresMm} mm — span-table indicative only (Eurocode 5 / Part A).`,
  ]
  if (g.storeys < 2) notes.push('Plan is single storey — first-floor joists apply if you add a storey.')
  notes.push('Trimmers around the stair opening are a pair of trimming joists plus a trimmer.')
  return {
    spanMm,
    lengthMm,
    joists,
    joistLinearM,
    nogginsM,
    struttingM,
    herringboneM,
    trimmers,
    trimmerLengthMm,
    notes,
  }
}

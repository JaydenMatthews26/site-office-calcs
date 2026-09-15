import type { DerivedGeometry } from '../geometry/derive'
import type { FinishesInputs } from '../types/modules'
import { ceilDiv, mmToM, withWaste } from './units'

export interface FinishesResult {
  wallM2: number
  ceilingM2: number
  pbSheets: number
  skimM2: number
  compoundBags: number
  paintM2: number
  paintLitres: number
  paintTins: number
  covingM: number
  notes: string[]
}

/**
 * Internal finishes from partition + external inner faces and ceiling footprint.
 *
 * Wall area = partition length × height × 2 faces
 *           + external perimeter × height × 1 inner face
 *           − opening areas.
 * Ceiling = footprint × storeys (each floor has a ceiling).
 * PB sheets = wall+ceiling area / 2.88 m² + waste (if boarded).
 * Skim = same area; compound ≈ 1 bag (25 kg) per 20 m².
 * Paint tins from remaining painting section can duplicate; here optional coats on walls+ceiling.
 */
export function calcFinishes(g: DerivedGeometry, input: FinishesInputs): FinishesResult {
  const h = mmToM(g.storeyHeightMm)
  const partitionM2 = mmToM(g.partitionLengthMm) * h * 2 * g.storeys
  const innerExternalM2 = mmToM(g.externalLengthMm) * h * g.storeys
  const wallM2 = Math.max(0, partitionM2 + innerExternalM2 - g.openingAreaM2)
  const ceilingM2 = g.footprintM2 * g.storeys
  const boardM2 = (input.plasterboard ? wallM2 + ceilingM2 : 0)
  const pbSheets = input.plasterboard ? ceilDiv(withWaste(boardM2, input.wastePct), input.pbSheetM2) : 0
  const skimM2 = input.skim ? wallM2 + ceilingM2 : 0
  const compoundBags = ceilDiv(skimM2, 20)
  const paintM2 = input.paint ? (wallM2 + ceilingM2) * input.paintCoats : 0
  const paintLitres = input.paintCoverageM2PerL > 0 ? paintM2 / input.paintCoverageM2PerL : 0
  const paintTins = ceilDiv(paintLitres, input.paintTinL)
  const covingM = input.coving ? mmToM(g.externalLengthMm + g.partitionLengthMm) * g.storeys : 0
  const notes = [
    'Openings deducted from wall area. Ceiling uses footprint × storeys.',
    input.artex ? 'Artex flagged — treat as a specialist covering, not a skim substitute.' : 'Take-off aid only.',
  ]
  return {
    wallM2,
    ceilingM2,
    pbSheets,
    skimM2,
    compoundBags,
    paintM2,
    paintLitres,
    paintTins,
    covingM,
    notes,
  }
}

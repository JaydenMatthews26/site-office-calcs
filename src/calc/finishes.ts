import type { DerivedGeometry } from '../geometry/derive'
import type { FinishesInputs, PartitionInputs, SkimFinish } from '../types/modules'
import { INSULATION_LABEL } from './partitions'
import { ceilDiv, mmToM, withWaste } from './units'

/** m² per 25 kg bag. Multi-finish is a ~2 mm Thistle-style coat; generic skim is a thinner allowance. */
export function skimBagCoverageM2(finish: SkimFinish): number {
  return finish === 'multi-finish' ? 10 : 20
}

export const SKIM_LABEL: Record<SkimFinish, string> = {
  skim: 'Skim',
  'multi-finish': 'Multi-finish',
}

export interface FinishesResult {
  wallM2: number
  ceilingM2: number
  pbSheets: number
  skimM2: number
  skimFinish: SkimFinish
  skimLabel: string
  compoundBags: number
  compoundM2PerBag: number
  paintM2: number
  paintLitres: number
  paintTins: number
  covingM: number
  insulation: PartitionInputs['insulation']
  insulationLabel: string
  insulationThicknessMm: number
  insulationM3: number
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
 * Skim = same area. Generic skim ≈ 1 bag (25 kg) per 20 m².
 * Multi-finish ≈ 1 bag per 10 m² (about 2 mm).
 * Paint tins from remaining painting section can duplicate; here optional coats on walls+ceiling.
 * Partition insulation is repeated here so the finishes sheet matches Internal walls.
 */
export function calcFinishes(
  g: DerivedGeometry,
  input: FinishesInputs,
  partitions?: Pick<PartitionInputs, 'insulation' | 'insulationThicknessMm'>,
): FinishesResult {
  const h = mmToM(g.storeyHeightMm)
  const partitionM2 = mmToM(g.partitionLengthMm) * h * 2 * g.storeys
  const innerExternalM2 = mmToM(g.externalLengthMm) * h * g.storeys
  const wallM2 = Math.max(0, partitionM2 + innerExternalM2 - g.openingAreaM2)
  const ceilingM2 = g.footprintM2 * g.storeys
  const boardM2 = (input.plasterboard ? wallM2 + ceilingM2 : 0)
  const pbSheets = input.plasterboard ? ceilDiv(withWaste(boardM2, input.wastePct), input.pbSheetM2) : 0
  const skimFinish = input.skimFinish ?? 'skim'
  const skimLabel = SKIM_LABEL[skimFinish]
  const compoundM2PerBag = skimBagCoverageM2(skimFinish)
  const skimM2 = input.skim ? wallM2 + ceilingM2 : 0
  const compoundBags = ceilDiv(skimM2, compoundM2PerBag)
  const paintM2 = input.paint ? (wallM2 + ceilingM2) * input.paintCoats : 0
  const paintLitres = input.paintCoverageM2PerL > 0 ? paintM2 / input.paintCoverageM2PerL : 0
  const paintTins = ceilDiv(paintLitres, input.paintTinL)
  const covingM = input.coving ? mmToM(g.externalLengthMm + g.partitionLengthMm) * g.storeys : 0
  const insulation = partitions?.insulation ?? 'none'
  const insulationThicknessMm = partitions?.insulationThicknessMm ?? 0
  const insulationLabel = INSULATION_LABEL[insulation]
  const partitionAreaM2 = mmToM(g.partitionLengthMm) * h
  const insulationM3 =
    insulation === 'none' ? 0 : partitionAreaM2 * mmToM(Math.max(0, insulationThicknessMm))
  const notes = [
    'Openings deducted from wall area. Ceiling uses footprint × storeys.',
    input.skim
      ? `${skimLabel}: about ${compoundM2PerBag} m² per 25 kg bag${skimFinish === 'multi-finish' ? ' (multi-finish, ~2 mm)' : ' (generic skim)'}.`
      : 'Skim is off.',
    insulation === 'none'
      ? 'No internal-wall insulation selected (set it here or on Internal walls).'
      : `${insulationLabel} ${insulationThicknessMm} mm on internal walls — ${insulationM3.toFixed(2)} m³.`,
    input.artex ? 'Artex flagged — treat as a specialist covering, not a skim substitute.' : 'Take-off aid only.',
  ]
  return {
    wallM2,
    ceilingM2,
    pbSheets,
    skimM2,
    skimFinish,
    skimLabel,
    compoundBags,
    compoundM2PerBag,
    paintM2,
    paintLitres,
    paintTins,
    covingM,
    insulation,
    insulationLabel,
    insulationThicknessMm,
    insulationM3,
    notes,
  }
}

import type { DerivedGeometry } from '../geometry/derive'
import type { SkirtingInputs } from '../types/modules'
import { ceilDiv, mmToM, withWaste } from './units'

export const SKIRTING_PROFILES: {
  id: SkirtingInputs['profile']
  label: string
  typicalDepthMm: number
  path: string
}[] = [
  { id: 'chamfer', label: 'Chamfered', typicalDepthMm: 119, path: 'M2 22 L8 6 32 6 38 22' },
  { id: 'ovolo', label: 'Ovolo', typicalDepthMm: 119, path: 'M2 22 L8 8 Q20 2 32 8 L38 22' },
  { id: 'torus', label: 'Torus', typicalDepthMm: 144, path: 'M2 22 L6 10 Q20 0 34 10 L38 22' },
  { id: 'ogee', label: 'Ogee', typicalDepthMm: 169, path: 'M2 22 L10 4 Q20 12 30 4 L38 22' },
  { id: 'pencil-round', label: 'Pencil round', typicalDepthMm: 94, path: 'M2 22 L6 8 Q20 4 34 8 L38 22' },
]

export interface SkirtingResult {
  skirtingM: number
  architraveM: number
  skirtingLengths: number
  architraveLengths: number
  profile: SkirtingInputs['profile']
  material: SkirtingInputs['material']
  notes: string[]
}

/**
 * Skirting: internal wall perimeter (external inner face + both sides of partitions)
 * minus door widths (openings in walls).
 * Architrave: 2 × (2 × height + width) per door, typically one profile size down.
 * Sold in 4.2 m lengths (MDF) / 4.8 m (timber) with waste%.
 */
export function calcSkirting(
  g: DerivedGeometry,
  input: SkirtingInputs,
  doorCount: number,
  doorWidthMm: number,
  doorHeightMm: number,
): SkirtingResult {
  const wallPerimeterM = mmToM(g.externalLengthMm + 2 * g.partitionLengthMm) * g.storeys
  const doorDeductM = doorCount * mmToM(doorWidthMm)
  const skirtingM = Math.max(0, wallPerimeterM - doorDeductM)
  const architraveM = doorCount * mmToM(2 * (2 * doorHeightMm + doorWidthMm))
  const sold = input.material === 'mdf' ? 4.2 : 4.8
  const skirtingLengths = ceilDiv(withWaste(skirtingM, input.wastePct), sold)
  const architraveLengths = ceilDiv(withWaste(architraveM, input.wastePct), sold)
  return {
    skirtingM,
    architraveM,
    skirtingLengths,
    architraveLengths,
    profile: input.profile,
    material: input.material,
    notes: [
      `Architrave uses the same ${input.profile} family, ${input.architraveDepthMm} mm (one size down from ${input.depthMm} mm skirting).`,
      `${sold} m lengths as sold, +${input.wastePct}% waste.`,
    ],
  }
}

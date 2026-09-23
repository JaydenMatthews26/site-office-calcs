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
  { id: 'bullnose', label: 'Bullnose', typicalDepthMm: 120, path: 'M2 22 L8 12 Q20 2 32 12 L38 22' },
  { id: 'arch-bullnose', label: 'Arch / bullnose', typicalDepthMm: 75, path: 'M2 22 L6 16 Q16 6 22 10 Q30 2 34 12 L38 22' },
]

export function profileById(id: SkirtingInputs['profile']) {
  return SKIRTING_PROFILES.find((p) => p.id === id) ?? SKIRTING_PROFILES[0]
}

/** True when the typed depth is not the catalogue depth for that shape. */
export function isCustomDepth(profile: SkirtingInputs['profile'], depthMm: number): boolean {
  return depthMm !== profileById(profile).typicalDepthMm
}

/**
 * Card label for a profile. The selected card shows the depth in use, not the catalogue size.
 * Custom is set only while the override differs from that shape's default.
 */
export function profileDepthLabel(
  profile: SkirtingInputs['profile'],
  depthMm: number,
  selected: boolean,
): { mm: number; custom: boolean; text: string } {
  const typical = profileById(profile).typicalDepthMm
  const mm = selected ? depthMm : typical
  const custom = selected && depthMm !== typical
  const text = custom ? `${mm} mm · custom depth` : `${mm} mm`
  return { mm, custom, text }
}

export interface SkirtingResult {
  skirtingM: number
  architraveM: number
  skirtingLengths: number
  architraveLengths: number
  profile: SkirtingInputs['profile']
  architraveProfile: SkirtingInputs['architraveProfile']
  depthMm: number
  architraveDepthMm: number
  skirtingDepthCustom: boolean
  architraveDepthCustom: boolean
  skirtingLabel: string
  architraveLabel: string
  material: SkirtingInputs['material']
  notes: string[]
}

/**
 * Skirting: internal wall perimeter (external inner face + both sides of partitions)
 * minus door widths (openings in walls).
 * Architrave: 2 × (2 × height + width) per door. Shape and depth are chosen separately from skirting.
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
  const architraveProfile = input.architraveProfile ?? input.profile
  const skirtDepth = profileDepthLabel(input.profile, input.depthMm, true)
  const archDepth = profileDepthLabel(architraveProfile, input.architraveDepthMm, true)
  const skirtingLabel = `${profileById(input.profile).label} ${skirtDepth.text}`
  const architraveLabel = `${profileById(architraveProfile).label} ${archDepth.text}`
  return {
    skirtingM,
    architraveM,
    skirtingLengths,
    architraveLengths,
    profile: input.profile,
    architraveProfile,
    depthMm: input.depthMm,
    architraveDepthMm: input.architraveDepthMm,
    skirtingDepthCustom: skirtDepth.custom,
    architraveDepthCustom: archDepth.custom,
    skirtingLabel,
    architraveLabel,
    material: input.material,
    notes: [
      `Skirting shape ${profileById(input.profile).label}, ${skirtDepth.text}.`,
      `Architrave shape ${profileById(architraveProfile).label}, ${archDepth.text}.`,
      `${sold} m lengths as sold, +${input.wastePct}% waste.`,
    ],
  }
}

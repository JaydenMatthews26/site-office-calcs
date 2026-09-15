import type { DerivedGeometry } from '../geometry/derive'
import type { ExternalsInputs } from '../types/modules'
import { ceilDiv, mmToM } from './units'

export interface ExternalsResult {
  driveM2: number
  pathM2: number
  hardcoreT: number
  hardcoreBags: number
  pavingUnits: number
  fenceBays: number
  posts: number
  panels: number
  soakawayM3: number
  pipeM: number
  pipeFittings: number
  notes: string[]
}

/**
 * Externals.
 *
 * Drive / paths: area as typed (0 until the user sets it). Hardcore tonnes ≈ area × depth × 2.0 t/m³.
 *   25 kg bags = tonnes × 40. Brick paving ~40 bricks/m²; resin is a kit (area only).
 * Fencing: bays = ceil(length / 1.83 m); posts = bays + 1; panels = bays. 6 ft (1830 mm) default.
 * Drainage: soakaway volume from roof plan area × 0.02 m rainfall + 0.01 m soil infiltration
 *   (indicative). 110 mm pipe = typed external run. Tie-in / regs are flags.
 */
export function calcExternals(g: DerivedGeometry, input: ExternalsInputs): ExternalsResult {
  const driveM2 = input.driveAreaM2
  const pathM2 = input.pathAreaM2
  const paved = driveM2 + pathM2
  const hardcoreM3 = paved * mmToM(input.hardcoreMm)
  const hardcoreT = hardcoreM3 * 2
  const hardcoreBags = ceilDiv(hardcoreT * 1000, 25)
  const pavingUnits =
    input.driveFinish === 'brick-paving' ? Math.ceil(paved * 40) : input.driveFinish === 'resin' ? 0 : 0
  const bayM = mmToM(input.bayMm) || 1.83
  const fenceBays = ceilDiv(input.fenceLengthM, bayM)
  const posts = fenceBays > 0 ? fenceBays + 1 : 0
  const panels = fenceBays
  const roofM2 = g.footprintM2 / Math.max(0.5, Math.cos((35 * Math.PI) / 180))
  const soakawayM3 = input.soakaway ? roofM2 * 0.02 + g.footprintM2 * 0.01 : 0
  const pipeM = input.drainRunM
  const pipeFittings = pipeM > 0 ? Math.ceil(pipeM / 3) + (input.tieIn ? 2 : 0) : 0
  const notes = [
    input.soakawayRegs ? 'Soakaway sizing is indicative — check Building Regulations H2 / BRE 365.' : 'Soakaway regs toggle off — still confirm with building control.',
    `${input.fenceType} fence, ${input.postFix} posts${input.fencePaint ? ', paint/stain included as a flag' : ''}.`,
    'Drive area is typed (not on the building plan).',
  ]
  if (input.driveFinish === 'resin') notes.push('Resin kit: order by area + primer; no unit count in this take-off.')
  return {
    driveM2,
    pathM2,
    hardcoreT,
    hardcoreBags,
    pavingUnits,
    fenceBays,
    posts,
    panels,
    soakawayM3,
    pipeM,
    pipeFittings,
    notes,
  }
}

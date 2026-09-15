import type { DerivedGeometry } from '../geometry/derive'
import type { FoundationsInputs } from '../types/modules'
import { mmToM } from './units'

/** UK NHBC-ish strip width for a typical two-storey cavity wall. */
export const DEFAULT_STRIP_WIDTH_MM = 600

export const SUBSTRATE_DEPTH_MM: Record<FoundationsInputs['substrate'], number> = {
  clay: 1000,
  sand: 750,
  rock: 450,
}

export interface FoundationsResult {
  runMm: number
  widthMm: number
  depthMm: number
  concreteM3: number
  excavationM3: number
  spoilM3: number
  dpcLinearM: number
  dpcHeightMm: number
  seFlag: boolean
  notes: string[]
}

/**
 * Foundations up to DPC.
 *
 * Strip: trench follows external wall runs (A–D+ = plan external length).
 *   width default 600 mm (UK cavity two-storey guidance — confirm with SE / NHBC).
 *   depth from substrate: clay 1000 mm, sand 750 mm, rock 450 mm (user-editable).
 *   concrete volume = width × depth × length.
 *   excavation = (width + 2 × working space) × depth × length.
 *   spoil ≈ excavation (bulking ignored unless underpinning, then × 1.25).
 *
 * Raft: concrete = footprint × thickness; excavation = footprint × (thickness + 150 mm stone).
 *
 * DPC: linear = external perimeter; height typically 150 mm above ground.
 * Underpinning or non-standard depth/width → SE flag.
 */
export function calcFoundations(g: DerivedGeometry, input: FoundationsInputs): FoundationsResult {
  const notes: string[] = []
  const runMm = g.externalLengthMm
  const suggestedDepth = SUBSTRATE_DEPTH_MM[input.substrate]
  const widthMm = input.type === 'strip' ? input.stripWidthMm : 0
  const depthMm = input.type === 'strip' ? input.stripDepthMm : input.raftThicknessMm + 150

  let concreteM3 = 0
  let excavationM3 = 0
  if (input.type === 'strip') {
    concreteM3 = mmToM(widthMm) * mmToM(input.stripDepthMm) * mmToM(runMm)
    const trenchW = mmToM(widthMm + 2 * input.workingSpaceMm)
    excavationM3 = trenchW * mmToM(input.stripDepthMm) * mmToM(runMm)
  } else {
    concreteM3 = g.footprintM2 * mmToM(input.raftThicknessMm)
    excavationM3 = g.footprintM2 * mmToM(input.raftThicknessMm + 150)
    notes.push('Raft assumed over the full footprint. Confirm edge thickening / toe with the SE.')
  }

  const spoilM3 = excavationM3 * (input.underpinning ? 1.25 : 1)
  const seFlag =
    input.underpinning ||
    (input.type === 'strip' && (input.stripWidthMm < 450 || input.stripDepthMm < suggestedDepth - 50))

  if (input.underpinning) notes.push('Underpinning opted in — structural engineer required.')
  if (seFlag && !input.underpinning) {
    notes.push('Non-standard strip size versus substrate guidance — flag for structural engineer.')
  }
  notes.push(`DPC ${input.dpcMaterial}, typically ${input.dpcHeightMm} mm above finished ground.`)
  notes.push('Take-off aid — not a substitute for NHBC / Building Regulations foundation design.')

  return {
    runMm,
    widthMm,
    depthMm,
    concreteM3,
    excavationM3,
    spoilM3,
    dpcLinearM: mmToM(runMm),
    dpcHeightMm: input.dpcHeightMm,
    seFlag,
    notes,
  }
}

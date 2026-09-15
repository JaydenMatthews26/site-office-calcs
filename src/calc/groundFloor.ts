import type { DerivedGeometry } from '../geometry/derive'
import type { GroundFloorInputs } from '../types/modules'
import { mmToM } from './units'

export interface GroundFloorResult {
  areaM2: number
  concreteM3: number
  insulationM3: number
  dpmM2: number
  edgeInsulationM: number
  beams: number
  joists: number
  joistLinearM: number
  notes: string[]
}

/**
 * Ground floor between foundations and DPC.
 *
 * Solid slab: concrete = footprint × thickness; insulation = footprint × Part L thickness;
 *   DPM = footprint × 1.1 laps; edge insulation = perimeter × height (slab thickness).
 * Beam & block: beams at ~530 mm centres across the span: n = floor(length / centres) + 1,
 *   plus blocks filling between (area take-off only).
 * Suspended timber: joists across span at centres along length: n = floor(length / centres) + 1;
 *   linear = n × span.
 * UFH / radon are flags (add membrane + loops by specialist).
 */
export function calcGroundFloor(g: DerivedGeometry, input: GroundFloorInputs): GroundFloorResult {
  const areaM2 = g.footprintM2
  const notes: string[] = []
  let concreteM3 = 0
  let insulationM3 = areaM2 * mmToM(input.insulationMm)
  let dpmM2 = input.dpm ? areaM2 * 1.1 : 0
  const edgeInsulationM = mmToM(g.externalLengthMm)
  let beams = 0
  let joists = 0
  let joistLinearM = 0

  if (input.type === 'slab') {
    concreteM3 = areaM2 * mmToM(input.slabThicknessMm)
  } else if (input.type === 'beam-block') {
    beams = g.spanMm > 0 ? Math.floor(g.lengthMm / input.beamCentresMm) + 1 : 0
    notes.push(`${beams} prestressed beams at ${input.beamCentresMm} mm centres across ${mmToM(g.spanMm).toFixed(2)} m span.`)
  } else {
    joists = g.spanMm > 0 ? Math.floor(g.lengthMm / input.joistCentresMm) + 1 : 0
    joistLinearM = joists * mmToM(g.spanMm)
    notes.push(
      `${joists} joists ${input.joistWidthMm} × ${input.joistDepthMm} at ${input.joistCentresMm} mm centres (indicative C16/C24 — not designed).`,
    )
  }

  if (input.ufh) notes.push('UFH opted in — add pipe loops / manifold; insulation above the DPM.')
  if (input.radonBarrier) notes.push('Radon barrier opted in — lapped and sealed at the DPC (check radon map).')
  notes.push('Part L insulation thickness is a take-off input, not a SAP/U-value check.')

  return {
    areaM2,
    concreteM3,
    insulationM3,
    dpmM2,
    edgeInsulationM,
    beams,
    joists,
    joistLinearM,
    notes,
  }
}

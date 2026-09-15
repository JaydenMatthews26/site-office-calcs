import type { DerivedGeometry } from '../geometry/derive'
import type { MepInputs } from '../types/modules'
import { ceilDiv, mmToM, withWaste } from './units'

export interface MepResult {
  rooms: number
  hotM: number
  coldM: number
  pipeM: number
  fittings: number
  radiators: number
  boilerKw: number
  sockets: number
  lights: number
  cable25M: number
  cable15M: number
  cable6M: number
  cuWays: number
  installedLowGbp: number
  installedHighGbp: number
  notes: string[]
}

/**
 * Plumbing & electrics — materials guide only, not a design.
 *
 * Plumbing: H/C pipe runs ≈ 1.2 × (external + partition) perimeter per storey, + routing waste
 *   (default 15%). Copper+solder or Hep2O. Radiators ≈ 100 W/m² × footprint × storeys;
 *   boiler kW = ceil(total W / 1000 × 1.15). Fittings ≈ 1 per 2 m of pipe.
 *
 * Electrics: rooms ≈ max(1, round(footprint / 12 m²)). Sockets/lights from per-room rates.
 *   2.5 mm² ring ≈ 1.5 × perimeter × storeys; 1.5 mm² lighting ≈ 1.2 × perimeter;
 *   6 mm² cooker/shower ≈ 15 m × storeys. CU ways ≈ sockets/6 + lights/8 + 4.
 *   Installed range £35–85 / m² GIFA.
 */
export function calcMep(g: DerivedGeometry, input: MepInputs): MepResult {
  const rooms =
    input.roomsOverride && input.roomsOverride > 0
      ? input.roomsOverride
      : Math.max(1, Math.round(g.footprintM2 / 12) * g.storeys)
  const perimeterM = mmToM(g.externalLengthMm + g.partitionLengthMm) * g.storeys
  const run = withWaste(perimeterM * 1.2, input.routingWastePct)
  const hotM = run
  const coldM = run
  const pipeM = hotM + coldM
  const fittings = ceilDiv(pipeM, 2)
  const heatW = input.wattsPerM2 * g.footprintM2 * g.storeys
  const radiators = Math.max(1, Math.round(g.footprintM2 / 12) * g.storeys)
  const boilerKw = Math.ceil((heatW / 1000) * 1.15)
  const sockets = rooms * input.socketsPerRoom
  const lights = rooms * input.lightsPerRoom
  const cable25M = withWaste(perimeterM * 1.5, 10)
  const cable15M = withWaste(perimeterM * 1.2, 10)
  const cable6M = 15 * g.storeys
  const cuWays = Math.max(8, Math.ceil(sockets / 6 + lights / 8 + 4))
  const gifA = g.footprintM2 * g.storeys
  return {
    rooms,
    hotM,
    coldM,
    pipeM,
    fittings,
    radiators,
    boilerKw,
    sockets,
    lights,
    cable25M,
    cable15M,
    cable6M,
    cuWays,
    installedLowGbp: gifA * input.installedLowGbpPerM2,
    installedHighGbp: gifA * input.installedHighGbpPerM2,
    notes: [
      'Guide only — the electrician owns BS 7671 design, and the heating engineer owns the heat-loss calc.',
      `${input.pipeSystem === 'copper' ? 'Copper + solder' : 'Hep2O'} pipe, H and C separate, +${input.routingWastePct}% routing.`,
      `Installed range £${input.installedLowGbpPerM2}–${input.installedHighGbpPerM2} / m² GIFA.`,
    ],
  }
}

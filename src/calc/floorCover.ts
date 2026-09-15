import type { DerivedGeometry } from '../geometry/derive'
import type { FloorCoverInputs } from '../types/modules'
import { ceilDiv, mmToM, withWaste } from './units'

export interface FloorCoverResult {
  floorM2: number
  wallM2: number
  tiles: number
  tilesPerM2: number
  groutBags: number
  adhesiveBags: number
  notes: string[]
}

/**
 * Floor coverings. Whole-house from footprint × storeys.
 *
 * Tiles / m² = 1 / ((L+grout)/1000 × (W+grout)/1000).
 * Tiles needed = ceil(area × (1+waste) × tiles/m²). Waste default 10% (5–20%).
 * Grout ≈ 1.5 kg/m² for 3 mm joints on 300 mm tiles (indicative 5 kg bags).
 * Adhesive ≈ 4 kg/m² (20 kg bags).
 * Wall tiling optional: net elevation inner / wet rooms — uses wallHeight × perimeter as a simple wet-wall proxy.
 */
export function calcFloorCover(g: DerivedGeometry, input: FloorCoverInputs): FloorCoverResult {
  const floorM2 = g.footprintM2 * g.storeys
  const wallM2 = input.includeWalls
    ? Math.max(0, mmToM(g.externalLengthMm + 2 * g.partitionLengthMm) * mmToM(input.wallHeightMm) - g.openingAreaM2)
    : 0
  const area = floorM2 + wallM2
  const coverM2 =
    ((input.tileLengthMm + input.groutMm) / 1000) * ((input.tileWidthMm + input.groutMm) / 1000)
  const tilesPerM2 = coverM2 > 0 ? 1 / coverM2 : 0
  const tiles = ceilDiv(withWaste(area, input.wastePct) * tilesPerM2, 1)
  const groutBags = input.kind === 'tile' ? ceilDiv(area * 1.5, 5) : 0
  const adhesiveBags = input.kind === 'tile' ? ceilDiv(area * 4, 20) : 0
  const notes = [
    input.kind === 'tile'
      ? `Tile cover includes a ${input.groutMm} mm joint. Waste ${input.wastePct}% (typical 5–20%).`
      : `${input.kind} covering — area + ${input.wastePct}% waste; pack sizes vary.`,
    'Whole-house from footprint. Split room-by-room later if you add rooms to the plan.',
  ]
  return { floorM2, wallM2, tiles, tilesPerM2, groutBags, adhesiveBags, notes }
}

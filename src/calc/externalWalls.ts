import type { DerivedGeometry } from '../geometry/derive'
import type { JoineryItem } from '../types/modules'
import type { ExternalWallInputs } from '../types/modules'
import { elevationAreas } from './structure'
import { ceilDiv, mmToM, withWaste } from './units'

export interface LintelRow {
  code: string
  openingMm: number
  lengthMm: number
  kind: 'catnic-steel' | 'concrete'
  padstones: number
}

export interface ExternalWallResult {
  cavityMm: number
  insulationM3: number
  netElevationM2: number
  innerBlocks: number
  outerUnits: number
  lintels: LintelRow[]
  cavityBarriersM: number
  fireStopsM: number
  notes: string[]
}

/**
 * External walls above DPC.
 *
 * Cavity + Part L insulation (thickness input, not a U-value). Inner lightweight block,
 * outer brick or block. Openings deducted via elevation net area.
 *
 * Lintels: length = opening + 2 × bearing (typically 150 mm each side).
 *   Brick outer → Catnic (steel); block outer → concrete lintel.
 *   Padstones: 2 per concrete lintel (block inner).
 * Cavity barriers at openings (perimeter of each opening) + fire stops at floor/eaves
 *   ≈ external perimeter × storeys.
 */
export function calcExternalWalls(
  g: DerivedGeometry,
  input: ExternalWallInputs,
  joineryItems: JoineryItem[],
): ExternalWallResult {
  const { netM2 } = elevationAreas(g)
  const innerCover = (450 * 225) / 1e6
  const outerBrickCover = (225 * 75) / 1e6
  const outerBlockCover = innerCover
  const innerBlocks = ceilDiv(withWaste(netM2, 5), innerCover)
  const outerUnits =
    input.outerSkin === 'brick'
      ? ceilDiv(withWaste(netM2, 5), outerBrickCover)
      : ceilDiv(withWaste(netM2, 5), outerBlockCover)

  const lintels: LintelRow[] = joineryItems
    .filter((it) => it.kind !== 'rooflight')
    .map((it) => {
      const lengthMm = it.widthMm + 2 * input.lintelBearingMm
      const kind = input.outerSkin === 'brick' ? 'catnic-steel' : 'concrete'
      return {
        code: it.code,
        openingMm: it.widthMm,
        lengthMm,
        kind,
        padstones: kind === 'concrete' ? 2 : 0,
      }
    })

  let cavityBarriersM = 0
  for (const it of joineryItems) {
    if (it.kind === 'rooflight') continue
    cavityBarriersM += (2 * (it.widthMm + it.heightMm)) / 1000
  }
  const fireStopsM = input.fireStops ? mmToM(g.externalLengthMm) * g.storeys : 0
  const insulationM3 = netM2 * mmToM(input.insulationMm)

  const notes = [
    'Catnic / steel lintels for brick outer; concrete lintels + padstones for block outer.',
    'Part L insulation thickness is a take-off input, not a SAP check.',
    'Take-off aid only — confirm lintel load tables and cavity barrier positions on site.',
  ]
  return {
    cavityMm: input.cavityMm,
    insulationM3,
    netElevationM2: netM2,
    innerBlocks,
    outerUnits,
    lintels,
    cavityBarriersM: input.cavityBarriers ? cavityBarriersM : 0,
    fireStopsM,
    notes,
  }
}

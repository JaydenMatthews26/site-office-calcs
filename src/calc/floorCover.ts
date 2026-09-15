import type { DerivedGeometry } from '../geometry/derive'
import type { FloorCoverInputs, FloorCoverRoom } from '../types/modules'
import { ceilDiv, mmToM, withWaste } from './units'

export interface FloorCoverRoomResult {
  id: string
  name: string
  floorM2: number
  wallGrossM2: number
  openingDeductM2: number
  wallNetM2: number
  areaM2: number
}

export interface FloorCoverResult {
  mode: FloorCoverInputs['mode']
  floorM2: number
  wallM2: number
  tiles: number
  tilesPerM2: number
  groutBags: number
  adhesiveBags: number
  rooms: FloorCoverRoomResult[]
  notes: string[]
}

/**
 * Opening area deducted from wall tiling in a room (doors + windows).
 * Floor area is left alone — coverings run to the threshold, not through the leaf.
 */
export function roomOpeningDeductM2(room: FloorCoverRoom): number {
  if (!room.deductOpenings) return 0
  const doors = (room.doorCount * room.doorWidthMm * room.doorHeightMm) / 1e6
  const windows = (room.windowCount * room.windowWidthMm * room.windowHeightMm) / 1e6
  return Math.max(0, doors + windows)
}

export function netRoomWallM2(room: FloorCoverRoom): number {
  return Math.max(0, room.wallTileM2 - roomOpeningDeductM2(room))
}

export function tilesPerSquareMetre(input: Pick<FloorCoverInputs, 'tileLengthMm' | 'tileWidthMm' | 'groutMm'>): number {
  const coverM2 =
    ((input.tileLengthMm + input.groutMm) / 1000) * ((input.tileWidthMm + input.groutMm) / 1000)
  return coverM2 > 0 ? 1 / coverM2 : 0
}

function packFromArea(area: number, input: FloorCoverInputs, tilesPerM2: number) {
  const tiles = ceilDiv(withWaste(area, input.wastePct) * tilesPerM2, 1)
  const groutBags = input.kind === 'tile' ? ceilDiv(area * 1.5, 5) : 0
  const adhesiveBags = input.kind === 'tile' ? ceilDiv(area * 4, 20) : 0
  return { tiles, groutBags, adhesiveBags }
}

/**
 * Floor coverings.
 *
 * Whole-house: footprint × storeys. Optional wall tiling uses inner perimeter × wall height
 *   minus plan/typed opening area.
 * Room-by-room: each room has a floor m² and optional wall-tile m². Doors/windows are deducted
 *   from the wall figure where opted in. Buy quantities (tiles + waste, grout, adhesive) are
 *   aggregated from the combined net area so waste is not rounded-up per room.
 *
 * Tiles / m² = 1 / ((L+grout)/1000 × (W+grout)/1000).
 * Tiles needed = ceil(area × (1+waste) × tiles/m²). Waste default 10% (5–20%).
 * Grout ≈ 1.5 kg/m² for 3 mm joints on 300 mm tiles (indicative 5 kg bags).
 * Adhesive ≈ 4 kg/m² (20 kg bags).
 */
export function calcFloorCover(g: DerivedGeometry, input: FloorCoverInputs): FloorCoverResult {
  const tilesPerM2 = tilesPerSquareMetre(input)
  const tileNote =
    input.kind === 'tile'
      ? `Tile cover includes a ${input.groutMm} mm joint. Waste ${input.wastePct}% (typical 5–20%).`
      : `${input.kind} covering — area + ${input.wastePct}% waste; pack sizes vary.`

  if (input.mode === 'room-by-room') {
    const rooms: FloorCoverRoomResult[] = input.rooms.map((room) => {
      const floorM2 = Math.max(0, room.floorM2)
      const wallGrossM2 = Math.max(0, room.wallTileM2)
      const openingDeductM2 = Math.min(wallGrossM2, roomOpeningDeductM2(room))
      const wallNetM2 = Math.max(0, wallGrossM2 - openingDeductM2)
      return {
        id: room.id,
        name: room.name || 'Room',
        floorM2,
        wallGrossM2,
        openingDeductM2,
        wallNetM2,
        areaM2: floorM2 + wallNetM2,
      }
    })
    const floorM2 = rooms.reduce((sum, room) => sum + room.floorM2, 0)
    const wallM2 = rooms.reduce((sum, room) => sum + room.wallNetM2, 0)
    const area = floorM2 + wallM2
    const packs = packFromArea(area, input, tilesPerM2)
    const notes = [
      tileNote,
      rooms.length === 0
        ? 'Room-by-room is empty — add rooms (name, floor m², optional wall tile) or switch to whole house.'
        : `${rooms.length} room(s). Openings deducted from wall tile only. Buy totals use combined net area.`,
    ]
    return { mode: 'room-by-room', floorM2, wallM2, ...packs, tilesPerM2, rooms, notes }
  }

  const floorM2 = g.footprintM2 * g.storeys
  const wallM2 = input.includeWalls
    ? Math.max(
        0,
        mmToM(g.externalLengthMm + 2 * g.partitionLengthMm) * mmToM(input.wallHeightMm) - g.openingAreaM2,
      )
    : 0
  const area = floorM2 + wallM2
  const packs = packFromArea(area, input, tilesPerM2)
  const notes = [
    tileNote,
    `Whole-house from ${g.source === 'manual' ? 'typed' : 'plan'} footprint × ${g.storeys} storey(s). Switch to room-by-room to split wet rooms and hall.`,
  ]
  return { mode: 'whole-house', floorM2, wallM2, ...packs, tilesPerM2, rooms: [], notes }
}

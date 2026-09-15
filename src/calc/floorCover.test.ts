import { describe, expect, it } from 'vitest'
import { DEFAULT_PLAN } from '../types/job'
import { DEFAULT_FLOOR_COVER, emptyFloorCoverRoom } from '../types/modules'
import { deriveGeometry } from '../geometry/derive'
import { calcFloorCover, netRoomWallM2, roomOpeningDeductM2, tilesPerSquareMetre } from './floorCover'
import type { Wall } from '../types/job'

function boxPlan(w: number, d: number) {
  const walls: Wall[] = [
    { id: 'n', kind: 'external', x1: 0, y1: 0, x2: w, y2: 0, thicknessMm: 300 },
    { id: 'e', kind: 'external', x1: w, y1: 0, x2: w, y2: d, thicknessMm: 300 },
    { id: 's', kind: 'external', x1: w, y1: d, x2: 0, y2: d, thicknessMm: 300 },
    { id: 'w', kind: 'external', x1: 0, y1: d, x2: 0, y2: 0, thicknessMm: 300 },
  ]
  return deriveGeometry({ ...DEFAULT_PLAN, walls, storeyHeightMm: 2400, storeys: 1 })
}

describe('floor coverings', () => {
  it('sizes whole-house tiles with grout and 10% waste from footprint', () => {
    const g = boxPlan(8000, 6000)
    const r = calcFloorCover(g, {
      ...DEFAULT_FLOOR_COVER,
      mode: 'whole-house',
      wastePct: 10,
      tileLengthMm: 300,
      tileWidthMm: 300,
      groutMm: 3,
    })
    const cover = 0.303 * 0.303
    expect(r.mode).toBe('whole-house')
    expect(r.tilesPerM2).toBeCloseTo(1 / cover, 6)
    expect(r.tiles).toBe(Math.ceil(48 * 1.1 * r.tilesPerM2))
    expect(r.groutBags).toBe(Math.ceil((48 * 1.5) / 5))
    expect(r.adhesiveBags).toBe(Math.ceil((48 * 4) / 20))
  })

  it('aggregates room-by-room floor and wall tile, deducting openings from walls only', () => {
    const g = boxPlan(8000, 6000)
    const hall = emptyFloorCoverRoom('Hall', 8)
    const bath = {
      ...emptyFloorCoverRoom('Bathroom', 6),
      wallTileM2: 20,
      deductOpenings: true,
      doorCount: 1,
      doorWidthMm: 826,
      doorHeightMm: 2040,
      windowCount: 1,
      windowWidthMm: 600,
      windowHeightMm: 900,
    }
    const lounge = emptyFloorCoverRoom('Lounge', 34)
    const r = calcFloorCover(g, {
      ...DEFAULT_FLOOR_COVER,
      mode: 'room-by-room',
      rooms: [hall, bath, lounge],
    })
    const doorM2 = (826 * 2040) / 1e6
    const windowM2 = (600 * 900) / 1e6
    expect(roomOpeningDeductM2(bath)).toBeCloseTo(doorM2 + windowM2, 6)
    expect(netRoomWallM2(bath)).toBeCloseTo(20 - doorM2 - windowM2, 6)
    expect(r.floorM2).toBeCloseTo(48, 6)
    expect(r.wallM2).toBeCloseTo(netRoomWallM2(bath), 6)
    const area = r.floorM2 + r.wallM2
    const tpm = tilesPerSquareMetre(DEFAULT_FLOOR_COVER)
    expect(r.tiles).toBe(Math.ceil(area * 1.1 * tpm))
    expect(r.rooms).toHaveLength(3)
    expect(r.rooms.find((row) => row.name === 'Lounge')?.wallNetM2).toBe(0)
  })

  it('does not fall back to footprint when room-by-room is empty', () => {
    const g = boxPlan(8000, 6000)
    const r = calcFloorCover(g, { ...DEFAULT_FLOOR_COVER, mode: 'room-by-room', rooms: [] })
    expect(r.floorM2).toBe(0)
    expect(r.tiles).toBe(0)
    expect(r.notes.join(' ')).toMatch(/empty/i)
  })

  it('leaves floor area intact when openings are deducted', () => {
    const room = {
      ...emptyFloorCoverRoom('Kitchen', 12),
      wallTileM2: 0,
      deductOpenings: true,
      doorCount: 2,
    }
    expect(roomOpeningDeductM2(room)).toBeGreaterThan(0)
    expect(netRoomWallM2(room)).toBe(0)
  })
})

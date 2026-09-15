import { describe, expect, it } from 'vitest'
import { DEFAULT_MANUAL, DEFAULT_PLAN } from '../types/job'
import { deriveGeometry } from '../geometry/derive'
import { geometryFromManual } from '../geometry/effective'
import { calcJoinery, seedJoineryFromCounts, syncJoineryFromGeometry } from './joinery'
import { DEFAULT_JOINERY } from '../types/modules'
import type { Wall } from '../types/job'

function boxPlan(w: number, d: number) {
  const walls: Wall[] = [
    { id: 'n', kind: 'external', x1: 0, y1: 0, x2: w, y2: 0, thicknessMm: 300 },
    { id: 'e', kind: 'external', x1: w, y1: 0, x2: w, y2: d, thicknessMm: 300 },
    { id: 's', kind: 'external', x1: w, y1: d, x2: 0, y2: d, thicknessMm: 300 },
    { id: 'w', kind: 'external', x1: 0, y1: d, x2: 0, y2: 0, thicknessMm: 300 },
  ]
  const openings = [
    { id: 'd1', kind: 'door' as const, wallId: 's', offsetMm: 800, widthMm: 826, heightMm: 2040 },
    { id: 'w1', kind: 'opening' as const, wallId: 'n', offsetMm: 1000, widthMm: 1200, heightMm: 1200 },
  ]
  return { plan: { ...DEFAULT_PLAN, walls, openings }, geometry: deriveGeometry({ ...DEFAULT_PLAN, walls, openings }) }
}

describe('joinery schedule', () => {
  it('seeds WG/FD rows from drawn plan openings', () => {
    const { plan, geometry } = boxPlan(8000, 6000)
    const items = syncJoineryFromGeometry(plan, geometry)
    expect(items.map((i) => i.code).sort()).toEqual(['FD1', 'WG1'])
    expect(items.find((i) => i.code === 'WG1')?.sillWidthMm).toBe(150)
    expect(items.find((i) => i.code === 'FD1')?.widthMm).toBe(826)
  })

  it('seeds from typed measurement counts when there is no canvas', () => {
    const g = geometryFromManual({
      ...DEFAULT_MANUAL,
      doorCount: 2,
      openingCount: 3,
      doorWidthMm: 826,
      windowWidthMm: 1500,
      windowHeightMm: 1200,
    })
    const items = seedJoineryFromCounts(g, {
      doorWidthMm: 826,
      doorHeightMm: 2040,
      windowWidthMm: 1500,
      windowHeightMm: 1200,
    })
    expect(items.filter((i) => i.kind === 'window')).toHaveLength(3)
    expect(items.filter((i) => i.kind === 'door')).toHaveLength(2)
    expect(items.find((i) => i.kind === 'window')?.widthMm).toBe(1500)
    const r = calcJoinery(DEFAULT_PLAN, g, DEFAULT_JOINERY, {
      doorWidthMm: 826,
      doorHeightMm: 2040,
      windowWidthMm: 1500,
      windowHeightMm: 1200,
    })
    expect(r.gfWindows).toBe(3)
    expect(r.gfDoors).toBe(2)
  })
})

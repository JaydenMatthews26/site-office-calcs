import { describe, expect, it } from 'vitest'
import { DEFAULT_PLAN } from '../types/job'
import { deriveGeometry, polygonFromExternalWalls, shoelaceMm2 } from '../geometry/derive'
import type { Wall } from '../types/job'

function box(w: number, d: number): Wall[] {
  return [
    { id: 'n', kind: 'external', x1: 0, y1: 0, x2: w, y2: 0, thicknessMm: 300 },
    { id: 'e', kind: 'external', x1: w, y1: 0, x2: w, y2: d, thicknessMm: 300 },
    { id: 's', kind: 'external', x1: w, y1: d, x2: 0, y2: d, thicknessMm: 300 },
    { id: 'w', kind: 'external', x1: 0, y1: d, x2: 0, y2: 0, thicknessMm: 300 },
  ]
}

describe('deriveGeometry', () => {
  it('computes footprint and span for an 8 m × 6 m closed rectangle', () => {
    const plan = { ...DEFAULT_PLAN, walls: box(8000, 6000) }
    const g = deriveGeometry(plan)
    expect(g.closedOutline).toBe(true)
    expect(g.footprintM2).toBeCloseTo(48, 5)
    expect(g.ceilingM2).toBeCloseTo(48, 5)
    expect(g.spanMm).toBe(6000)
    expect(g.lengthMm).toBe(8000)
    expect(g.externalLengthMm).toBe(28000)
  })

  it('counts doors and openings', () => {
    const walls = box(8000, 6000)
    const plan = {
      ...DEFAULT_PLAN,
      walls,
      openings: [
        { id: 'd', kind: 'door' as const, wallId: 's', offsetMm: 2000, widthMm: 826, heightMm: 2040 },
        { id: 'o', kind: 'opening' as const, wallId: 'n', offsetMm: 1000, widthMm: 1200, heightMm: 1200 },
      ],
    }
    const g = deriveGeometry(plan)
    expect(g.doorCount).toBe(1)
    expect(g.openingCount).toBe(1)
  })

  it('shoelace matches width × depth for a rectangle', () => {
    const poly = polygonFromExternalWalls(box(8000, 6000))
    expect(poly).not.toBeNull()
    expect(shoelaceMm2(poly!)).toBe(48_000_000)
  })
})

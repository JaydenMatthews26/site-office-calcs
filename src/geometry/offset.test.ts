import { describe, expect, it } from 'vitest'
import { offsetPolygon, outerSkinOffsetMm, outerSkinPolylines, UK_CAVITY_MM, UK_INNER_LEAF_MM, UK_OUTER_LEAF_MM } from './offset'
import type { Wall } from '../types/job'

function box(w: number, d: number): Wall[] {
  return [
    { id: 'n', kind: 'external', x1: 0, y1: 0, x2: w, y2: 0, thicknessMm: 300 },
    { id: 'e', kind: 'external', x1: w, y1: 0, x2: w, y2: d, thicknessMm: 300 },
    { id: 's', kind: 'external', x1: w, y1: d, x2: 0, y2: d, thicknessMm: 300 },
    { id: 'w', kind: 'external', x1: 0, y1: d, x2: 0, y2: 0, thicknessMm: 300 },
  ]
}

describe('outerSkinOffsetMm', () => {
  it('is inner/2 + cavity + outer/2 for the UK default build-up', () => {
    // 50 + 100 + 51 = 201 mm from inner centreline to outer centreline
    expect(outerSkinOffsetMm(UK_INNER_LEAF_MM, UK_CAVITY_MM, UK_OUTER_LEAF_MM)).toBe(201)
  })
})

describe('offsetPolygon', () => {
  it('inflates an 8 × 6 m rectangle outward', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 8000, y: 0 },
      { x: 8000, y: 6000 },
      { x: 0, y: 6000 },
    ]
    const out = offsetPolygon(pts, 200)
    const xs = out.map((p) => p.x)
    const ys = out.map((p) => p.y)
    expect(Math.min(...xs)).toBeCloseTo(-200, 0)
    expect(Math.max(...xs)).toBeCloseTo(8200, 0)
    expect(Math.min(...ys)).toBeCloseTo(-200, 0)
    expect(Math.max(...ys)).toBeCloseTo(6200, 0)
  })
})

describe('outerSkinPolylines', () => {
  it('returns one closed loop for a rectangular outline', () => {
    const loops = outerSkinPolylines(box(8000, 6000), 201)
    expect(loops).toHaveLength(1)
    expect(loops[0]).toHaveLength(4)
  })
})

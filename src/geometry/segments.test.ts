import { describe, expect, it } from 'vitest'
import {
  firstCrossing,
  properIntersection,
  resolveNonCrossingSegment,
  segmentIntersection,
  type Seg,
} from './segments'
import type { Wall } from '../types/job'

const wall = (id: string, x1: number, y1: number, x2: number, y2: number, kind: Wall['kind'] = 'partition'): Wall => ({
  id,
  kind,
  x1,
  y1,
  x2,
  y2,
  thicknessMm: 100,
})

describe('segmentIntersection', () => {
  it('finds an X crossing at the midpoint', () => {
    const a: Seg = { x1: 0, y1: 0, x2: 1000, y2: 1000 }
    const b: Seg = { x1: 0, y1: 1000, x2: 1000, y2: 0 }
    const hit = segmentIntersection(a, b)
    expect(hit).not.toBeNull()
    expect(hit!.point.x).toBeCloseTo(500)
    expect(hit!.point.y).toBeCloseTo(500)
    expect(properIntersection(a, b)).toBe(true)
  })

  it('allows a T-junction (endpoint on a face)', () => {
    const a: Seg = { x1: 0, y1: 0, x2: 4000, y2: 0 }
    const b: Seg = { x1: 2000, y1: 0, x2: 2000, y2: 3000 }
    expect(properIntersection(a, b)).toBe(false)
    const hit = segmentIntersection(a, b)
    expect(hit).not.toBeNull()
    expect(hit!.point.x).toBeCloseTo(2000)
    expect(hit!.point.y).toBeCloseTo(0)
  })

  it('allows shared endpoints', () => {
    const a: Seg = { x1: 0, y1: 0, x2: 4000, y2: 0 }
    const b: Seg = { x1: 4000, y1: 0, x2: 4000, y2: 3000 }
    expect(properIntersection(a, b)).toBe(false)
  })

  it('detects collinear overlap as a proper intersection', () => {
    const a: Seg = { x1: 0, y1: 0, x2: 4000, y2: 0 }
    const b: Seg = { x1: 1000, y1: 0, x2: 3000, y2: 0 }
    expect(properIntersection(a, b)).toBe(true)
  })

  it('does not treat collinear end-to-end continuation as a cross', () => {
    const a: Seg = { x1: 0, y1: 0, x2: 2000, y2: 0 }
    const b: Seg = { x1: 2000, y1: 0, x2: 4000, y2: 0 }
    expect(properIntersection(a, b)).toBe(false)
  })
})

describe('resolveNonCrossingSegment', () => {
  const box: Wall[] = [
    wall('n', 0, 0, 8000, 0, 'external'),
    wall('e', 8000, 0, 8000, 6000, 'external'),
    wall('s', 8000, 6000, 0, 6000, 'external'),
    wall('w', 0, 6000, 0, 0, 'external'),
    wall('p', 2000, 0, 2000, 4000, 'partition'),
  ]

  it('clamps a crossing partition to the first wall (T-join)', () => {
    const r = resolveNonCrossingSegment({ x: 4000, y: 1000 }, { x: 0, y: 1000 }, box)
    expect(r.blocked).toBe(false)
    expect(r.clamped).toBe(true)
    expect(r.end.x).toBeCloseTo(2000)
    expect(r.end.y).toBeCloseTo(1000)
  })

  it('lets a T-junction from an external face through', () => {
    const r = resolveNonCrossingSegment({ x: 4000, y: 0 }, { x: 4000, y: 3000 }, box)
    expect(r.blocked).toBe(false)
    expect(r.clamped).toBe(false)
    expect(r.end.y).toBeCloseTo(3000)
  })

  it('blocks collinear overlap along an existing partition', () => {
    const r = resolveNonCrossingSegment({ x: 2000, y: 500 }, { x: 2000, y: 3500 }, box)
    expect(r.blocked).toBe(true)
  })

  it('ignores the wall being edited', () => {
    const r = resolveNonCrossingSegment(
      { x: 2000, y: 0 },
      { x: 2000, y: 5000 },
      box,
      new Set(['p']),
    )
    expect(r.blocked).toBe(false)
    expect(r.clamped).toBe(false)
  })
})

describe('firstCrossing', () => {
  it('returns the nearer of two walls along the ray', () => {
    const walls = [wall('a', 1000, 0, 1000, 2000), wall('b', 2000, 0, 2000, 2000)]
    const hit = firstCrossing({ x1: 0, y1: 1000, x2: 4000, y2: 1000 }, walls)
    expect(hit).not.toBeNull()
    expect(hit!.point.x).toBeCloseTo(1000)
  })
})

import { describe, expect, it } from 'vitest'
import { applyTypedLength, lengthOrigin, preparePartition, wallGrownToLength } from './planEdit'
import type { Wall } from '../types/job'

const wall = (id: string, x1: number, y1: number, x2: number, y2: number, kind: Wall['kind'] = 'external'): Wall => ({
  id,
  kind,
  x1,
  y1,
  x2,
  y2,
  thicknessMm: kind === 'partition' ? 100 : 300,
})

const box: Wall[] = [
  wall('n', 0, 0, 8000, 0),
  wall('e', 8000, 0, 8000, 6000),
  wall('s', 8000, 6000, 0, 6000),
  wall('w', 0, 6000, 0, 0),
]

describe('preparePartition', () => {
  it('snaps the start face and stays square', () => {
    const p = preparePartition({ x: 4000, y: 0 }, { x: 4100, y: 2500 }, box)
    expect(p.a).toEqual({ x: 4000, y: 0 })
    expect(p.b.x).toBeCloseTo(4000)
    expect(p.b.y).toBeCloseTo(2500)
    expect(p.blocked).toBe(false)
  })

  it('clamps rather than crossing an internal', () => {
    const walls = [...box, wall('p', 2000, 0, 2000, 4000, 'partition')]
    const p = preparePartition({ x: 4000, y: 1000 }, { x: 0, y: 1100 }, walls)
    expect(p.clamped).toBe(true)
    expect(p.b.x).toBeCloseTo(2000)
  })
})

describe('wallGrownToLength / lengthOrigin', () => {
  it('grows away from the attached end', () => {
    const p = wall('p', 4000, 0, 4000, 2000, 'partition')
    expect(lengthOrigin(p, [...box, p])).toBe('a')
    const grown = wallGrownToLength(p, 3500, 'a')
    expect(grown.y1).toBe(0)
    expect(grown.y2).toBe(3500)
  })
})

describe('applyTypedLength', () => {
  it('places a segment of the typed length along the draw direction', () => {
    const r = applyTypedLength({ x: 4000, y: 0 }, { x: 0, y: 1 }, 2400, box)
    expect(r.blocked).toBe(false)
    expect(r.lengthMm).toBeCloseTo(2400)
    expect(r.b).toEqual({ x: 4000, y: 2400 })
  })
})

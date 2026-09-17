import { describe, expect, it } from 'vitest'
import { snapPointToWalls, attachedEnd, orthoFrom } from './snap'
import type { Wall } from '../types/job'

const wall = (id: string, x1: number, y1: number, x2: number, y2: number, kind: Wall['kind'] = 'external'): Wall => ({
  id,
  kind,
  x1,
  y1,
  x2,
  y2,
  thicknessMm: 300,
})

const box: Wall[] = [
  wall('n', 0, 0, 8000, 0),
  wall('e', 8000, 0, 8000, 6000),
  wall('s', 8000, 6000, 0, 6000),
  wall('w', 0, 6000, 0, 0),
  wall('p', 4000, 0, 4000, 6000, 'partition'),
]

describe('snapPointToWalls', () => {
  it('snaps to a wall endpoint', () => {
    const hit = snapPointToWalls({ x: 30, y: 40 }, box, 180)
    expect(hit.kind).toBe('endpoint')
    expect(hit.point).toEqual({ x: 0, y: 0 })
  })

  it('snaps along a wall face', () => {
    const hit = snapPointToWalls({ x: 2500, y: 40 }, box, 180)
    expect(hit.kind).toBe('face')
    expect(hit.point.x).toBeCloseTo(2500)
    expect(hit.point.y).toBeCloseTo(0)
  })

  it('snaps to a wall intersection (partition meeting the south wall)', () => {
    const hit = snapPointToWalls({ x: 4050, y: 5950 }, box, 180)
    expect(['endpoint', 'intersection']).toContain(hit.kind)
    expect(hit.point.x).toBeCloseTo(4000)
    expect(hit.point.y).toBeCloseTo(6000)
  })

  it('prefers an endpoint over a nearby face', () => {
    const hit = snapPointToWalls({ x: 80, y: 20 }, box, 180)
    expect(hit.kind).toBe('endpoint')
    expect(hit.point).toEqual({ x: 0, y: 0 })
  })

  it('falls back to the 100 mm grid', () => {
    const hit = snapPointToWalls({ x: 3333, y: 3333 }, box, 180)
    expect(hit.kind).toBe('grid')
    expect(hit.point.x).toBe(3300)
    expect(hit.point.y).toBe(3300)
  })
})

describe('attachedEnd', () => {
  it('detects a partition T-joined at the start', () => {
    const p = wall('mid', 2000, 0, 2000, 3000, 'partition')
    expect(attachedEnd(p, [...box, p])).toBe('a')
  })
})

describe('orthoFrom', () => {
  it('locks to the dominant axis', () => {
    expect(orthoFrom({ x: 0, y: 0 }, { x: 800, y: 100 })).toEqual({ x: 800, y: 0 })
    expect(orthoFrom({ x: 0, y: 0 }, { x: 100, y: 800 })).toEqual({ x: 0, y: 800 })
  })
})

import { hypot, snapMm } from '../calc/units'
import { projectOnWall } from './derive'
import {
  JOIN_ENDPOINT_TOL_MM,
  pointDist,
  segmentIntersection,
  wallSeg,
  type Seg,
} from './segments'
import type { PointMm, Wall } from '../types/job'

export const SNAP_TOL_MM = 180
export const SNAP_TOL_TOUCH_MM = 280

export type SnapKind = 'endpoint' | 'intersection' | 'face' | 'grid'

export interface SnapHit {
  point: PointMm
  kind: SnapKind
  wallId?: string
  distMm: number
}

export function snapTolerance(touch: boolean): number {
  return touch ? SNAP_TOL_TOUCH_MM : SNAP_TOL_MM
}

function endpointsOf(wall: Wall): PointMm[] {
  return [
    { x: wall.x1, y: wall.y1 },
    { x: wall.x2, y: wall.y2 },
  ]
}

function score(hit: SnapHit): number {
  const bonus = hit.kind === 'endpoint' ? 100 : hit.kind === 'intersection' ? 50 : 0
  return hit.distMm - bonus
}

/**
 * Snap a millimetre point to wall endpoints, wall–wall intersections, and
 * along wall faces. Falls back to the 100 mm grid when nothing is in range.
 */
export function snapPointToWalls(
  pt: PointMm,
  walls: Wall[],
  tolMm: number,
  opts: { ignoreIds?: ReadonlySet<string>; ignorePoint?: PointMm } = {},
): SnapHit {
  const ignore = opts.ignoreIds ?? new Set<string>()
  const candidates: SnapHit[] = []

  for (const wall of walls) {
    if (ignore.has(wall.id)) continue
    for (const ep of endpointsOf(wall)) {
      if (opts.ignorePoint && pointDist(ep, opts.ignorePoint) <= JOIN_ENDPOINT_TOL_MM) continue
      const distMm = pointDist(pt, ep)
      if (distMm <= tolMm) {
        candidates.push({ point: ep, kind: 'endpoint', wallId: wall.id, distMm })
      }
    }
    const face = projectOnWall(wall, pt)
    if (face.distMm <= tolMm) {
      if (!(opts.ignorePoint && pointDist(face.point, opts.ignorePoint) <= JOIN_ENDPOINT_TOL_MM)) {
        candidates.push({
          point: face.point,
          kind: 'face',
          wallId: wall.id,
          distMm: face.distMm,
        })
      }
    }
  }

  for (let i = 0; i < walls.length; i++) {
    if (ignore.has(walls[i].id)) continue
    for (let j = i + 1; j < walls.length; j++) {
      if (ignore.has(walls[j].id)) continue
      const hit = segmentIntersection(wallSeg(walls[i]), wallSeg(walls[j]))
      if (!hit || hit.collinear) continue
      if (opts.ignorePoint && pointDist(hit.point, opts.ignorePoint) <= JOIN_ENDPOINT_TOL_MM) continue
      const distMm = pointDist(pt, hit.point)
      if (distMm <= tolMm) {
        candidates.push({
          point: hit.point,
          kind: 'intersection',
          wallId: walls[i].id,
          distMm,
        })
      }
    }
  }

  if (candidates.length > 0) {
    candidates.sort((a, b) => score(a) - score(b))
    return candidates[0]
  }

  const grid = { x: snapMm(pt.x), y: snapMm(pt.y) }
  return { point: grid, kind: 'grid', distMm: pointDist(pt, grid) }
}

/** True when `pt` lies on `wall` (endpoint or face) within tolerance. */
export function pointOnWall(pt: PointMm, wall: Wall, tolMm = JOIN_ENDPOINT_TOL_MM): boolean {
  return projectOnWall(wall, pt).distMm <= tolMm
}

export function attachedWallAt(
  pt: PointMm,
  walls: Wall[],
  ignoreIds: ReadonlySet<string> = new Set(),
  tolMm = SNAP_TOL_MM,
): Wall | null {
  let best: { wall: Wall; dist: number } | null = null
  for (const wall of walls) {
    if (ignoreIds.has(wall.id)) continue
    const hit = projectOnWall(wall, pt)
    if (hit.distMm <= tolMm && (!best || hit.distMm < best.dist)) {
      best = { wall, dist: hit.distMm }
    }
  }
  return best?.wall ?? null
}

/** Which end of `wall` sits on another wall (T-junction / continuation). */
export function attachedEnd(wall: Wall, walls: Wall[]): 'a' | 'b' | 'both' | 'none' {
  const a = { x: wall.x1, y: wall.y1 }
  const b = { x: wall.x2, y: wall.y2 }
  let onA = false
  let onB = false
  for (const other of walls) {
    if (other.id === wall.id) continue
    if (pointOnWall(a, other)) onA = true
    if (pointOnWall(b, other)) onB = true
  }
  if (onA && onB) return 'both'
  if (onA) return 'a'
  if (onB) return 'b'
  return 'none'
}

export function snapKindActive(kind: SnapKind): boolean {
  return kind !== 'grid'
}

/** Axis-align `b` onto the nearer horizontal or vertical from `a` (existing square-snap). */
export function orthoFrom(a: PointMm, pointer: PointMm): PointMm {
  if (Math.abs(pointer.x - a.x) >= Math.abs(pointer.y - a.y)) {
    return { x: pointer.x, y: a.y }
  }
  return { x: a.x, y: pointer.y }
}

export function unitToward(from: PointMm, to: PointMm): PointMm {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const len = hypot(dx, dy)
  if (len < 1) return { x: 0, y: 0 }
  return { x: dx / len, y: dy / len }
}

export function asSeg(a: PointMm, b: PointMm): Seg {
  return { x1: a.x, y1: a.y, x2: b.x, y2: b.y }
}

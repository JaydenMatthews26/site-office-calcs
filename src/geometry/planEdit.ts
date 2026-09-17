import type { PointMm, Wall } from '../types/job'
import { hypot } from '../calc/units'
import { polygonFromExternalWalls } from './derive'
import {
  addScaled,
  centroidOf,
  pointDist,
  resolveNonCrossingSegment,
  unit,
  wallEndpoints,
} from './segments'
import {
  attachedEnd,
  attachedWallAt,
  orthoFrom,
  pointOnWall,
  snapPointToWalls,
  snapTolerance,
  unitToward,
  type SnapHit,
} from './snap'

export const MIN_WALL_LEN_MM = 300

export interface PreparedPartition {
  a: PointMm
  b: PointMm
  lengthMm: number
  snap: SnapHit | null
  attached: Wall | null
  clamped: boolean
  blocked: boolean
  dir: PointMm
}

function perpToward(wall: Wall, from: PointMm, toward: PointMm): PointMm {
  const along = unit(wall.x2 - wall.x1, wall.y2 - wall.y1)
  const p1 = { x: -along.y, y: along.x }
  const p2 = { x: along.y, y: -along.x }
  const to = { x: toward.x - from.x, y: toward.y - from.y }
  if (p1.x * to.x + p1.y * to.y >= 0) return p1
  return p2
}

/** Unit direction off an attached wall, pointing into the building (or toward other walls). */
export function directionOffWall(start: PointMm, wall: Wall, walls: Wall[]): PointMm {
  const poly = polygonFromExternalWalls(walls)
  const inside =
    (poly && centroidOf(poly)) || centroidOf(wallEndpoints(walls)) || { x: start.x + 1, y: start.y + 1 }
  return perpToward(wall, start, inside)
}

/**
 * Snap, square-constrain, and non-crossing-clamp a partition from `start` toward `pointer`.
 */
export function preparePartition(
  start: PointMm,
  pointer: PointMm,
  walls: Wall[],
  opts: { touch?: boolean; ignoreIds?: ReadonlySet<string> } = {},
): PreparedPartition {
  const tol = snapTolerance(opts.touch === true)
  const ignore = opts.ignoreIds ?? new Set<string>()
  const ortho = orthoFrom(start, pointer)
  const snapped = snapPointToWalls(ortho, walls, tol, { ignoreIds: ignore, ignorePoint: start })
  const resolved = resolveNonCrossingSegment(start, snapped.point, walls, ignore)
  const b = resolved.end
  const lengthMm = pointDist(start, b)
  const attached = attachedWallAt(start, walls, ignore, tol)
  const dir = lengthMm >= 1 ? unitToward(start, b) : attached ? directionOffWall(start, attached, walls) : { x: 1, y: 0 }
  return {
    a: start,
    b,
    lengthMm,
    snap: snapped,
    attached,
    clamped: resolved.clamped,
    blocked: resolved.blocked,
    dir,
  }
}

export function snapStart(
  pointer: PointMm,
  walls: Wall[],
  touch: boolean,
): { point: PointMm; snap: SnapHit; attached: Wall | null } {
  const tol = snapTolerance(touch)
  const snap = snapPointToWalls(pointer, walls, tol)
  const attached = attachedWallAt(snap.point, walls, new Set(), tol)
  return { point: snap.point, snap, attached }
}

/** Grow or shrink `wall` to `lengthMm` away from the reference end. */
export function wallGrownToLength(wall: Wall, lengthMm: number, from: 'a' | 'b'): Wall {
  const origin = from === 'a' ? { x: wall.x1, y: wall.y1 } : { x: wall.x2, y: wall.y2 }
  const other = from === 'a' ? { x: wall.x2, y: wall.y2 } : { x: wall.x1, y: wall.y1 }
  let dir = unitToward(origin, other)
  if (dir.x === 0 && dir.y === 0) dir = { x: 1, y: 0 }
  const end = addScaled(origin, dir, lengthMm)
  if (from === 'a') return { ...wall, x2: end.x, y2: end.y }
  return { ...wall, x1: end.x, y1: end.y }
}

/**
 * Length is always measured away from the attached / start end.
 * Both ends attached → start (x1,y1). Neither → start.
 */
export function lengthOrigin(wall: Wall, walls: Wall[]): 'a' | 'b' {
  const att = attachedEnd(wall, walls)
  if (att === 'b') return 'b'
  return 'a'
}

export function applyTypedLength(
  origin: PointMm,
  dir: PointMm,
  lengthMm: number,
  walls: Wall[],
  ignoreIds: ReadonlySet<string> = new Set(),
): PreparedPartition {
  const n = hypot(dir.x, dir.y)
  const unitDir = n < 1e-6 ? { x: 1, y: 0 } : { x: dir.x / n, y: dir.y / n }
  const proposed = addScaled(origin, unitDir, lengthMm)
  const snapped = snapPointToWalls(proposed, walls, snapTolerance(false), {
    ignoreIds,
    ignorePoint: origin,
  })
  // Prefer the typed distance along `dir`; still snap if a join is essentially at that length.
  const useSnap =
    snapped.kind !== 'grid' && Math.abs(pointDist(origin, snapped.point) - lengthMm) <= 80
  const target = useSnap ? snapped.point : proposed
  const resolved = resolveNonCrossingSegment(origin, target, walls, ignoreIds)
  const b = resolved.end
  return {
    a: origin,
    b,
    lengthMm: pointDist(origin, b),
    snap: useSnap ? snapped : null,
    attached: attachedWallAt(origin, walls, ignoreIds),
    clamped: resolved.clamped,
    blocked: resolved.blocked || pointDist(origin, b) < MIN_WALL_LEN_MM,
    dir: unitDir,
  }
}

export function constrainEndpointMove(
  wall: Wall,
  which: 'a' | 'b',
  pointer: PointMm,
  walls: Wall[],
  touch: boolean,
): PreparedPartition {
  const fixed = which === 'a' ? { x: wall.x2, y: wall.y2 } : { x: wall.x1, y: wall.y1 }
  const ignore = new Set([wall.id])
  const prepared = preparePartition(fixed, pointer, walls, { touch, ignoreIds: ignore })
  return prepared
}

export function pointOnAnyWall(pt: PointMm, walls: Wall[], tolMm?: number): Wall | null {
  for (const wall of walls) {
    if (pointOnWall(pt, wall, tolMm)) return wall
  }
  return null
}

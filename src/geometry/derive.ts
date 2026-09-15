import type { Opening, Plan, PointMm, Wall } from '../types/job'
import { hypot, mmToM } from '../calc/units'

const JOIN_TOL_MM = 20

export interface DerivedGeometry {
  externalLengthMm: number
  partitionLengthMm: number
  netExternalLengthMm: number
  footprintM2: number
  ceilingM2: number
  boundingWidthMm: number
  boundingDepthMm: number
  /** Shorter plan dimension — default rafter span (wall plate to wall plate). */
  spanMm: number
  /** Longer plan dimension — default ridge direction. */
  lengthMm: number
  eavesPerimeterMm: number
  doorCount: number
  openingCount: number
  closedOutline: boolean
  polygon: PointMm[] | null
  storeyHeightMm: number
  wallCount: number
}

export function wallLengthMm(wall: Wall): number {
  return hypot(wall.x2 - wall.x1, wall.y2 - wall.y1)
}

function near(ax: number, ay: number, bx: number, by: number, tol = JOIN_TOL_MM): boolean {
  return hypot(ax - bx, ay - by) <= tol
}

/**
 * Walk external walls into a closed loop. Endpoints within JOIN_TOL_MM are treated as joined.
 * Returns ordered vertices (without repeating the first point) or null if the outline is open.
 */
export function polygonFromExternalWalls(walls: Wall[]): PointMm[] | null {
  const ext = walls.filter((w) => w.kind === 'external')
  if (ext.length < 3) return null

  const unused = new Set(ext.map((_, i) => i))
  const first = ext[0]
  const pts: PointMm[] = [
    { x: first.x1, y: first.y1 },
    { x: first.x2, y: first.y2 },
  ]
  unused.delete(0)

  let guard = ext.length + 2
  while (unused.size > 0 && guard-- > 0) {
    const tail = pts[pts.length - 1]
    let found = false
    for (const i of unused) {
      const w = ext[i]
      if (near(w.x1, w.y1, tail.x, tail.y)) {
        pts.push({ x: w.x2, y: w.y2 })
        unused.delete(i)
        found = true
        break
      }
      if (near(w.x2, w.y2, tail.x, tail.y)) {
        pts.push({ x: w.x1, y: w.y1 })
        unused.delete(i)
        found = true
        break
      }
    }
    if (!found) break
  }

  if (unused.size > 0) return null
  const start = pts[0]
  const end = pts[pts.length - 1]
  if (!near(start.x, start.y, end.x, end.y)) return null
  pts.pop()
  return pts.length >= 3 ? pts : null
}

/** Shoelace formula. Result in mm² (divide by 1e6 for m²). */
export function shoelaceMm2(pts: PointMm[]): number {
  let acc = 0
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length
    acc += pts[i].x * pts[j].y - pts[j].x * pts[i].y
  }
  return Math.abs(acc) / 2
}

export function boundingBox(walls: Wall[]): {
  minX: number
  minY: number
  maxX: number
  maxY: number
  widthMm: number
  depthMm: number
} | null {
  if (walls.length === 0) return null
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const w of walls) {
    minX = Math.min(minX, w.x1, w.x2)
    minY = Math.min(minY, w.y1, w.y2)
    maxX = Math.max(maxX, w.x1, w.x2)
    maxY = Math.max(maxY, w.y1, w.y2)
  }
  return {
    minX,
    minY,
    maxX,
    maxY,
    widthMm: maxX - minX,
    depthMm: maxY - minY,
  }
}

export function openingsOnWall(wall: Wall, openings: Opening[]): Opening[] {
  return openings.filter((o) => o.wallId === wall.id)
}

/**
 * Project a point onto a wall segment. t is 0..1 along the wall.
 */
export function projectOnWall(
  wall: Wall,
  pt: PointMm,
): { t: number; distMm: number; point: PointMm } {
  const dx = wall.x2 - wall.x1
  const dy = wall.y2 - wall.y1
  const len2 = dx * dx + dy * dy
  if (len2 === 0) {
    return { t: 0, distMm: hypot(pt.x - wall.x1, pt.y - wall.y1), point: { x: wall.x1, y: wall.y1 } }
  }
  const t = Math.max(0, Math.min(1, ((pt.x - wall.x1) * dx + (pt.y - wall.y1) * dy) / len2))
  const point = { x: wall.x1 + t * dx, y: wall.y1 + t * dy }
  return { t, distMm: hypot(pt.x - point.x, pt.y - point.y), point }
}

export function nearestWall(
  pt: PointMm,
  walls: Wall[],
  maxDistMm = 500,
): { wall: Wall; t: number; distMm: number; point: PointMm } | null {
  let best: { wall: Wall; t: number; distMm: number; point: PointMm } | null = null
  for (const wall of walls) {
    const hit = projectOnWall(wall, pt)
    if (hit.distMm <= maxDistMm && (!best || hit.distMm < best.distMm)) {
      best = { wall, ...hit }
    }
  }
  return best
}

export function deriveGeometry(plan: Plan): DerivedGeometry {
  const { walls, openings, storeyHeightMm } = plan
  let externalLengthMm = 0
  let partitionLengthMm = 0
  for (const w of walls) {
    const len = wallLengthMm(w)
    if (w.kind === 'external') externalLengthMm += len
    else partitionLengthMm += len
  }

  const openingWidthByWall = new Map<string, number>()
  for (const o of openings) {
    openingWidthByWall.set(o.wallId, (openingWidthByWall.get(o.wallId) ?? 0) + o.widthMm)
  }
  let netExternalLengthMm = 0
  for (const w of walls) {
    if (w.kind !== 'external') continue
    netExternalLengthMm += Math.max(0, wallLengthMm(w) - (openingWidthByWall.get(w.id) ?? 0))
  }

  const polygon = polygonFromExternalWalls(walls)
  const bbox = boundingBox(walls.filter((w) => w.kind === 'external'))
  const widthMm = bbox?.widthMm ?? 0
  const depthMm = bbox?.depthMm ?? 0
  const closedOutline = polygon !== null
  const footprintMm2 = polygon
    ? shoelaceMm2(polygon)
    : widthMm * depthMm
  const footprintM2 = footprintMm2 / 1e6

  // Ceiling area for a single storey equals the footprint (openings are in walls, not the ceiling).
  const ceilingM2 = footprintM2

  const spanMm = Math.min(widthMm, depthMm) || 0
  const lengthMm = Math.max(widthMm, depthMm) || 0

  return {
    externalLengthMm,
    partitionLengthMm,
    netExternalLengthMm,
    footprintM2,
    ceilingM2,
    boundingWidthMm: widthMm,
    boundingDepthMm: depthMm,
    spanMm,
    lengthMm,
    eavesPerimeterMm: externalLengthMm,
    doorCount: openings.filter((o) => o.kind === 'door').length,
    openingCount: openings.filter((o) => o.kind === 'opening').length,
    closedOutline,
    polygon,
    storeyHeightMm,
    wallCount: walls.length,
  }
}

export function geometrySummary(g: DerivedGeometry): string {
  if (g.wallCount === 0) return 'No plan yet — draw external walls to drive roofing take-off.'
  const close = g.closedOutline ? 'closed outline' : 'open outline (bbox area)'
  return `${formatCompactM(g.spanMm)} span × ${formatCompactM(g.lengthMm)} · ${g.footprintM2.toFixed(1)} m² · ${close}`
}

function formatCompactM(mm: number): string {
  return `${mmToM(mm).toFixed(2)} m`
}

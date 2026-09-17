import { hypot } from '../calc/units'
import { polygonFromExternalWalls } from './derive'
import { centroidOf, wallEndpoints, type Seg } from './segments'
import type { PointMm, Wall } from '../types/job'
import { UK_CAVITY_MM, UK_INNER_LEAF_MM, UK_OUTER_LEAF_MM } from '../types/job'

export { UK_CAVITY_MM, UK_INNER_LEAF_MM, UK_OUTER_LEAF_MM }

export function outerSkinOffsetMm(innerLeafMm: number, cavityMm: number, outerLeafMm: number): number {
  return innerLeafMm / 2 + cavityMm + outerLeafMm / 2
}

function lineIntersection(a1: PointMm, a2: PointMm, b1: PointMm, b2: PointMm): PointMm | null {
  const dxa = a2.x - a1.x
  const dya = a2.y - a1.y
  const dxb = b2.x - b1.x
  const dyb = b2.y - b1.y
  const den = dxa * dyb - dya * dxb
  if (Math.abs(den) < 1e-6) return null
  const ua = ((b1.x - a1.x) * dyb - (b1.y - a1.y) * dxb) / den
  return { x: a1.x + ua * dxa, y: a1.y + ua * dya }
}

function unitOutward(a: PointMm, b: PointMm, centroid: PointMm): PointMm {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = hypot(dx, dy) || 1
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
  const toMid = { x: mid.x - centroid.x, y: mid.y - centroid.y }
  // Two perpendiculars; pick the one pointing away from the centroid (outside).
  const n1 = { x: -dy / len, y: dx / len }
  const n2 = { x: dy / len, y: -dx / len }
  if (n1.x * toMid.x + n1.y * toMid.y >= 0) return n1
  return n2
}

function offsetEdge(a: PointMm, b: PointMm, centroid: PointMm, distMm: number): Seg {
  const n = unitOutward(a, b, centroid)
  return {
    x1: a.x + n.x * distMm,
    y1: a.y + n.y * distMm,
    x2: b.x + n.x * distMm,
    y2: b.y + n.y * distMm,
  }
}

/** Inflate a closed polygon outward by `distMm` (mitered corners). */
export function offsetPolygon(pts: PointMm[], distMm: number): PointMm[] {
  if (pts.length < 3 || distMm === 0) return pts.map((p) => ({ ...p }))
  const centroid = centroidOf(pts)
  if (!centroid) return pts.map((p) => ({ ...p }))
  const n = pts.length
  const out: PointMm[] = []
  for (let i = 0; i < n; i++) {
    const prev = pts[(i + n - 1) % n]
    const cur = pts[i]
    const next = pts[(i + 1) % n]
    const e1 = offsetEdge(prev, cur, centroid, distMm)
    const e2 = offsetEdge(cur, next, centroid, distMm)
    const hit = lineIntersection(
      { x: e1.x1, y: e1.y1 },
      { x: e1.x2, y: e1.y2 },
      { x: e2.x1, y: e2.y1 },
      { x: e2.x2, y: e2.y2 },
    )
    out.push(hit ?? { x: e2.x1, y: e2.y1 })
  }
  return out
}

/**
 * Outer-skin polylines that shadow the external (inner/loadbearing) walls.
 * Closed outlines become one loop; open outlines offset each external run.
 */
export function outerSkinPolylines(walls: Wall[], distMm: number): PointMm[][] {
  const ext = walls.filter((w) => w.kind === 'external')
  if (ext.length === 0 || distMm === 0) return []
  const poly = polygonFromExternalWalls(walls)
  if (poly) return [offsetPolygon(poly, distMm)]

  const centroid = centroidOf(wallEndpoints(ext)) ?? { x: 0, y: 0 }
  return ext.map((w) => {
    const e = offsetEdge({ x: w.x1, y: w.y1 }, { x: w.x2, y: w.y2 }, centroid, distMm)
    return [
      { x: e.x1, y: e.y1 },
      { x: e.x2, y: e.y2 },
    ]
  })
}

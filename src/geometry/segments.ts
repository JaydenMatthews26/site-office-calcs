import { hypot } from '../calc/units'
import type { PointMm, Wall } from '../types/job'

/** Treat endpoints within this distance as the same join (T-junctions allowed). */
export const JOIN_ENDPOINT_TOL_MM = 25

export interface Seg {
  x1: number
  y1: number
  x2: number
  y2: number
}

export interface SegHit {
  point: PointMm
  /** 0..1 along segment a. */
  ua: number
  /** 0..1 along segment b. */
  ub: number
  collinear: boolean
}

export function wallSeg(wall: Wall): Seg {
  return { x1: wall.x1, y1: wall.y1, x2: wall.x2, y2: wall.y2 }
}

export function segLen(s: Seg): number {
  return hypot(s.x2 - s.x1, s.y2 - s.y1)
}

export function pointDist(a: PointMm, b: PointMm): number {
  return hypot(a.x - b.x, a.y - b.y)
}

export function pointsEqual(a: PointMm, b: PointMm, tol = JOIN_ENDPOINT_TOL_MM): boolean {
  return pointDist(a, b) <= tol
}

function paramIsEndpoint(t: number, len: number, tol = JOIN_ENDPOINT_TOL_MM): boolean {
  const d = t * len
  return d <= tol || len - d <= tol
}

/**
 * Closed-interval segment intersection. Collinear overlaps return the
 * overlap start along `a` (ua in 0..1) with collinear: true.
 */
export function segmentIntersection(a: Seg, b: Seg): SegHit | null {
  const dxa = a.x2 - a.x1
  const dya = a.y2 - a.y1
  const dxb = b.x2 - b.x1
  const dyb = b.y2 - b.y1
  const den = dxa * dyb - dya * dxb
  const lenA = hypot(dxa, dya)
  const lenB = hypot(dxb, dyb)
  if (lenA < 1 || lenB < 1) return null

  if (Math.abs(den) < 1e-6) {
    return collinearOverlapHit(a, b, dxa, dya, lenA)
  }

  const ua = ((b.x1 - a.x1) * dyb - (b.y1 - a.y1) * dxb) / den
  const ub = ((b.x1 - a.x1) * dya - (b.y1 - a.y1) * dxa) / den
  if (ua < -1e-7 || ua > 1 + 1e-7 || ub < -1e-7 || ub > 1 + 1e-7) return null
  const t = Math.max(0, Math.min(1, ua))
  return {
    point: { x: a.x1 + t * dxa, y: a.y1 + t * dya },
    ua: t,
    ub: Math.max(0, Math.min(1, ub)),
    collinear: false,
  }
}

function collinearOverlapHit(
  a: Seg,
  b: Seg,
  dxa: number,
  dya: number,
  lenA: number,
): SegHit | null {
  const cross = (b.x1 - a.x1) * dya - (b.y1 - a.y1) * dxa
  if (Math.abs(cross) / lenA > JOIN_ENDPOINT_TOL_MM) return null

  const t = (px: number, py: number) => ((px - a.x1) * dxa + (py - a.y1) * dya) / (lenA * lenA)
  const t1 = t(b.x1, b.y1)
  const t2 = t(b.x2, b.y2)
  const lo = Math.max(0, Math.min(t1, t2))
  const hi = Math.min(1, Math.max(t1, t2))
  if (hi - lo <= 1e-7) return null
  const ua = lo
  return {
    point: { x: a.x1 + ua * dxa, y: a.y1 + ua * dya },
    ua,
    ub: 0,
    collinear: true,
  }
}

/** True when interiors cross (an X). T-junctions and shared endpoints are allowed. */
export function properIntersection(a: Seg, b: Seg, tol = JOIN_ENDPOINT_TOL_MM): boolean {
  const hit = segmentIntersection(a, b)
  if (!hit) return false
  const lenA = segLen(a)
  const lenB = segLen(b)
  if (hit.collinear) {
    const overlap = collinearInteriorOverlapMm(a, b)
    return overlap > tol
  }
  return !paramIsEndpoint(hit.ua, lenA, tol) && !paramIsEndpoint(hit.ub, lenB, tol)
}

function distToLine(seg: Seg, px: number, py: number, len: number): number {
  return Math.abs((px - seg.x1) * (seg.y2 - seg.y1) - (py - seg.y1) * (seg.x2 - seg.x1)) / len
}

function collinearInteriorOverlapMm(a: Seg, b: Seg): number {
  const dxa = a.x2 - a.x1
  const dya = a.y2 - a.y1
  const lenA = hypot(dxa, dya)
  if (lenA < 1) return 0
  if (distToLine(a, b.x1, b.y1, lenA) > JOIN_ENDPOINT_TOL_MM) return 0
  if (distToLine(a, b.x2, b.y2, lenA) > JOIN_ENDPOINT_TOL_MM) return 0
  const t = (px: number, py: number) => ((px - a.x1) * dxa + (py - a.y1) * dya) / (lenA * lenA)
  const t1 = t(b.x1, b.y1)
  const t2 = t(b.x2, b.y2)
  const lo = Math.max(0, Math.min(t1, t2))
  const hi = Math.min(1, Math.max(t1, t2))
  return Math.max(0, (hi - lo) * lenA)
}

export function collinearOverlap(a: Seg, b: Seg, tol = JOIN_ENDPOINT_TOL_MM): boolean {
  return collinearInteriorOverlapMm(a, b) > tol
}

/**
 * First proper crossing of `seg` with `walls`, closest to (x1,y1).
 * T-junctions (endpoint on a wall) are ignored.
 */
export function firstCrossing(
  seg: Seg,
  walls: Wall[],
  ignoreIds: ReadonlySet<string> = new Set(),
  tol = JOIN_ENDPOINT_TOL_MM,
): SegHit | null {
  let best: SegHit | null = null
  const len = segLen(seg)
  for (const wall of walls) {
    if (ignoreIds.has(wall.id)) continue
    const hit = segmentIntersection(seg, wallSeg(wall))
    if (!hit || hit.collinear) continue
    if (!properIntersection(seg, wallSeg(wall), tol)) continue
    const dist = hit.ua * len
    if (dist <= tol) continue
    if (!best || hit.ua < best.ua) best = hit
  }
  return best
}

export function hasCollinearOverlap(
  seg: Seg,
  walls: Wall[],
  ignoreIds: ReadonlySet<string> = new Set(),
  tol = JOIN_ENDPOINT_TOL_MM,
): boolean {
  for (const wall of walls) {
    if (ignoreIds.has(wall.id)) continue
    if (collinearOverlap(seg, wallSeg(wall), tol)) return true
  }
  return false
}

export interface ResolveSegResult {
  end: PointMm
  /** Raw proposal would have crossed; end was clamped to the first wall. */
  clamped: boolean
  /** Cannot place (collinear overlap, or clamp left nothing). */
  blocked: boolean
}

/**
 * Keep T-junctions; clamp an X-crossing to the first wall along the draw
 * direction; reject collinear overlaps.
 */
export function resolveNonCrossingSegment(
  start: PointMm,
  proposedEnd: PointMm,
  walls: Wall[],
  ignoreIds: ReadonlySet<string> = new Set(),
): ResolveSegResult {
  const seg: Seg = { x1: start.x, y1: start.y, x2: proposedEnd.x, y2: proposedEnd.y }
  if (segLen(seg) < 1) {
    return { end: proposedEnd, clamped: false, blocked: false }
  }
  if (hasCollinearOverlap(seg, walls, ignoreIds)) {
    return { end: start, clamped: false, blocked: true }
  }
  const cross = firstCrossing(seg, walls, ignoreIds)
  if (cross) {
    return { end: cross.point, clamped: true, blocked: false }
  }
  return { end: proposedEnd, clamped: false, blocked: false }
}

export function centroidOf(points: PointMm[]): PointMm | null {
  if (points.length === 0) return null
  let x = 0
  let y = 0
  for (const p of points) {
    x += p.x
    y += p.y
  }
  return { x: x / points.length, y: y / points.length }
}

export function wallEndpoints(walls: Wall[]): PointMm[] {
  const pts: PointMm[] = []
  for (const w of walls) {
    pts.push({ x: w.x1, y: w.y1 }, { x: w.x2, y: w.y2 })
  }
  return pts
}

export function unit(dx: number, dy: number): PointMm {
  const len = hypot(dx, dy)
  if (len < 1e-6) return { x: 0, y: 0 }
  return { x: dx / len, y: dy / len }
}

export function addScaled(origin: PointMm, dir: PointMm, lengthMm: number): PointMm {
  return { x: origin.x + dir.x * lengthMm, y: origin.y + dir.y * lengthMm }
}

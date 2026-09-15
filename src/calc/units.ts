export const MM_PER_METRE = 1000

/** Canvas scale: 1 px = 25 mm → 40 px = 1 m at zoom 1. */
export const MM_PER_PX = 25

export function mmToM(mm: number): number {
  return mm / MM_PER_METRE
}

export function mToMm(m: number): number {
  return m * MM_PER_METRE
}

export function mmToPx(mm: number): number {
  return mm / MM_PER_PX
}

export function pxToMm(px: number): number {
  return px * MM_PER_PX
}

export function snapMm(value: number, stepMm = 100): number {
  return Math.round(value / stepMm) * stepMm
}

export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180
}

export function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI
}

export function hypot(dx: number, dy: number): number {
  return Math.sqrt(dx * dx + dy * dy)
}

export function formatMm(mm: number, digits = 0): string {
  if (!Number.isFinite(mm)) return '—'
  if (Math.abs(mm) >= 1000) {
    return `${(mm / 1000).toFixed(Math.max(digits, 2))} m`
  }
  return `${mm.toFixed(digits)} mm`
}

export function formatM(m: number, digits = 2): string {
  if (!Number.isFinite(m)) return '—'
  return `${m.toFixed(digits)} m`
}

export function formatM2(m2: number, digits = 2): string {
  if (!Number.isFinite(m2)) return '—'
  return `${m2.toFixed(digits)} m²`
}

export function formatM3(m3: number, digits = 2): string {
  if (!Number.isFinite(m3)) return '—'
  return `${m3.toFixed(digits)} m³`
}

export function ceilDiv(value: number, size: number): number {
  if (size <= 0 || value <= 0) return 0
  return Math.ceil(value / size)
}

export function withWaste(value: number, wastePct: number): number {
  return value * (1 + Math.max(0, wastePct) / 100)
}

export function formatGBP(value: number): string {
  if (!Number.isFinite(value)) return '—'
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatCount(n: number): string {
  if (!Number.isFinite(n)) return '—'
  return String(Math.round(n))
}

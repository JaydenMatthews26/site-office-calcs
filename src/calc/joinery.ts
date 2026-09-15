import type { DerivedGeometry } from '../geometry/derive'
import type { Plan } from '../types/job'
import { DOOR_HEIGHT_MM, DOOR_WIDTH_MM, OPENING_HEIGHT_MM, OPENING_WIDTH_MM } from '../types/job'
import { emptyJoineryItem, type JoineryInputs, type JoineryItem } from '../types/modules'

export interface JoineryResult {
  items: JoineryItem[]
  gfWindows: number
  gfDoors: number
  ffWindows: number
  rooflights: number
  totalAreaM2: number
}

export interface JoineryTypicalSizes {
  doorWidthMm: number
  doorHeightMm: number
  windowWidthMm: number
  windowHeightMm: number
}

export const DEFAULT_JOINERY_SIZES: JoineryTypicalSizes = {
  doorWidthMm: DOOR_WIDTH_MM,
  doorHeightMm: DOOR_HEIGHT_MM,
  windowWidthMm: OPENING_WIDTH_MM,
  windowHeightMm: OPENING_HEIGHT_MM,
}

function nextCode(items: JoineryItem[], prefix: string): string {
  const n = items.filter((i) => i.code.startsWith(prefix)).length + 1
  return `${prefix}${n}`
}

/**
 * Window / door schedule.
 *
 * Draw mode: plan openings seed GF items (doors → FD1…, window openings → WG1…).
 * Manual mode: typed door/opening counts seed the same codes at typical sizes from measurements.
 * Extra GF/FF/rooflight counts append blank rows (user fills sizes / photos).
 * Each item: width, height, opening lights, panes, glazing, sill / sub-sill, photo.
 * Total area = Σ(width × height).
 */
export function buildJoinerySchedule(plan: Plan, input: JoineryInputs): JoineryItem[] {
  const items = [...input.items]
  if (items.length === 0) {
    for (const o of plan.openings) {
      if (o.kind === 'door') {
        const it = emptyJoineryItem('door', 'gf', nextCode(items, 'FD'))
        it.widthMm = o.widthMm
        it.heightMm = o.heightMm
        items.push(it)
      } else {
        const it = emptyJoineryItem('window', 'gf', nextCode(items, 'WG'))
        it.widthMm = o.widthMm
        it.heightMm = o.heightMm
        items.push(it)
      }
    }
  }
  const count = (kind: JoineryItem['kind'], storey: JoineryItem['storey']) =>
    items.filter((i) => i.kind === kind && i.storey === storey).length

  const add = (n: number, kind: JoineryItem['kind'], storey: JoineryItem['storey'], prefix: string) => {
    const have = count(kind, storey)
    for (let i = have; i < n; i++) items.push(emptyJoineryItem(kind, storey, nextCode(items, prefix)))
  }

  add(input.extraGfWindows + count('window', 'gf'), 'window', 'gf', 'WG')
  add(input.extraGfDoors + count('door', 'gf'), 'door', 'gf', 'FD')
  add(input.extraFfWindows + count('window', 'ff'), 'window', 'ff', 'FW')
  add(input.extraRooflights + count('rooflight', 'roof'), 'rooflight', 'roof', 'RL')
  return items
}

export function seedJoineryFromCounts(
  geometry: DerivedGeometry,
  sizes: JoineryTypicalSizes = DEFAULT_JOINERY_SIZES,
): JoineryItem[] {
  const items: JoineryItem[] = []
  for (let i = 0; i < geometry.openingCount; i++) {
    const it = emptyJoineryItem('window', 'gf', nextCode(items, 'WG'))
    it.widthMm = sizes.windowWidthMm
    it.heightMm = sizes.windowHeightMm
    items.push(it)
  }
  for (let i = 0; i < geometry.doorCount; i++) {
    const it = emptyJoineryItem('door', 'gf', nextCode(items, 'FD'))
    it.widthMm = sizes.doorWidthMm
    it.heightMm = sizes.doorHeightMm
    items.push(it)
  }
  return items
}

export function syncJoineryFromGeometry(
  plan: Plan,
  geometry: DerivedGeometry,
  sizes: JoineryTypicalSizes = DEFAULT_JOINERY_SIZES,
): JoineryItem[] {
  if (geometry.source === 'plan' && plan.openings.length > 0) {
    return buildJoinerySchedule(plan, {
      items: [],
      extraGfWindows: 0,
      extraGfDoors: 0,
      extraFfWindows: 0,
      extraRooflights: 0,
    })
  }
  return seedJoineryFromCounts(geometry, sizes)
}

export function calcJoinery(
  plan: Plan,
  geometry: DerivedGeometry,
  input: JoineryInputs,
  sizes: JoineryTypicalSizes = DEFAULT_JOINERY_SIZES,
): JoineryResult {
  const items =
    input.items.length > 0 ? input.items : syncJoineryFromGeometry(plan, geometry, sizes)
  const gfWindows = items.filter((i) => i.kind === 'window' && i.storey === 'gf').length
  const gfDoors = items.filter((i) => i.kind === 'door' && i.storey === 'gf').length
  const ffWindows = items.filter((i) => i.kind === 'window' && i.storey === 'ff').length
  const rooflights = items.filter((i) => i.kind === 'rooflight').length
  const totalAreaM2 = items.reduce((acc, it) => acc + (it.widthMm * it.heightMm) / 1e6, 0)
  return { items, gfWindows, gfDoors, ffWindows, rooflights, totalAreaM2 }
}

export function syncJoineryFromPlan(plan: Plan): JoineryItem[] {
  return buildJoinerySchedule(plan, {
    items: [],
    extraGfWindows: 0,
    extraGfDoors: 0,
    extraFfWindows: 0,
    extraRooflights: 0,
  })
}

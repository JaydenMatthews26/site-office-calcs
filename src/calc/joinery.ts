import type { DerivedGeometry } from '../geometry/derive'
import type { Plan } from '../types/job'
import { emptyJoineryItem, type JoineryInputs, type JoineryItem } from '../types/modules'

export interface JoineryResult {
  items: JoineryItem[]
  gfWindows: number
  gfDoors: number
  ffWindows: number
  rooflights: number
  totalAreaM2: number
}

function nextCode(items: JoineryItem[], prefix: string): string {
  const n = items.filter((i) => i.code.startsWith(prefix)).length + 1
  return `${prefix}${n}`
}

/**
 * Window / door schedule.
 *
 * Plan openings seed GF items: doors → FD1…, window openings → WG1….
 * Extra GF/FF/rooflight counts append blank rows (user fills sizes / photos).
 * Each item: width, height, opening lights, panes, glazing, sill / sub-sill.
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

export function calcJoinery(plan: Plan, geometry: DerivedGeometry, input: JoineryInputs): JoineryResult {
  const items = input.items.length > 0 ? input.items : buildJoinerySchedule(plan, input)
  const gfWindows = items.filter((i) => i.kind === 'window' && i.storey === 'gf').length
  const gfDoors = items.filter((i) => i.kind === 'door' && i.storey === 'gf').length
  const ffWindows = items.filter((i) => i.kind === 'window' && i.storey === 'ff').length
  const rooflights = items.filter((i) => i.kind === 'rooflight').length
  const totalAreaM2 = items.reduce((acc, it) => acc + (it.widthMm * it.heightMm) / 1e6, 0)
  void geometry
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

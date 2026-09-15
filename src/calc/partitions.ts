import type { Plan } from '../types/job'
import type { DerivedGeometry } from '../geometry/derive'
import type { PartitionInputs } from '../types/modules'
import { ceilDiv, mmToM, withWaste } from './units'

export function partitionDoorCount(plan: Plan, fallbackDoors: number, source: DerivedGeometry['source']): number {
  if (source === 'manual') return Math.max(0, fallbackDoors)
  const partIds = new Set(plan.walls.filter((w) => w.kind === 'partition').map((w) => w.id))
  return plan.openings.filter((o) => o.kind === 'door' && partIds.has(o.wallId)).length
}

export interface PartitionResult {
  lengthM: number
  heightM: number
  areaM2: number
  studs: number
  platesM: number
  blocks: number
  plasterboardSheets: number
  doorsOnPartitions: number
  lintels: number
  doubledStuds: number
  notes: string[]
}

/**
 * Internal walls / partitions from plan partition length.
 *
 * Timber / metal stud: n = floor(length / centres) + 1 per run, treated as one run here;
 *   plates = 2 × length (head + sole); extra doubled studs = 2 per door (cripples + king).
 * Blockwork: units = area / ((L+10)×(H+10)).
 * Plasterboard: layers × 2 faces × area / 2.88 m² sheet + 10% waste.
 * Door count from plan doors on partition walls; each → lintel (timber header / block padstone).
 */
export function calcPartitions(
  g: DerivedGeometry,
  input: PartitionInputs,
  partitionDoorCount: number,
): PartitionResult {
  const lengthM = mmToM(g.partitionLengthMm)
  const heightM = mmToM(g.storeyHeightMm)
  const areaM2 = lengthM * heightM
  const notes: string[] = []
  let studs = 0
  let platesM = 0
  let blocks = 0

  if (input.type === 'blockwork') {
    const cover = ((input.blockLengthMm + 10) * (input.blockHeightMm + 10)) / 1e6
    blocks = ceilDiv(areaM2, cover)
  } else {
    studs = lengthM > 0 ? Math.floor(g.partitionLengthMm / input.centresMm) + 1 : 0
    platesM = lengthM * 2
    if (input.serviceVoid) notes.push('Service void opted in — add a battened lining or deeper stud.')
  }

  const doubledStuds = partitionDoorCount * 2
  const lintels = partitionDoorCount
  const faces = 2
  const pbArea = areaM2 * faces * input.plasterboardLayers * (input.acoustic || input.fireRating ? 1 : 1)
  const plasterboardSheets = ceilDiv(withWaste(pbArea, 10), 2.88)

  if (input.acoustic) notes.push('Acoustic lining — consider 15 mm sound-bloc + insulation in the cavity.')
  if (input.fireRating) notes.push('Fire rating opted in — confirm board type and cavity barriers to the required minutes.')
  notes.push('Door openings on partitions drive lintels and doubled studs / cripples (schedule).')

  return {
    lengthM,
    heightM,
    areaM2,
    studs: studs + doubledStuds,
    platesM,
    blocks,
    plasterboardSheets,
    doorsOnPartitions: partitionDoorCount,
    lintels,
    doubledStuds,
    notes,
  }
}

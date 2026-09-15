import type { DerivedGeometry } from '../geometry/derive'
import type { FasciasInputs } from '../types/job'
import type { PaintingInputs } from '../types/modules'
import { calcFascias } from './fascias'
import { calcFinishes } from './finishes'
import { DEFAULT_FINISHES } from '../types/modules'
import type { RoofingInputs } from '../types/job'
import { ceilDiv } from './units'

export interface PaintingResult {
  coats: { mist: number; top: number }
  wallCeilingM2: number
  woodworkM2: number
  externalM2: number
  litres: number
  tins: number
  notes: string[]
}

/**
 * Painting & decorating.
 *
 * New plaster: mist + 2 top coats (3 coats on walls/ceilings).
 * Existing painted: prep + 2 top (treated as 2 coats).
 * Fresh render: breathable masonry, 2 coats on external elevations.
 * Woodwork: skirting + architrave + doors + frames (approx 0.4 m² per door + 0.08 m²/m skirting).
 * External toggle: fascias/soffits from the fascia calc, plus joinery area.
 */
export function calcPainting(
  g: DerivedGeometry,
  input: PaintingInputs,
  roofing: RoofingInputs,
  fascias: FasciasInputs,
  doorCount: number,
): PaintingResult {
  const finishes = calcFinishes(g, { ...DEFAULT_FINISHES, paint: false, plasterboard: false, skim: false })
  const wallCeilingM2 = finishes.wallM2 + finishes.ceilingM2
  let mist = 0
  let top = 2
  const notes: string[] = []
  if (input.substrate === 'new-plaster') {
    mist = 1
    top = 2
    notes.push('New plaster: mist coat + 2 top coats.')
  } else if (input.substrate === 'existing-painted') {
    mist = 0
    top = 2
    notes.push('Existing paint: prep + filler, then 2 top coats.')
  } else {
    mist = 0
    top = 2
    notes.push('Fresh render: breathable masonry paint, 2 coats.')
  }
  const internalCoats = mist + top
  const woodworkM2 = input.woodwork
    ? doorCount * 0.4 + ((g.externalLengthMm + 2 * g.partitionLengthMm) / 1000) * 0.08 * g.storeys
    : 0
  let externalM2 = 0
  if (input.externalFascias) {
    const f = calcFascias(g, roofing, fascias)
    externalM2 += f.paint?.areaPerCoatM2 ?? f.soffitAreaM2 + f.fasciaLinearM * 0.175
  }
  if (input.externalJoinery) {
    externalM2 += g.openingAreaM2 * 0.35
  }
  const masonryM2 =
    input.substrate === 'fresh-render' ? finishes.wallM2 * 0 + g.externalLengthMm / 1000 * (g.storeyHeightMm / 1000) * g.storeys : wallCeilingM2
  const totalM2 =
    (input.substrate === 'fresh-render' ? masonryM2 * top : wallCeilingM2 * internalCoats) +
    woodworkM2 * 2 +
    externalM2 * 2
  const litres = input.coverageM2PerL > 0 ? totalM2 / input.coverageM2PerL : 0
  const tins = ceilDiv(litres, input.tinL)
  notes.push('Coverage by surface. Guide only — sheen and porosity change spread rate.')
  return {
    coats: { mist, top },
    wallCeilingM2,
    woodworkM2,
    externalM2,
    litres,
    tins,
    notes,
  }
}

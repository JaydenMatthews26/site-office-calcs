import { formatM, formatM2, mmToM } from '../../calc/units'
import type { DerivedGeometry } from '../../geometry/derive'
import { useJobStore } from '../../store/useJobStore'

export function geomBlurb(g: DerivedGeometry): string {
  const src = g.source === 'manual' ? 'typed measurements' : 'the plan'
  return `Reading ${src}: ${formatM(mmToM(g.spanMm))} × ${formatM(mmToM(g.lengthMm))} · ${formatM2(g.footprintM2)} · ${g.storeys} storey(s) @ ${g.storeyHeightMm} mm.`
}

export function jobState() {
  return useJobStore.getState()
}

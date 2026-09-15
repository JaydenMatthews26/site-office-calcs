import type { DerivedGeometry } from '../../geometry/derive'
import { formatM, formatM2, mmToM } from '../../calc/units'

export function PlanMetrics({ geometry }: { geometry: DerivedGeometry }) {
  const cells = [
    { label: 'Span', value: formatM(mmToM(geometry.spanMm)) },
    { label: 'Length', value: formatM(mmToM(geometry.lengthMm)) },
    { label: 'Footprint', value: formatM2(geometry.footprintM2) },
    { label: 'Ceiling', value: formatM2(geometry.ceilingM2) },
    { label: 'External walls', value: formatM(mmToM(geometry.externalLengthMm)) },
    { label: 'Partitions', value: formatM(mmToM(geometry.partitionLengthMm)) },
    { label: 'Doors', value: String(geometry.doorCount) },
    { label: 'Openings', value: String(geometry.openingCount) },
  ]

  return (
    <div className="no-print grid grid-cols-2 gap-px border-b border-line bg-line sm:grid-cols-4 lg:grid-cols-8">
      {cells.map((c) => (
        <div key={c.label} className="bg-card px-3 py-2">
          <p className="text-[10px] font-medium uppercase tracking-wider text-ink-soft">{c.label}</p>
          <p className="font-mono text-sm font-medium">{c.value}</p>
        </div>
      ))}
      <div className="col-span-2 bg-card px-3 py-2 sm:col-span-4 lg:col-span-8">
        <p className="text-[11px] text-ink-soft">
            {geometry.wallCount === 0
            ? geometry.source === 'manual'
              ? 'Typed measurements drive every calculator. Switch to Draw plan for the canvas.'
              : 'Empty sheet — drag a rectangle or insert the 8 × 6 m sample. Scale: 40 px = 1 m, snap 100 mm.'
            : geometry.closedOutline
              ? `Closed external outline. Calculators read these figures (${geometry.source === 'manual' ? 'typed' : 'drawn'}).`
              : 'Outline is not closed — footprint uses the bounding box until walls join.'}
        </p>
      </div>
    </div>
  )
}

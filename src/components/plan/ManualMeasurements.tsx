import { useState } from 'react'
import { formatM2, mmToM } from '../../calc/units'
import { manualHasSizes, suggestRectangle, typicalFootprintM2 } from '../../geometry/effective'
import { useJobStore } from '../../store/useJobStore'
import { InlineConfirm, NumberField, Panel } from '../ui/Fields'

export function ManualMeasurements() {
  const manual = useJobStore((s) => s.manual)
  const patchManual = useJobStore((s) => s.patchManual)
  const copyManualFromPlan = useJobStore((s) => s.copyManualFromPlan)
  const [confirmCopy, setConfirmCopy] = useState(false)
  const wallCount = useJobStore((s) => s.plan.walls.length)
  const setStoreys = useJobStore((s) => s.setStoreys)
  const setStoreyHeight = useJobStore((s) => s.setStoreyHeight)
  const setActive = useJobStore((s) => s.setActiveSection)
  const roofing = useJobStore((s) => s.roofing)
  const patchRoofing = useJobStore((s) => s.patchRoofing)

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex max-w-4xl flex-col gap-4 p-4 pb-16">
        <Panel title="Typed measurements">
          <p className="mb-3 text-sm text-ink-soft">
            No canvas in this mode. These figures are the same take-off model the calculators read
            (span, length, footprint, eaves/perimeter, openings, heights). UK units.
          </p>
          <div className="mb-4">
            {confirmCopy ? (
              <InlineConfirm
                message="Replace typed sizes with the drawn plan? Roof pitch and eaves overhang stay on the roofing section."
                confirmLabel="Replace typed sizes"
                onConfirm={() => {
                  copyManualFromPlan()
                  setConfirmCopy(false)
                }}
                onCancel={() => setConfirmCopy(false)}
              />
            ) : (
              <button
                type="button"
                disabled={wallCount === 0}
                onClick={() => {
                  if (manualHasSizes(manual)) setConfirmCopy(true)
                  else copyManualFromPlan()
                }}
                className="touch-target rounded-md border border-line px-3 text-sm hover:border-accent disabled:opacity-40"
              >
                Copy from drawn plan
              </button>
            )}
            <p className="mt-1 text-[11px] text-ink-soft">
              {wallCount === 0
                ? 'Draw a plan first if you want to map canvas sizes into these fields.'
                : 'Maps the canvas into these fields. Pitch and eaves overhang stay on roofing — not duplicated here.'}
            </p>
          </div>
          <SpanLengthHint />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <NumberField
              label="Span (shorter side)"
              unit="m"
              min={0}
              step={0.1}
              value={Number(mmToM(manual.spanMm).toFixed(2))}
              onChange={(e) => {
                const spanMm = Number(e.target.value) * 1000
                patchManual(suggestRectangle(manual, spanMm, manual.lengthMm))
              }}
            />
            <NumberField
              label="Building length"
              unit="m"
              min={0}
              step={0.1}
              value={Number(mmToM(manual.lengthMm).toFixed(2))}
              onChange={(e) => {
                const lengthMm = Number(e.target.value) * 1000
                patchManual(suggestRectangle(manual, manual.spanMm, lengthMm))
              }}
            />
            <NumberField
              label="Footprint / GIFA"
              unit="m²"
              min={0}
              step={0.1}
              value={Number(manual.footprintM2.toFixed(2))}
              hint={formatM2(typicalFootprintM2(manual.spanMm, manual.lengthMm)) + ' if rectangular'}
              onChange={(e) => patchManual({ footprintM2: Number(e.target.value) })}
            />
            <NumberField
              label="External perimeter / eaves"
              unit="m"
              min={0}
              step={0.1}
              value={Number(mmToM(manual.externalLengthMm).toFixed(2))}
              onChange={(e) => patchManual({ externalLengthMm: Number(e.target.value) * 1000 })}
            />
            <NumberField
              label="Partition length"
              unit="m"
              min={0}
              step={0.1}
              value={Number(mmToM(manual.partitionLengthMm).toFixed(2))}
              onChange={(e) => patchManual({ partitionLengthMm: Number(e.target.value) * 1000 })}
            />
            <NumberField
              label="Storey height"
              unit="mm"
              min={2100}
              step={50}
              value={manual.storeyHeightMm}
              onChange={(e) => setStoreyHeight(Number(e.target.value))}
            />
            <NumberField
              label="Storeys"
              min={1}
              max={3}
              value={manual.storeys}
              onChange={(e) => setStoreys(Number(e.target.value))}
            />
            <NumberField
              label="Doors"
              min={0}
              value={manual.doorCount}
              onChange={(e) => patchManual({ doorCount: Number(e.target.value) })}
            />
            <NumberField
              label="Windows / openings"
              min={0}
              value={manual.openingCount}
              onChange={(e) => patchManual({ openingCount: Number(e.target.value) })}
            />
            <NumberField
              label="Typical door"
              unit="mm"
              value={manual.doorWidthMm}
              hint={`H ${manual.doorHeightMm} mm`}
              onChange={(e) => patchManual({ doorWidthMm: Number(e.target.value) })}
            />
            <NumberField
              label="Door height"
              unit="mm"
              value={manual.doorHeightMm}
              onChange={(e) => patchManual({ doorHeightMm: Number(e.target.value) })}
            />
            <NumberField
              label="Typical window"
              unit="mm"
              value={manual.windowWidthMm}
              hint={`H ${manual.windowHeightMm} mm`}
              onChange={(e) => patchManual({ windowWidthMm: Number(e.target.value) })}
            />
            <NumberField
              label="Window height"
              unit="mm"
              value={manual.windowHeightMm}
              onChange={(e) => patchManual({ windowHeightMm: Number(e.target.value) })}
            />
          </div>
        </Panel>
        <Panel title="Roof pitch & eaves overhang">
          <p className="mb-3 text-sm text-ink-soft">
            Same fields as the roofing section — edit once, both modes use them.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <NumberField
              label="Pitch"
              unit="°"
              min={12}
              max={60}
              value={roofing.pitchDeg}
              onChange={(e) => patchRoofing({ pitchDeg: Number(e.target.value) })}
            />
            <NumberField
              label="Eaves overhang"
              unit="mm"
              min={0}
              step={50}
              value={roofing.eavesOverhangMm}
              onChange={(e) => patchRoofing({ eavesOverhangMm: Number(e.target.value) })}
            />
          </div>
          <p className="mt-3 text-sm text-ink-soft">
            Coverings and carpentry live on{' '}
            <button type="button" className="underline" onClick={() => setActive('roofing')}>
              roofing
            </button>
            .
          </p>
        </Panel>
      </div>
    </div>
  )
}

function SpanLengthHint() {
  return (
    <div className="mb-4 flex flex-col gap-3 rounded-lg border border-line bg-paper p-3 sm:flex-row sm:items-center">
      <svg viewBox="0 0 220 110" className="h-24 w-full max-w-[220px] text-ink" role="img" aria-label="Rectangle: short side is span 5 m, long side is length 10 m">
        <rect x="48" y="18" width="150" height="62" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <text x="123" y="96" textAnchor="middle" fontSize="11" fill="currentColor">
          Length 10 m
        </text>
        <text x="18" y="52" textAnchor="middle" fontSize="11" fill="currentColor" transform="rotate(-90 18 52)">
          Span 5 m
        </text>
      </svg>
      <p className="text-sm text-ink-soft">
        Span is the shorter side. For a 5 m × 10 m rectangle, enter span <strong className="font-medium text-ink">5 m</strong> and
        building length <strong className="font-medium text-ink">10 m</strong>. Footprint is then 50 m² and the external perimeter is 30 m.
      </p>
    </div>
  )
}

import { formatM2, mmToM } from '../../calc/units'
import { typicalFootprintM2, typicalPerimeterMm } from '../../geometry/effective'
import { useJobStore } from '../../store/useJobStore'
import { NumberField, Panel } from '../ui/Fields'

export function ManualMeasurements() {
  const manual = useJobStore((s) => s.manual)
  const patchManual = useJobStore((s) => s.patchManual)
  const setStoreys = useJobStore((s) => s.setStoreys)
  const setActive = useJobStore((s) => s.setActiveSection)

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex max-w-4xl flex-col gap-4 p-4 pb-16">
        <Panel title="Typed measurements">
          <p className="mb-3 text-sm text-ink-soft">
            No canvas in this mode. These figures are the same take-off model the calculators read
            (span, length, footprint, eaves/perimeter, openings, heights). UK units.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <NumberField
              label="Span (shorter side)"
              unit="m"
              min={0}
              step={0.1}
              value={Number(mmToM(manual.spanMm).toFixed(2))}
              onChange={(e) => {
                const spanMm = Number(e.target.value) * 1000
                const footprintM2 =
                  manual.footprintM2 > 0 ? manual.footprintM2 : typicalFootprintM2(spanMm, manual.lengthMm)
                const externalLengthMm =
                  manual.externalLengthMm > 0
                    ? manual.externalLengthMm
                    : typicalPerimeterMm(spanMm, manual.lengthMm)
                patchManual({ spanMm, footprintM2, externalLengthMm })
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
                const footprintM2 =
                  manual.footprintM2 > 0 ? manual.footprintM2 : typicalFootprintM2(manual.spanMm, lengthMm)
                const externalLengthMm =
                  manual.externalLengthMm > 0
                    ? manual.externalLengthMm
                    : typicalPerimeterMm(manual.spanMm, lengthMm)
                patchManual({ lengthMm, footprintM2, externalLengthMm })
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
              onChange={(e) => patchManual({ storeyHeightMm: Number(e.target.value) })}
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
        <p className="text-sm text-ink-soft">
          Roofing next:{' '}
          <button type="button" className="underline" onClick={() => setActive('roofing')}>
            open roofing
          </button>
          . Eaves overhang and pitch still live there.
        </p>
      </div>
    </div>
  )
}

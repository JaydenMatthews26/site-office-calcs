import { useMemo } from 'react'
import { calcFascias } from '../../calc/fascias'
import { formatGBP, formatM, formatM2, mmToM } from '../../calc/units'
import { deriveGeometry } from '../../geometry/derive'
import { exportFasciasPdf } from '../../pdf/exportFascias'
import { useJobStore } from '../../store/useJobStore'
import { NumberField, Stat } from '../ui/Fields'
import { FasciaSoffitPanel, GutteringPanel } from './FasciaPanels'

export function FasciasSection() {
  const jobName = useJobStore((s) => s.jobName)
  const plan = useJobStore((s) => s.plan)
  const roofing = useJobStore((s) => s.roofing)
  const fascias = useJobStore((s) => s.fascias)
  const sectionEnabled = useJobStore((s) => s.sectionEnabled)
  const patchFascias = useJobStore((s) => s.patchFascias)
  const setActive = useJobStore((s) => s.setActiveSection)

  const geometry = useMemo(() => deriveGeometry(plan), [plan])
  const result = useMemo(
    () => calcFascias(geometry, roofing, fascias),
    [geometry, roofing, fascias],
  )
  const included = sectionEnabled.fascias !== false

  const eavesRunM = mmToM(result.eavesRunMm)
  const eavesFromPlanM = mmToM(result.eavesRunFromPlanMm)

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 p-4 pb-16">
        <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-line bg-card p-4">
          <div>
            <h2 className="text-lg font-semibold">Fascias, soffits & guttering</h2>
            <p className="mt-1 max-w-2xl text-sm text-ink-soft">
              Reading from the plan: eaves run {formatM(eavesFromPlanM)} · property width{' '}
              {formatM(mmToM(result.propertyWidthFromPlanMm))} · storey {result.eavesHeightFromPlanMm}{' '}
              mm
              {geometry.closedOutline ? '' : ' (bbox — close the outline for a polygon area)'}. Roof
              shape {roofing.roofShape} and {roofing.eavesOverhangMm} mm overhang come from roofing —
              fields below stay editable.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              className="h-4 w-4 accent-accent"
              checked={included}
              onChange={(e) => useJobStore.getState().toggleSection('fascias', e.target.checked)}
            />
            Include fascias in job / PDF
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <NumberField
            label="Eaves run"
            unit="m"
            min={0}
            step={0.1}
            value={Number(eavesRunM.toFixed(2))}
            hint={`From plan ${formatM(eavesFromPlanM)}`}
            onChange={(e) => {
              const v = Number(e.target.value)
              patchFascias({ eavesRunOverrideMm: Number.isFinite(v) ? v * 1000 : null })
            }}
          />
          <Stat
            label="Roof shape"
            value={
              roofing.roofShape === 'gable-gable'
                ? 'Gable to gable'
                : roofing.roofShape === 'gable-hip'
                  ? 'Gable to hip'
                  : 'Hip to hip'
            }
            hint={`${roofing.pitchDeg}° · overhang ${roofing.eavesOverhangMm} mm`}
          />
          <Stat label="Soffit width" value={`${result.soffitWidthMm} mm`} hint="Eaves overhang unless overridden" />
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => setActive('roofing')}
              className="touch-target w-full rounded-md border border-line px-3 text-sm hover:border-accent"
            >
              Edit pitch / shape in roofing
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={!included}
            onClick={() =>
              exportFasciasPdf({
                job: {
                  jobName,
                  plan,
                  roofing,
                  fascias,
                  activeSectionId: 'fascias',
                  sectionEnabled,
                },
                geometry,
                fascias: result,
              })
            }
            className="touch-target rounded-md bg-accent px-4 text-sm font-semibold text-white disabled:opacity-40"
          >
            Export fascias PDF
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Fascia / soffit run" value={formatM(result.fasciaLinearM)} />
          <Stat label="Soffit area" value={formatM2(result.soffitAreaM2)} />
          <Stat
            label="Indicative total"
            value={formatGBP(result.indicativeTotalGbp)}
            hint="Supply only"
          />
        </div>

        <FasciaSoffitPanel result={result} />
        <GutteringPanel result={result} />

        <ul className="list-disc space-y-1 pl-4 text-xs text-ink-soft">
          {result.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>

        <p className="text-xs text-ink-soft">
          Take-off aid only — not a substitute for BS EN 12056-3 rainwater design or a merchant’s
          cutting list. UK units (mm / m / £).
        </p>
      </div>
    </div>
  )
}

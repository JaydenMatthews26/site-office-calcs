import { useMemo } from 'react'
import { calcCoverings } from '../../calc/roofCoverings'
import { calcCarpentry } from '../../calc/roofCarpentry'
import { formatM, formatM2, mmToM } from '../../calc/units'
import { useGeometry } from '../../hooks/useGeometry'
import { exportRoofingPdf } from '../../pdf/exportRoofing'
import { useJobStore } from '../../store/useJobStore'
import { jobState } from '../takeoff/geom'
import { NumberField, Panel, SelectField, Stat } from '../ui/Fields'
import { CarpentryPanel } from './CarpentryPanel'
import { CoveringsPanel } from './CoveringsPanel'
import { CutListPreview } from './CutListPreview'

export function RoofingSection() {
  const jobName = useJobStore((s) => s.jobName)
  const roofing = useJobStore((s) => s.roofing)
  const sectionEnabled = useJobStore((s) => s.sectionEnabled)
  const patchRoofing = useJobStore((s) => s.patchRoofing)

  const geometry = useGeometry()
  const coverings = useMemo(() => calcCoverings(geometry, roofing), [geometry, roofing])
  const carpentry = useMemo(() => calcCarpentry(geometry, roofing), [geometry, roofing])
  const included = sectionEnabled.roofing !== false

  const spanM = mmToM(roofing.spanOverrideMm ?? geometry.spanMm)
  const lengthM = mmToM(roofing.lengthOverrideMm ?? geometry.lengthMm)

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 p-4 pb-16">
        <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-line bg-card p-4">
          <div>
            <h2 className="text-lg font-semibold">Roofing</h2>
            <p className="mt-1 max-w-2xl text-sm text-ink-soft">
              Reading from the plan: {formatM(mmToM(geometry.spanMm))} span × {formatM(mmToM(geometry.lengthMm))} ·{' '}
              {formatM2(geometry.footprintM2)} footprint
              {geometry.closedOutline ? '' : ' (bbox — close the outline for a polygon area)'}. Overrides stay
              editable if the structural span differs from the drawn box.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              className="h-4 w-4 accent-accent"
              checked={included}
              onChange={(e) => useJobStore.getState().toggleSection('roofing', e.target.checked)}
            />
            Include roofing in job / PDF
          </label>
        </div>

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
          <NumberField
            label="Span override"
            unit="m"
            min={0}
            step={0.1}
            value={Number(spanM.toFixed(2))}
            hint={`From plan ${formatM(mmToM(geometry.spanMm))}`}
            onChange={(e) => {
              const v = Number(e.target.value)
              patchRoofing({ spanOverrideMm: Number.isFinite(v) ? v * 1000 : null })
            }}
          />
          <NumberField
            label="Length override"
            unit="m"
            min={0}
            step={0.1}
            value={Number(lengthM.toFixed(2))}
            hint={`From plan ${formatM(mmToM(geometry.lengthMm))}`}
            onChange={(e) => {
              const v = Number(e.target.value)
              patchRoofing({ lengthOverrideMm: Number.isFinite(v) ? v * 1000 : null })
            }}
          />
          <SelectField
            label="Roof shape"
            value={roofing.roofShape}
            onChange={(e) =>
              patchRoofing({ roofShape: e.target.value as typeof roofing.roofShape })
            }
          >
            <option value="gable-gable">Gable to gable</option>
            <option value="gable-hip">Gable to hip</option>
            <option value="hip-hip">Hip to hip</option>
          </SelectField>
          <SelectField
            label="Carpentry mode"
            value={roofing.carpentryMode}
            onChange={(e) =>
              patchRoofing({ carpentryMode: e.target.value as typeof roofing.carpentryMode })
            }
          >
            <option value="cut">Cut roof</option>
            <option value="truss">Truss roof</option>
          </SelectField>
          {roofing.carpentryMode === 'cut' ? (
            <SelectField
              label="Rafter spacing"
              value={String(roofing.rafterSpacingMm)}
              onChange={(e) => patchRoofing({ rafterSpacingMm: Number(e.target.value) })}
            >
              <option value="400">400 mm</option>
              <option value="450">450 mm</option>
              <option value="600">600 mm</option>
            </SelectField>
          ) : (
            <SelectField
              label="Truss type"
              value={roofing.trussType}
              onChange={(e) => patchRoofing({ trussType: e.target.value as typeof roofing.trussType })}
            >
              <option value="fink">Fink</option>
              <option value="attic">Attic (room in roof)</option>
              <option value="mono-pitch">Mono-pitch</option>
              <option value="scissor">Scissor</option>
              <option value="raised-tie">Raised tie</option>
            </SelectField>
          )}
          <NumberField
            label="Wall plate width"
            unit="mm"
            min={47}
            max={150}
            value={roofing.wallPlateWidthMm}
            onChange={(e) => patchRoofing({ wallPlateWidthMm: Number(e.target.value) })}
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <label className="flex items-center gap-2 rounded-lg border border-line bg-card px-3 py-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 accent-accent"
              checked={roofing.coveringsEnabled}
              onChange={(e) => patchRoofing({ coveringsEnabled: e.target.checked })}
            />
            Roof coverings
          </label>
          <label className="flex items-center gap-2 rounded-lg border border-line bg-card px-3 py-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 accent-accent"
              checked={roofing.carpentryEnabled}
              onChange={(e) => patchRoofing({ carpentryEnabled: e.target.checked })}
            />
            Roofing carpentry
          </label>
          <label className="flex items-center gap-2 rounded-lg border border-line bg-card px-3 py-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 accent-accent"
              checked={roofing.cutListOptIn}
              onChange={(e) => patchRoofing({ cutListOptIn: e.target.checked })}
            />
            Show printable cut list
          </label>
          <button
            type="button"
            disabled={!included}
            onClick={() =>
              exportRoofingPdf({
                job: jobState(),
                geometry,
                coverings,
                carpentry,
              })
            }
            className="touch-target rounded-md bg-accent px-4 text-sm font-semibold text-white disabled:opacity-40"
          >
            Export roofing PDF
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Slope area" value={formatM2(coverings.dims.slopeAreaM2)} hint="Plan area ÷ cos(pitch)" />
          <Stat label="Ridge" value={formatM(mmToM(coverings.dims.ridgeMm))} />
          <Stat
            label="Hips / verges"
            value={`${coverings.dims.hipCount} hips · ${coverings.dims.vergeCount} verges`}
          />
        </div>

        {roofing.coveringsEnabled ? <CoveringsPanel result={coverings} /> : null}
        {roofing.carpentryEnabled ? <CarpentryPanel result={carpentry} /> : null}
        {roofing.cutListOptIn && carpentry.mode === 'cut' ? (
          <CutListPreview cut={carpentry} jobName={jobName} />
        ) : roofing.cutListOptIn && carpentry.mode === 'truss' ? (
          <Panel title="Cut list">
            <p className="text-sm text-ink-soft">
              Cut list is for site-cut rafters. Switch to cut-roof mode to draw a labelled common rafter × N and
              diminishing jacks.
            </p>
          </Panel>
        ) : null}

        <p className="text-xs text-ink-soft">
          Take-off aid only — not a substitute for Approved Document A, BS 5534 or a fabricator’s design. UK units
          (mm / m / £).
        </p>
      </div>
    </div>
  )
}

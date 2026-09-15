import type { CarpentryResult } from '../../calc/roofCarpentry'
import { formatGBP, formatM, mmToM } from '../../calc/units'
import { Panel, Stat } from '../ui/Fields'

export function CarpentryPanel({ result }: { result: CarpentryResult }) {
  if (result.mode === 'truss') {
    return (
      <Panel title="Roofing carpentry — truss">
        {result.atticFloorWarning ? (
          <p className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-warn">
            Attic truss: specify a heavier floor joist / attic deck. Do not treat the bottom chord as a standard
            Fink joist.
          </p>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Truss type" value={result.trussType} />
          <Stat label="Centres" value={`${result.centresMm} mm`} />
          <Stat label="Truss count" value={String(result.trussCount)} hint="floor(length / 0.6) + 1" />
          <Stat label="Timber (all trusses)" value={`${result.totalTimberM.toFixed(1)} m`} />
          <Stat
            label="Indicative cost"
            value={formatGBP(result.indicativeCostGbp)}
            hint="£85 / m² footprint"
          />
        </div>
        <table className="mt-4 w-full text-left text-sm">
          <thead>
            <tr className="text-[11px] uppercase tracking-wider text-ink-soft">
              <th className="py-1">Member</th>
              <th>Section</th>
              <th>Length</th>
              <th>Per truss</th>
            </tr>
          </thead>
          <tbody>
            {result.members.map((m) => (
              <tr key={m.name} className="border-t border-line font-mono text-[13px]">
                <td className="py-1.5 font-sans">{m.name}</td>
                <td>{m.section}</td>
                <td>{m.lengthMm.toFixed(0)} mm</td>
                <td>× {m.countPerTruss}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <ul className="mt-3 list-disc space-y-1 pl-4 text-xs text-ink-soft">
          {result.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      </Panel>
    )
  }

  const cut = result
  return (
    <Panel title="Roofing carpentry — cut roof">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Common rafter"
          value={`${cut.commonRafterLengthMm.toFixed(0)} mm`}
          hint={`${cut.rafterSection} × ${cut.commonRafterCount}`}
        />
        <Stat label="Plumb cut" value={`${cut.plumbCutDeg.toFixed(1)}°`} hint="Equals pitch" />
        <Stat label="Seat cut" value={`${cut.seatCutDeg.toFixed(1)}°`} hint="90° − pitch" />
        <Stat
          label="Bird’s mouth"
          value={`${cut.seatCutMm.toFixed(0)} × ${cut.birdsMouthPlumbMm.toFixed(0)} mm`}
          hint={`Seat × plumb · BM at ${cut.lengthToBirdsmouthMm.toFixed(0)} mm from ridge`}
        />
        <Stat label="Ridge board" value={formatM(mmToM(cut.ridgeBoardMm))} hint={cut.ridgeSection} />
        <Stat label="Wall plate" value={formatM(mmToM(cut.wallPlateMm))} hint={cut.wallPlateSection} />
        <Stat
          label="Hip rafters"
          value={cut.hipCount ? `${cut.hipCount} @ ${cut.hipLengthMm.toFixed(0)} mm` : 'None'}
        />
        <Stat
          label="Jack rafters"
          value={`${cut.jackCount}`}
          hint={`CD ${cut.jackCommonDifferenceMm.toFixed(0)} mm = spacing / cos(θ)`}
        />
        <Stat
          label="Collar ties"
          value={`${cut.collarTieCount} @ ${cut.collarTieLengthMm.toFixed(0)} mm`}
          hint={cut.collarSection}
        />
        <Stat
          label="Purlins"
          value={`${cut.purlinCount} @ ${formatM(mmToM(cut.purlinLengthMm))}`}
          hint={cut.purlinSection}
        />
        <Stat label="Total timber" value={`${cut.totalTimberM.toFixed(1)} m`} hint="Indicative linear metres" />
        <Stat label="Rise to fascia" value={`${cut.riseToFasciaMm.toFixed(0)} mm`} />
      </div>
      <ul className="mt-3 list-disc space-y-1 pl-4 text-xs text-ink-soft">
        {cut.notes.map((n) => (
          <li key={n}>{n}</li>
        ))}
      </ul>
    </Panel>
  )
}

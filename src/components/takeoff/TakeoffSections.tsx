import { useMemo } from 'react'
import { calcExternalWalls } from '../../calc/externalWalls'
import { calcExternals } from '../../calc/externals'
import { calcFinishes } from '../../calc/finishes'
import { calcFirstFloor } from '../../calc/firstFloor'
import { calcFoundations, SUBSTRATE_DEPTH_MM } from '../../calc/foundations'
import { calcGroundFloor } from '../../calc/groundFloor'
import { calcMep } from '../../calc/mep'
import { calcPainting } from '../../calc/painting'
import { calcPartitions, partitionDoorCount } from '../../calc/partitions'
import { calcScaffold } from '../../calc/scaffold'
import { calcSkirting, SKIRTING_PROFILES } from '../../calc/skirting'
import { calcStairs } from '../../calc/stairs'
import { formatGBP, formatM, formatM2, formatM3 } from '../../calc/units'
import { useGeometry } from '../../hooks/useGeometry'
import {
  exportExternalWallsPdf,
  exportExternalsPdf,
  exportFinishesPdf,
  exportFirstFloorPdf,
  exportFoundationsPdf,
  exportGroundFloorPdf,
  exportMepPdf,
  exportPaintingPdf,
  exportPartitionsPdf,
  exportScaffoldPdf,
  exportSkirtingPdf,
  exportStairsPdf,
} from '../../pdf/exportTakeoff'
import { useJobStore } from '../../store/useJobStore'
import { CalcSection } from '../section/CalcSection'
import { CheckField, Notes, NumberField, Panel, SelectField, Stat } from '../ui/Fields'
import { geomBlurb, jobState } from './geom'

export function FoundationsSection() {
  const g = useGeometry()
  const input = useJobStore((s) => s.foundations)
  const patch = useJobStore((s) => s.patchFoundations)
  const r = useMemo(() => calcFoundations(g, input), [g, input])
  return (
    <CalcSection
      id="foundations"
      title="Foundations up to DPC"
      blurb={geomBlurb(g)}
      exportLabel="Export foundations PDF"
      onExport={() => exportFoundationsPdf(jobState(), g, r)}
      footer={<Notes notes={r.notes} />}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SelectField label="Type" value={input.type} onChange={(e) => patch({ type: e.target.value as typeof input.type })}>
          <option value="strip">Strip</option>
          <option value="raft">Raft</option>
        </SelectField>
        <SelectField
          label="Substrate"
          value={input.substrate}
          onChange={(e) => {
            const substrate = e.target.value as typeof input.substrate
            patch({ substrate, stripDepthMm: SUBSTRATE_DEPTH_MM[substrate] })
          }}
        >
          <option value="clay">Clay (1000 mm)</option>
          <option value="sand">Sand (750 mm)</option>
          <option value="rock">Rock (450 mm)</option>
        </SelectField>
        {input.type === 'strip' ? (
          <>
            <NumberField label="Strip width" unit="mm" value={input.stripWidthMm} hint="UK two-storey cavity default 600" onChange={(e) => patch({ stripWidthMm: Number(e.target.value) })} />
            <NumberField label="Strip depth" unit="mm" value={input.stripDepthMm} onChange={(e) => patch({ stripDepthMm: Number(e.target.value) })} />
          </>
        ) : (
          <NumberField label="Raft thickness" unit="mm" value={input.raftThicknessMm} onChange={(e) => patch({ raftThicknessMm: Number(e.target.value) })} />
        )}
        <SelectField label="DPC" value={input.dpcMaterial} onChange={(e) => patch({ dpcMaterial: e.target.value as typeof input.dpcMaterial })}>
          <option value="polymeric">Polymeric</option>
          <option value="bitumen">Bitumen</option>
          <option value="polythene">Polythene</option>
        </SelectField>
        <NumberField label="DPC height" unit="mm" value={input.dpcHeightMm} onChange={(e) => patch({ dpcHeightMm: Number(e.target.value) })} />
        <CheckField label="Underpinning (SE)" checked={input.underpinning} onChange={(underpinning) => patch({ underpinning })} />
      </div>
      {r.seFlag ? <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-warn">Flag for structural engineer.</p> : null}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Run" value={formatM(r.runMm / 1000)} hint="External walls A–D+" />
        <Stat label="Concrete" value={formatM3(r.concreteM3)} />
        <Stat label="Excavation" value={formatM3(r.excavationM3)} />
        <Stat label="Spoil" value={formatM3(r.spoilM3)} />
        <Stat label="DPC" value={`${r.dpcLinearM.toFixed(1)} m`} />
      </div>
    </CalcSection>
  )
}

export function GroundFloorSection() {
  const g = useGeometry()
  const input = useJobStore((s) => s.groundFloor)
  const patch = useJobStore((s) => s.patchGroundFloor)
  const r = useMemo(() => calcGroundFloor(g, input), [g, input])
  return (
    <CalcSection id="ground-floor" title="Ground floor structure" blurb={geomBlurb(g)} exportLabel="Export ground floor PDF" onExport={() => exportGroundFloorPdf(jobState(), g, r)} footer={<Notes notes={r.notes} />}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SelectField label="Type" value={input.type} onChange={(e) => patch({ type: e.target.value as typeof input.type })}>
          <option value="slab">Solid slab</option>
          <option value="beam-block">Beam and block</option>
          <option value="timber">Suspended timber</option>
        </SelectField>
        {input.type === 'slab' ? <NumberField label="Slab thickness" unit="mm" value={input.slabThicknessMm} onChange={(e) => patch({ slabThicknessMm: Number(e.target.value) })} /> : null}
        <NumberField label="Insulation (Part L)" unit="mm" value={input.insulationMm} onChange={(e) => patch({ insulationMm: Number(e.target.value) })} />
        <CheckField label="DPM" checked={input.dpm} onChange={(dpm) => patch({ dpm })} />
        <CheckField label="UFH" checked={input.ufh} onChange={(ufh) => patch({ ufh })} />
        <CheckField label="Radon barrier" checked={input.radonBarrier} onChange={(radonBarrier) => patch({ radonBarrier })} />
        {input.type === 'beam-block' ? <NumberField label="Beam centres" unit="mm" value={input.beamCentresMm} onChange={(e) => patch({ beamCentresMm: Number(e.target.value) })} /> : null}
        {input.type === 'timber' ? (
          <>
            <NumberField label="Joist depth" unit="mm" value={input.joistDepthMm} onChange={(e) => patch({ joistDepthMm: Number(e.target.value) })} />
            <NumberField label="Joist width" unit="mm" value={input.joistWidthMm} onChange={(e) => patch({ joistWidthMm: Number(e.target.value) })} />
            <NumberField label="Centres" unit="mm" value={input.joistCentresMm} onChange={(e) => patch({ joistCentresMm: Number(e.target.value) })} />
          </>
        ) : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Area" value={formatM2(r.areaM2)} />
        <Stat label="Concrete" value={formatM3(r.concreteM3)} />
        <Stat label="Insulation" value={formatM3(r.insulationM3)} />
        <Stat label="DPM" value={formatM2(r.dpmM2)} />
        <Stat label="Beams" value={String(r.beams)} />
        <Stat label="Joists" value={`${r.joists}`} hint={`${r.joistLinearM.toFixed(1)} m`} />
      </div>
    </CalcSection>
  )
}

export function PartitionsSection() {
  const g = useGeometry()
  const plan = useJobStore((s) => s.plan)
  const input = useJobStore((s) => s.partitions)
  const patch = useJobStore((s) => s.patchPartitions)
  const doors = partitionDoorCount(plan, g.doorCount, g.source)
  const r = useMemo(() => calcPartitions(g, input, doors), [g, input, doors])
  return (
    <CalcSection id="partitions" title="Internal walls & partitions" blurb={geomBlurb(g)} exportLabel="Export partitions PDF" onExport={() => exportPartitionsPdf(jobState(), g, r)} footer={<Notes notes={r.notes} />}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SelectField label="Type" value={input.type} onChange={(e) => patch({ type: e.target.value as typeof input.type })}>
          <option value="timber-stud">Timber stud</option>
          <option value="metal-stud">Metal stud</option>
          <option value="blockwork">Blockwork</option>
        </SelectField>
        <NumberField label="Centres / height" unit="mm" value={input.centresMm} onChange={(e) => patch({ centresMm: Number(e.target.value) })} />
        <NumberField label="Stud / block depth" unit="mm" value={input.studDepthMm} onChange={(e) => patch({ studDepthMm: Number(e.target.value) })} />
        <NumberField label="PB layers / face" min={1} max={2} value={input.plasterboardLayers} onChange={(e) => patch({ plasterboardLayers: Number(e.target.value) })} />
        <CheckField label="Acoustic" checked={input.acoustic} onChange={(acoustic) => patch({ acoustic })} />
        <CheckField label="Fire rating" checked={input.fireRating} onChange={(fireRating) => patch({ fireRating })} />
        <CheckField label="Service void" checked={input.serviceVoid} onChange={(serviceVoid) => patch({ serviceVoid })} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Length / area" value={`${formatM(r.lengthM)} · ${formatM2(r.areaM2)}`} />
        <Stat label="Studs" value={String(r.studs)} hint={`${r.platesM.toFixed(1)} m plates`} />
        <Stat label="Blocks" value={String(r.blocks)} />
        <Stat label="PB sheets" value={String(r.plasterboardSheets)} />
        <Stat label="Doors / lintels" value={`${r.doorsOnPartitions} / ${r.lintels}`} hint={`${r.doubledStuds} doubled studs`} />
      </div>
    </CalcSection>
  )
}

export function FirstFloorSection() {
  const g = useGeometry()
  const input = useJobStore((s) => s.firstFloor)
  const patch = useJobStore((s) => s.patchFirstFloor)
  const r = useMemo(() => calcFirstFloor(g, input), [g, input])
  return (
    <CalcSection id="first-floor" title="First floor structure" blurb={geomBlurb(g)} exportLabel="Export first floor PDF" onExport={() => exportFirstFloorPdf(jobState(), g, r)} footer={<Notes notes={r.notes} />}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <NumberField label="Joist depth" unit="mm" value={input.joistDepthMm} onChange={(e) => patch({ joistDepthMm: Number(e.target.value) })} />
        <NumberField label="Joist width" unit="mm" value={input.joistWidthMm} onChange={(e) => patch({ joistWidthMm: Number(e.target.value) })} />
        <NumberField label="Centres" unit="mm" value={input.joistCentresMm} onChange={(e) => patch({ joistCentresMm: Number(e.target.value) })} />
        <CheckField label="Noggins" checked={input.noggins} onChange={(noggins) => patch({ noggins })} />
        <CheckField label="Strutting" checked={input.strutting} onChange={(strutting) => patch({ strutting })} />
        <CheckField label="Herringbone" checked={input.herringbone} onChange={(herringbone) => patch({ herringbone })} />
        <NumberField label="Stair opening L" unit="mm" value={input.stairOpeningLengthMm} onChange={(e) => patch({ stairOpeningLengthMm: Number(e.target.value) })} />
        <NumberField label="Stair opening W" unit="mm" value={input.stairOpeningWidthMm} onChange={(e) => patch({ stairOpeningWidthMm: Number(e.target.value) })} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Joists" value={String(r.joists)} hint={`${r.joistLinearM.toFixed(1)} m`} />
        <Stat label="Noggins" value={formatM(r.nogginsM)} />
        <Stat label="Strutting" value={formatM(r.struttingM)} />
        <Stat label="Trimmers" value={String(r.trimmers)} hint={`${r.trimmerLengthMm} mm`} />
      </div>
    </CalcSection>
  )
}

export function StairsSection() {
  const g = useGeometry()
  const input = useJobStore((s) => s.stairs)
  const patch = useJobStore((s) => s.patchStairs)
  const r = useMemo(() => calcStairs(g, input), [g, input])
  return (
    <CalcSection id="stairs" title="Stairs" blurb={geomBlurb(g)} exportLabel="Export stairs PDF" onExport={() => exportStairsPdf(jobState(), g, r)} footer={<Notes notes={r.notes} />}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SelectField label="Plan" value={input.plan} onChange={(e) => patch({ plan: e.target.value as typeof input.plan })}>
          <option value="straight">Straight</option>
          <option value="quarter-landing">Quarter landing</option>
          <option value="half-landing">Half landing</option>
          <option value="dogleg">Dogleg</option>
        </SelectField>
        <NumberField label="Total rise" unit="mm" value={r.totalRiseMm} hint={`From storey ${g.storeyHeightMm} mm`} onChange={(e) => patch({ totalRiseOverrideMm: Number(e.target.value) })} />
        <NumberField label="Going" unit="mm" value={input.goingMm} onChange={(e) => patch({ goingMm: Number(e.target.value) })} />
        <NumberField label="Stair width" unit="mm" value={input.widthMm} hint="Between strings" onChange={(e) => patch({ widthMm: Number(e.target.value) })} />
        <NumberField label="Risers override" min={0} value={input.stepCountOverride ?? r.risers} onChange={(e) => patch({ stepCountOverride: Number(e.target.value) })} />
        <CheckField label="Handrail" checked={input.handrail} onChange={(handrail) => patch({ handrail })} />
        <NumberField label="Baluster spacing" unit="mm" value={input.balusterSpacingMm} hint="≤ 99 mm (Part K sphere)" onChange={(e) => patch({ balusterSpacingMm: Number(e.target.value) })} />
        <NumberField label="Newels" min={2} value={input.newels} onChange={(e) => patch({ newels: Number(e.target.value) })} />
      </div>
      <div
        className={`rounded-lg border px-3 py-2 text-sm ${
          r.pass ? 'border-site bg-emerald-50' : 'border-red-700 bg-red-50 text-red-800'
        }`}
        role="status"
      >
        {r.pass
          ? 'PASS — rise, going and pitch sit inside the brief Part K-style checks.'
          : `FAIL — ${r.suggestion}`}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Rise" value={`${r.riseMm.toFixed(1)} mm`} hint={r.passRise ? 'OK' : 'FAIL over 200 mm'} />
        <Stat label="Going" value={`${r.goingMm} mm`} hint={r.passGoing ? 'OK' : 'FAIL under 220 mm'} />
        <Stat label="Pitch" value={`${r.pitchDeg.toFixed(1)}°`} hint={r.passPitch ? 'OK' : 'FAIL ≥ 42°'} />
        <Stat label="2R+G" value={`${r.twoRplusG.toFixed(0)} mm`} hint={r.passTwoRG ? 'OK 550–700' : 'Outside 550–700'} />
        <Stat label="String" value={`${r.stringLengthMm.toFixed(0)} mm`} hint={`× ${r.strings}`} />
        <Stat label="Balusters / newels" value={`${r.balusters} / ${r.newels}`} />
        <Stat label="Handrail" value={formatM(r.handrailM)} />
      </div>
      <Panel title="Cut list">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-[11px] uppercase tracking-wider text-ink-soft">
              <th className="py-1">Item</th>
              <th>Qty</th>
              <th>Length</th>
              <th>Section</th>
            </tr>
          </thead>
          <tbody>
            {r.cutList.map((row) => (
              <tr key={row.item} className="border-t border-line font-mono text-[13px]">
                <td className="py-1.5 font-sans">{row.item}</td>
                <td>{row.qty}</td>
                <td>{row.lengthMm.toFixed(0)} mm</td>
                <td>{row.section}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </CalcSection>
  )
}

export function ExternalWallsSection() {
  const g = useGeometry()
  const input = useJobStore((s) => s.externalWalls)
  const joinery = useJobStore((s) => s.joinery)
  const patch = useJobStore((s) => s.patchExternalWalls)
  const r = useMemo(() => calcExternalWalls(g, input, joinery.items), [g, input, joinery.items])
  return (
    <CalcSection id="external-walls" title="External walls above DPC" blurb={geomBlurb(g)} exportLabel="Export walls PDF" onExport={() => exportExternalWallsPdf(jobState(), g, r)} footer={<Notes notes={r.notes} />}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <NumberField label="Cavity" unit="mm" value={input.cavityMm} onChange={(e) => patch({ cavityMm: Number(e.target.value) })} />
        <NumberField label="Insulation (Part L)" unit="mm" value={input.insulationMm} onChange={(e) => patch({ insulationMm: Number(e.target.value) })} />
        <SelectField label="Inner" value={input.innerBlock} onChange={(e) => patch({ innerBlock: e.target.value as typeof input.innerBlock })}>
          <option value="lightweight-block">Lightweight block</option>
          <option value="dense-block">Dense block</option>
          <option value="brick">Brick</option>
        </SelectField>
        <SelectField label="Outer" value={input.outerSkin} onChange={(e) => patch({ outerSkin: e.target.value as typeof input.outerSkin })}>
          <option value="brick">Brick (Catnic lintels)</option>
          <option value="block">Block (concrete lintels)</option>
        </SelectField>
        <NumberField label="Lintel bearing" unit="mm" value={input.lintelBearingMm} onChange={(e) => patch({ lintelBearingMm: Number(e.target.value) })} />
        <CheckField label="Cavity barriers" checked={input.cavityBarriers} onChange={(cavityBarriers) => patch({ cavityBarriers })} />
        <CheckField label="Fire stops" checked={input.fireStops} onChange={(fireStops) => patch({ fireStops })} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Net elevation" value={formatM2(r.netElevationM2)} />
        <Stat label="Insulation" value={formatM3(r.insulationM3)} />
        <Stat label="Inner / outer" value={`${r.innerBlocks} / ${r.outerUnits}`} />
        <Stat label="Barriers / stops" value={`${r.cavityBarriersM.toFixed(1)} / ${r.fireStopsM.toFixed(1)} m`} />
      </div>
      {r.lintels.length ? (
        <Panel title="Lintel schedule">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-ink-soft">
                <th>Code</th>
                <th>Opening</th>
                <th>Lintel</th>
                <th>Kind</th>
                <th>Padstones</th>
              </tr>
            </thead>
            <tbody>
              {r.lintels.map((L) => (
                <tr key={L.code} className="border-t border-line font-mono text-[13px]">
                  <td className="py-1.5 font-sans">{L.code}</td>
                  <td>{L.openingMm} mm</td>
                  <td>{L.lengthMm} mm</td>
                  <td>{L.kind}</td>
                  <td>{L.padstones}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      ) : (
        <p className="text-sm text-ink-soft">Add windows/doors in Joinery to build the lintel schedule.</p>
      )}
    </CalcSection>
  )
}

export function FinishesSection() {
  const g = useGeometry()
  const input = useJobStore((s) => s.finishes)
  const patch = useJobStore((s) => s.patchFinishes)
  const r = useMemo(() => calcFinishes(g, input), [g, input])
  return (
    <CalcSection id="finishes" title="Internal finishes" blurb={geomBlurb(g)} exportLabel="Export finishes PDF" onExport={() => exportFinishesPdf(jobState(), g, r)} footer={<Notes notes={r.notes} />}>
      <div className="flex flex-wrap gap-4">
        <CheckField label="Plasterboard" checked={input.plasterboard} onChange={(plasterboard) => patch({ plasterboard })} />
        <CheckField label="Skim" checked={input.skim} onChange={(skim) => patch({ skim })} />
        <CheckField label="Paint" checked={input.paint} onChange={(paint) => patch({ paint })} />
        <CheckField label="Artex" checked={input.artex} onChange={(artex) => patch({ artex })} />
        <CheckField label="Coving" checked={input.coving} onChange={(coving) => patch({ coving })} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Walls" value={formatM2(r.wallM2)} hint="Openings deducted" />
        <Stat label="Ceiling" value={formatM2(r.ceilingM2)} />
        <Stat label="PB sheets" value={String(r.pbSheets)} />
        <Stat label="Skim / compound" value={`${formatM2(r.skimM2)} · ${r.compoundBags} bags`} />
        <Stat label="Paint tins" value={String(r.paintTins)} hint={`${r.paintLitres.toFixed(1)} L`} />
        <Stat label="Coving" value={formatM(r.covingM)} />
      </div>
    </CalcSection>
  )
}

export function SkirtingSection() {
  const g = useGeometry()
  const input = useJobStore((s) => s.skirting)
  const patch = useJobStore((s) => s.patchSkirting)
  const r = useMemo(
    () => calcSkirting(g, input, g.doorCount, 826, 2040),
    [g, input],
  )
  return (
    <CalcSection id="skirting" title="Skirting & architrave" blurb={geomBlurb(g)} exportLabel="Export finishing schedule PDF" onExport={() => exportSkirtingPdf(jobState(), g, r)} footer={<Notes notes={r.notes} />}>
      <div role="radiogroup" aria-label="Skirting profile" className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {SKIRTING_PROFILES.map((p) => {
          const on = p.id === input.profile
          return (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={on}
              className={`touch-target flex flex-col items-center rounded-lg border px-2 py-2 text-xs ${
                on ? 'border-ink bg-paper font-semibold text-ink' : 'border-line text-ink-soft hover:border-ink/40'
              }`}
              onClick={() =>
                patch({
                  profile: p.id,
                  depthMm: p.typicalDepthMm,
                  architraveDepthMm: Math.max(69, p.typicalDepthMm - 50),
                })
              }
            >
              <svg viewBox="0 0 40 24" className="h-10 w-16 stroke-ink fill-none" aria-hidden>
                <path d={p.path} />
              </svg>
              {p.label}
              <span className="font-mono text-[10px] text-ink-soft">{p.typicalDepthMm} mm</span>
            </button>
          )
        })}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SelectField label="Material" value={input.material} onChange={(e) => patch({ material: e.target.value as typeof input.material })}>
          <option value="mdf">MDF (default)</option>
          <option value="pine">Pine</option>
          <option value="oak">Oak</option>
        </SelectField>
        <NumberField label="Skirting depth" unit="mm" value={input.depthMm} onChange={(e) => patch({ depthMm: Number(e.target.value) })} />
        <NumberField label="Architrave depth" unit="mm" value={input.architraveDepthMm} hint="One size down" onChange={(e) => patch({ architraveDepthMm: Number(e.target.value) })} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Skirting" value={formatM(r.skirtingM)} hint={`${r.skirtingLengths} lengths`} />
        <Stat label="Architrave" value={formatM(r.architraveM)} hint={`${r.architraveLengths} lengths`} />
      </div>
    </CalcSection>
  )
}

export function MepSection() {
  const g = useGeometry()
  const input = useJobStore((s) => s.mep)
  const patch = useJobStore((s) => s.patchMep)
  const r = useMemo(() => calcMep(g, input), [g, input])
  return (
    <CalcSection id="mep" title="Plumbing & electrics" blurb={<>{geomBlurb(g)} <strong>Guide only — not a design.</strong></>} exportLabel="Export MEP PDF" onExport={() => exportMepPdf(jobState(), g, r)} footer={<Notes notes={r.notes} />}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SelectField label="Pipe" value={input.pipeSystem} onChange={(e) => patch({ pipeSystem: e.target.value as typeof input.pipeSystem })}>
          <option value="copper">Copper + solder</option>
          <option value="hep2o">Hep2O</option>
        </SelectField>
        <NumberField label="Routing waste" unit="%" value={input.routingWastePct} onChange={(e) => patch({ routingWastePct: Number(e.target.value) })} />
        <NumberField label="Heat" unit="W/m²" value={input.wattsPerM2} onChange={(e) => patch({ wattsPerM2: Number(e.target.value) })} />
        <NumberField label="Sockets / room" value={input.socketsPerRoom} onChange={(e) => patch({ socketsPerRoom: Number(e.target.value) })} />
        <NumberField label="Lights / room" value={input.lightsPerRoom} onChange={(e) => patch({ lightsPerRoom: Number(e.target.value) })} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="H / C pipe" value={`${r.hotM.toFixed(0)} / ${r.coldM.toFixed(0)} m`} />
        <Stat label="Radiators / boiler" value={`${r.radiators} / ${r.boilerKw} kW`} />
        <Stat label="Sockets / lights" value={`${r.sockets} / ${r.lights}`} />
        <Stat label="Cable 2.5 / 1.5 / 6" value={`${r.cable25M.toFixed(0)} / ${r.cable15M.toFixed(0)} / ${r.cable6M.toFixed(0)} m`} />
        <Stat label="CU ways" value={String(r.cuWays)} />
        <Stat label="Installed range" value={`${formatGBP(r.installedLowGbp)} – ${formatGBP(r.installedHighGbp)}`} />
      </div>
    </CalcSection>
  )
}

export function PaintingSection() {
  const g = useGeometry()
  const input = useJobStore((s) => s.painting)
  const roofing = useJobStore((s) => s.roofing)
  const fascias = useJobStore((s) => s.fascias)
  const patch = useJobStore((s) => s.patchPainting)
  const r = useMemo(() => calcPainting(g, input, roofing, fascias, g.doorCount), [g, input, roofing, fascias])
  return (
    <CalcSection id="painting" title="Painting & decorating" blurb={geomBlurb(g)} exportLabel="Export painting PDF" onExport={() => exportPaintingPdf(jobState(), g, r)} footer={<Notes notes={r.notes} />}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SelectField label="Substrate" value={input.substrate} onChange={(e) => patch({ substrate: e.target.value as typeof input.substrate })}>
          <option value="new-plaster">New plaster (mist + 2)</option>
          <option value="existing-painted">Existing painted</option>
          <option value="fresh-render">Freshly rendered</option>
        </SelectField>
        <CheckField label="Woodwork" checked={input.woodwork} onChange={(woodwork) => patch({ woodwork })} />
        <CheckField label="External joinery" checked={input.externalJoinery} onChange={(externalJoinery) => patch({ externalJoinery })} />
        <CheckField label="Fascias / soffits" checked={input.externalFascias} onChange={(externalFascias) => patch({ externalFascias })} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Walls + ceilings" value={formatM2(r.wallCeilingM2)} />
        <Stat label="Woodwork" value={formatM2(r.woodworkM2)} />
        <Stat label="External" value={formatM2(r.externalM2)} />
        <Stat label="Tins" value={String(r.tins)} hint={`${r.litres.toFixed(1)} L`} />
      </div>
    </CalcSection>
  )
}

export function ExternalsSection() {
  const g = useGeometry()
  const input = useJobStore((s) => s.externals)
  const patch = useJobStore((s) => s.patchExternals)
  const r = useMemo(() => calcExternals(g, input), [g, input])
  return (
    <CalcSection id="externals" title="Externals" blurb={geomBlurb(g)} exportLabel="Export externals PDF" onExport={() => exportExternalsPdf(jobState(), g, r)} footer={<Notes notes={r.notes} />}>
      <Panel title="Drive / paths">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SelectField label="Drive finish" value={input.driveFinish} onChange={(e) => patch({ driveFinish: e.target.value as typeof input.driveFinish })}>
            <option value="brick-paving">Brick paving</option>
            <option value="concrete">Concrete</option>
            <option value="tarmac">Tarmac</option>
            <option value="resin">Resin (kit)</option>
          </SelectField>
          <NumberField label="Drive area" unit="m²" value={input.driveAreaM2} onChange={(e) => patch({ driveAreaM2: Number(e.target.value) })} />
          <NumberField label="Path area" unit="m²" value={input.pathAreaM2} onChange={(e) => patch({ pathAreaM2: Number(e.target.value) })} />
          <NumberField label="Hardcore" unit="mm" value={input.hardcoreMm} onChange={(e) => patch({ hardcoreMm: Number(e.target.value) })} />
        </div>
      </Panel>
      <Panel title="Fencing">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SelectField label="Type" value={input.fenceType} onChange={(e) => patch({ fenceType: e.target.value as typeof input.fenceType })}>
            <option value="panel">Panel</option>
            <option value="feather">Feather-edge</option>
            <option value="composite">Composite</option>
          </SelectField>
          <NumberField label="Length" unit="m" value={input.fenceLengthM} onChange={(e) => patch({ fenceLengthM: Number(e.target.value) })} />
          <NumberField label="Height" unit="mm" value={input.fenceHeightMm} hint="6 ft default" onChange={(e) => patch({ fenceHeightMm: Number(e.target.value) })} />
          <SelectField label="Posts" value={input.postFix} onChange={(e) => patch({ postFix: e.target.value as typeof input.postFix })}>
            <option value="concrete">Concrete</option>
            <option value="pu-foam">PU foam</option>
          </SelectField>
          <CheckField label="Paint / stain" checked={input.fencePaint} onChange={(fencePaint) => patch({ fencePaint })} />
        </div>
      </Panel>
      <Panel title="Drainage">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <CheckField label="Soakaway" checked={input.soakaway} onChange={(soakaway) => patch({ soakaway })} />
          <CheckField label="Soakaway regs note" checked={input.soakawayRegs} onChange={(soakawayRegs) => patch({ soakawayRegs })} />
          <NumberField label="110 mm run" unit="m" value={input.drainRunM} onChange={(e) => patch({ drainRunM: Number(e.target.value) })} />
          <CheckField label="Tie-in" checked={input.tieIn} onChange={(tieIn) => patch({ tieIn })} />
        </div>
      </Panel>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Hardcore" value={`${r.hardcoreT.toFixed(1)} t`} hint={`${r.hardcoreBags} bags`} />
        <Stat label="Paving units" value={String(r.pavingUnits)} />
        <Stat label="Fence posts / panels" value={`${r.posts} / ${r.panels}`} />
        <Stat label="Soakaway" value={formatM3(r.soakawayM3)} />
        <Stat label="Pipe + fittings" value={`${r.pipeM.toFixed(1)} m · ${r.pipeFittings}`} />
      </div>
    </CalcSection>
  )
}

export function ScaffoldSection() {
  const g = useGeometry()
  const input = useJobStore((s) => s.scaffold)
  const patch = useJobStore((s) => s.patchScaffold)
  const r = useMemo(() => calcScaffold(g, input), [g, input])
  return (
    <CalcSection id="scaffolding" title="Scaffolding" blurb={geomBlurb(g)} exportLabel="Export scaffold schedule PDF" onExport={() => exportScaffoldPdf(jobState(), g, r)} footer={<Notes notes={r.notes} />}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <NumberField label="Hire period" unit="wk" min={1} value={input.hireWeeks} onChange={(e) => patch({ hireWeeks: Number(e.target.value) })} />
        <NumberField label="Lift height" unit="mm" value={input.liftHeightMm} onChange={(e) => patch({ liftHeightMm: Number(e.target.value) })} />
        <NumberField label="Extra lifts" min={0} value={input.extraLifts} onChange={(e) => patch({ extraLifts: Number(e.target.value) })} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Height / bays / lifts" value={`${r.heightM.toFixed(2)} m · ${r.bays} · ${r.lifts}`} />
        <Stat label="Standards" value={String(r.standards)} />
        <Stat label="Ledgers / transoms" value={`${r.ledgers} / ${r.transoms}`} />
        <Stat label="Boards / toe" value={`${r.boards} / ${r.toeBoards}`} />
        <Stat label="Hire" value={formatGBP(r.hireGbp)} hint={`${r.hireWeeks} weeks`} />
      </div>
    </CalcSection>
  )
}

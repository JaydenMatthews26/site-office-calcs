import { useMemo } from 'react'
import { calcStructure } from '../../calc/structure'
import { formatM, formatM2, formatM3 } from '../../calc/units'
import { useGeometry } from '../../hooks/useGeometry'
import { exportStructurePdf } from '../../pdf/exportTakeoff'
import { useJobStore } from '../../store/useJobStore'
import { CalcSection } from '../section/CalcSection'
import { CheckField, Notes, NumberField, Panel, SelectField, Stat } from '../ui/Fields'
import { geomBlurb, jobState } from './geom'

export function StructureSection() {
  const g = useGeometry()
  const structure = useJobStore((s) => s.structure)
  const joinery = useJobStore((s) => s.joinery)
  const patch = useJobStore((s) => s.patchStructure)
  const r = useMemo(() => calcStructure(g, structure, joinery), [g, structure, joinery])
  const masonry = structure.frame === 'masonry'

  return (
    <CalcSection
      id="structure"
      title="Building structure"
      blurb={geomBlurb(g)}
      exportLabel="Export structure PDF"
      onExport={() => exportStructurePdf(jobState(), g, r)}
      footer={<Notes notes={r.notes} />}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SelectField
          label="Frame"
          value={structure.frame}
          onChange={(e) => patch({ frame: e.target.value as typeof structure.frame })}
        >
          <option value="masonry">Masonry</option>
          <option value="timber">Timber frame</option>
        </SelectField>
        {masonry ? (
          <>
            <SelectField
              label="Inner skin"
              value={structure.innerSkin}
              onChange={(e) => patch({ innerSkin: e.target.value as typeof structure.innerSkin })}
            >
              <option value="lightweight-block">Lightweight block</option>
              <option value="dense-block">Dense block</option>
              <option value="brick">Brick</option>
            </SelectField>
            <SelectField
              label="Outer skin"
              value={structure.outerSkin}
              onChange={(e) => patch({ outerSkin: e.target.value as typeof structure.outerSkin })}
            >
              <option value="brick">Brick (no render)</option>
              <option value="block">Block (render)</option>
            </SelectField>
            <CheckField
              label="Inner skin on"
              checked={structure.innerSkinEnabled}
              onChange={(innerSkinEnabled) => patch({ innerSkinEnabled })}
            />
            <CheckField
              label="Outer skin on"
              checked={structure.outerSkinEnabled}
              onChange={(outerSkinEnabled) => patch({ outerSkinEnabled })}
            />
          </>
        ) : (
          <SelectField
            label="Timber outer skin"
            value={structure.timberOuter}
            onChange={(e) => patch({ timberOuter: e.target.value as typeof structure.timberOuter })}
          >
            <option value="cladding">Cladding</option>
            <option value="render">Render</option>
            <option value="brick-slips">Brick slips</option>
            <option value="steel-brick">Steel frame + brick (SE)</option>
          </SelectField>
        )}
        {(structure.outerSkin === 'block' && masonry) ||
        (!masonry && (structure.timberOuter === 'render' || structure.timberOuter === 'cladding')) ? (
          <>
            <SelectField
              label="Render"
              value={structure.renderKind}
              onChange={(e) => patch({ renderKind: e.target.value as typeof structure.renderKind })}
            >
              <option value="sand-cement">Sand-cement</option>
              <option value="k-rend">K-rend</option>
            </SelectField>
            <NumberField
              label="Render thickness"
              unit="mm"
              value={structure.renderThicknessMm}
              onChange={(e) => patch({ renderThicknessMm: Number(e.target.value) })}
            />
          </>
        ) : null}
        <NumberField
          label="Cavity"
          unit="mm"
          value={structure.cavityMm}
          onChange={(e) => patch({ cavityMm: Number(e.target.value) })}
        />
        <NumberField
          label="Waste"
          unit="%"
          value={structure.wastePct}
          onChange={(e) => patch({ wastePct: Number(e.target.value) })}
        />
      </div>

      {r.seFlag ? (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-warn">
          Steel frame with brick facing needs a structural engineer’s sign-off.
        </p>
      ) : null}

      <Panel title="Take-off">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Gross elevation" value={formatM2(r.grossElevationM2)} />
          <Stat label="Net elevation" value={formatM2(r.netElevationM2)} hint="Openings deducted" />
          <Stat label="Inner units" value={String(r.innerUnits)} />
          <Stat label="Outer units" value={String(r.outerUnits)} />
          <Stat label="Mortar" value={formatM3(r.mortarM3)} />
          <Stat label="Wall ties" value={String(r.wallTies)} hint={`${structure.wallTiesPerM2} / m²`} />
          {r.renderM2 > 0 ? <Stat label="Render" value={formatM2(r.renderM2)} hint={formatM3(r.renderM3)} /> : null}
          {r.timberStuds > 0 ? (
            <>
              <Stat label="Studs" value={String(r.timberStuds)} />
              <Stat label="Plates" value={formatM(r.timberPlatesM)} />
              <Stat label="Sheathing" value={formatM2(r.sheathingM2)} />
            </>
          ) : null}
          {r.brickSlips > 0 ? <Stat label="Brick slips" value={String(r.brickSlips)} /> : null}
          {r.claddingM2 > 0 ? <Stat label="Cladding" value={formatM2(r.claddingM2)} /> : null}
        </div>
      </Panel>
    </CalcSection>
  )
}

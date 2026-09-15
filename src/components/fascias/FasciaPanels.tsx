import {
  boardLengthForMaterial,
  GUTTER_MATERIAL_PRESETS,
  PVCU_COLOURS,
  type FasciasResult,
} from '../../calc/fascias'
import { formatGBP, formatM, formatM2 } from '../../calc/units'
import { useJobStore } from '../../store/useJobStore'
import type { FasciaMaterial, GutterMaterial } from '../../types/job'
import { ColorField, NumberField, Panel, SelectField, Stat } from '../ui/Fields'

export function FasciaSoffitPanel({ result }: { result: FasciasResult }) {
  const fascias = useJobStore((s) => s.fascias)
  const patchFascias = useJobStore((s) => s.patchFascias)
  const timber = fascias.material === 'timber'

  return (
    <Panel title="Fascia & soffit">
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SelectField
          label="Material"
          value={fascias.material}
          onChange={(e) => {
            const material = e.target.value as FasciaMaterial
            patchFascias({ material, boardLengthM: boardLengthForMaterial(material) })
          }}
        >
          <option value="pvcu">PVCU</option>
          <option value="timber">Timber</option>
        </SelectField>
        {!timber ? (
          <SelectField
            label="PVCU colour"
            value={fascias.pvcuColour}
            onChange={(e) => patchFascias({ pvcuColour: e.target.value })}
          >
            {PVCU_COLOURS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </SelectField>
        ) : null}
        <NumberField
          label="Fascia depth"
          unit="mm"
          min={100}
          max={300}
          step={25}
          value={fascias.fasciaDepthMm}
          onChange={(e) => patchFascias({ fasciaDepthMm: Number(e.target.value) })}
        />
        <NumberField
          label="Soffit width"
          unit="mm"
          min={0}
          step={25}
          value={result.soffitWidthMm}
          hint="Defaults to roofing eaves overhang"
          onChange={(e) => patchFascias({ soffitWidthOverrideMm: Number(e.target.value) })}
        />
        <NumberField
          label="Soffit board width"
          unit="mm"
          min={100}
          step={50}
          value={fascias.soffitBoardWidthMm}
          onChange={(e) => patchFascias({ soffitBoardWidthMm: Number(e.target.value) })}
        />
        <NumberField
          label="Board length"
          unit="m"
          min={1}
          step={0.1}
          value={fascias.boardLengthM}
          hint={timber ? 'Timber PAR typically 5.1 m' : 'PVCU typically 5.0 m'}
          onChange={(e) => patchFascias({ boardLengthM: Number(e.target.value) })}
        />
        <NumberField
          label="Waste"
          unit="%"
          min={0}
          max={30}
          value={fascias.wastePct}
          onChange={(e) => patchFascias({ wastePct: Number(e.target.value) })}
        />
        <label className="flex min-h-11 items-center gap-3 pb-2 text-sm">
          <input
            type="checkbox"
            className="check-lg accent-accent"
            checked={fascias.includeBargeboards}
            onChange={(e) => patchFascias({ includeBargeboards: e.target.checked })}
          />
          Include bargeboards (gables)
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Fascia" value={formatM(result.fasciaLinearM)} hint={`${result.fasciaBoards} boards`} />
        <Stat
          label="Soffit"
          value={formatM2(result.soffitAreaM2)}
          hint={`${result.soffitBoards} boards · ${result.soffitBoardsAcross} across`}
        />
        <Stat
          label="Bargeboards"
          value={result.bargeLinearM > 0 ? formatM(result.bargeLinearM) : 'None'}
          hint={result.bargeLinearM > 0 ? `${result.bargeBoards} boards` : 'Hip roofs have no verges'}
        />
        <Stat
          label="Boards + waste"
          value={`${result.fasciaBoards + result.soffitBoards + result.bargeBoards}`}
          hint={`${result.wastePct}% waste · ${fascias.boardLengthM} m lengths`}
        />
      </div>

      {timber ? (
        <div className="mt-4 rounded-lg border border-line bg-paper p-3">
          <p className="text-[11px] font-medium uppercase tracking-wider text-ink-soft">
            Timber paint
          </p>
          <p className="mt-1 text-xs text-ink-soft">
            Face area from linear metres × fascia depth, plus soffit underside (run × width). Coverage
            is m² per litre; tins round up.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <ColorField
              label="Paint colour"
              value={fascias.paintColour}
              onChange={(hex) => patchFascias({ paintColour: hex })}
            />
            <NumberField
              label="Coverage"
              unit="m²/L"
              min={4}
              max={20}
              step={0.5}
              value={fascias.paintCoverageM2PerL}
              hint="One coat, typical exterior wood ~12"
              onChange={(e) => patchFascias({ paintCoverageM2PerL: Number(e.target.value) })}
            />
            <NumberField
              label="Coats"
              min={1}
              max={4}
              value={fascias.paintCoats}
              onChange={(e) => patchFascias({ paintCoats: Number(e.target.value) })}
            />
            <NumberField
              label="Tin size"
              unit="L"
              min={0.75}
              step={0.25}
              value={fascias.paintTinL}
              onChange={(e) => patchFascias({ paintTinL: Number(e.target.value) })}
            />
          </div>
          {result.paint ? (
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat
                label="Area / coat"
                value={formatM2(result.paint.areaPerCoatM2)}
                hint={`Fascia ${formatM2(result.paint.fasciaFaceM2)} · soffit ${formatM2(result.paint.soffitUndersideM2)}`}
              />
              <Stat label="Total (all coats)" value={formatM2(result.paint.totalAreaM2)} />
              <Stat label="Litres" value={`${result.paint.litres.toFixed(2)} L`} />
              <Stat
                label="Tins"
                value={`${result.paint.tins} × ${result.paint.tinL} L`}
                hint={formatGBP(result.paint.indicativeCostGbp)}
              />
            </div>
          ) : null}
        </div>
      ) : (
        <p className="mt-3 text-xs text-ink-soft">
          PVCU needs no paint in this take-off. Switch to timber to size exterior wood finish from
          linear metres.
        </p>
      )}
    </Panel>
  )
}

export function GutteringPanel({ result }: { result: FasciasResult }) {
  const fascias = useJobStore((s) => s.fascias)
  const patchFascias = useJobStore((s) => s.patchFascias)

  return (
    <Panel title="Guttering">
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SelectField
          label="Material"
          value={fascias.gutterMaterial}
          onChange={(e) => {
            const gutterMaterial = e.target.value as GutterMaterial
            const preset = GUTTER_MATERIAL_PRESETS.find((p) => p.id === gutterMaterial)
            patchFascias({
              gutterMaterial,
              gutterPieceLengthM: preset?.gutterPieceLengthM ?? fascias.gutterPieceLengthM,
              downpipePieceLengthM: preset?.downpipePieceLengthM ?? fascias.downpipePieceLengthM,
            })
          }}
        >
          {GUTTER_MATERIAL_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </SelectField>
        <NumberField
          label="Property width"
          unit="m"
          min={0}
          step={0.1}
          value={Number((result.propertyWidthMm / 1000).toFixed(2))}
          hint={`From plan ${formatM(result.propertyWidthFromPlanMm / 1000)}`}
          onChange={(e) => {
            const v = Number(e.target.value)
            patchFascias({ propertyWidthOverrideMm: Number.isFinite(v) ? v * 1000 : null })
          }}
        />
        <NumberField
          label="Eaves height"
          unit="mm"
          min={0}
          step={50}
          value={result.eavesHeightMm}
          hint={`Storey height from plan ${result.eavesHeightFromPlanMm} mm`}
          onChange={(e) => patchFascias({ eavesHeightOverrideMm: Number(e.target.value) })}
        />
        <NumberField
          label="Gutter run"
          unit="m"
          min={0}
          step={0.1}
          value={Number(result.gutterLinearM.toFixed(2))}
          hint="Defaults to eaves run (gable: 2 × property width)"
          onChange={(e) => {
            const v = Number(e.target.value)
            patchFascias({ gutterRunOverrideMm: Number.isFinite(v) ? v * 1000 : null })
          }}
        />
        <NumberField
          label="Outlets"
          min={0}
          value={result.outlets}
          hint="max(runs, ceil(roof m² / 50))"
          onChange={(e) => patchFascias({ outletsOverride: Number(e.target.value) })}
        />
        <NumberField
          label="Elbows"
          min={0}
          value={result.elbows}
          hint="Default 2 per outlet (eaves offset)"
          onChange={(e) => patchFascias({ elbowsOverride: Number(e.target.value) })}
        />
        <NumberField
          label="Downpipe length"
          unit="mm"
          min={0}
          step={50}
          value={result.downpipeLengthPerOutletMm}
          hint="Per outlet — defaults to eaves height"
          onChange={(e) => patchFascias({ downpipeLengthOverrideMm: Number(e.target.value) })}
        />
        <NumberField
          label="Gutter length as sold"
          unit="m"
          min={1}
          step={0.1}
          value={fascias.gutterPieceLengthM}
          onChange={(e) => patchFascias({ gutterPieceLengthM: Number(e.target.value) })}
        />
        <NumberField
          label="Downpipe length as sold"
          unit="m"
          min={1}
          step={0.1}
          value={fascias.downpipePieceLengthM}
          onChange={(e) => patchFascias({ downpipePieceLengthM: Number(e.target.value) })}
        />
        <NumberField
          label="Bracket centres"
          unit="mm"
          min={400}
          step={50}
          value={fascias.gutterBracketCentresMm}
          onChange={(e) => patchFascias({ gutterBracketCentresMm: Number(e.target.value) })}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Gutter" value={formatM(result.gutterLinearM)} hint={`${result.gutterPieces} lengths · ${result.gutterRuns} runs`} />
        <Stat label="Unions / stops" value={`${result.gutterUnions} / ${result.gutterStopEnds}`} />
        <Stat label="Brackets" value={String(result.gutterBrackets)} hint={`${fascias.gutterBracketCentresMm} mm centres`} />
        <Stat
          label="Downpipe"
          value={formatM(result.downpipeTotalM)}
          hint={`${result.outlets} outlets · ${result.elbows} elbows · ${result.downpipePieces} lengths`}
        />
        <Stat label="Indicative guttering" value={formatGBP(result.gutterCostGbp)} hint="Supply only" />
      </div>
    </Panel>
  )
}

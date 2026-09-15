import { TILE_PRESETS, type CoveringResult } from '../../calc/roofCoverings'
import { formatM, formatM2 } from '../../calc/units'
import { useJobStore } from '../../store/useJobStore'
import { NumberField, Panel, SelectField, Stat } from '../ui/Fields'

export function CoveringsPanel({ result }: { result: CoveringResult }) {
  const covering = useJobStore((s) => s.roofing.covering)
  const patchCovering = useJobStore((s) => s.patchCovering)

  return (
    <Panel title="Roof coverings">
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SelectField
          label="Covering preset"
          value=""
          onChange={(e) => {
            const preset = TILE_PRESETS.find((p) => p.id === e.target.value)
            if (preset) patchCovering(preset.patch)
          }}
        >
          <option value="">Custom / keep current</option>
          {TILE_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Type"
          value={covering.type}
          onChange={(e) => patchCovering({ type: e.target.value as 'tile' | 'slate' })}
        >
          <option value="tile">Tile (single lap)</option>
          <option value="slate">Slate (double lap)</option>
        </SelectField>
        <NumberField
          label="Tile / slate length"
          unit="mm"
          value={covering.tileLengthMm}
          onChange={(e) => patchCovering({ tileLengthMm: Number(e.target.value) })}
        />
        <NumberField
          label="Tile / slate width"
          unit="mm"
          value={covering.tileWidthMm}
          onChange={(e) => patchCovering({ tileWidthMm: Number(e.target.value) })}
        />
        <NumberField
          label="Headlap"
          unit="mm"
          value={covering.headlapMm}
          onChange={(e) => patchCovering({ headlapMm: Number(e.target.value) })}
        />
        <NumberField
          label="Sidelap"
          unit="mm"
          value={covering.sidelapMm}
          onChange={(e) => patchCovering({ sidelapMm: Number(e.target.value) })}
        />
        <SelectField
          label="Felt"
          value={covering.felt}
          onChange={(e) => patchCovering({ felt: e.target.value as 'bitumen' | 'breathable' })}
        >
          <option value="breathable">Breathable membrane</option>
          <option value="bitumen">Bitumen (1F type)</option>
        </SelectField>
        <NumberField
          label="Extra valley length"
          unit="mm"
          value={covering.extraValleyMm}
          hint="L-shape / valleys not implied by a rectangle"
          onChange={(e) => patchCovering({ extraValleyMm: Number(e.target.value) })}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Gauge" value={`${result.gaugeMm.toFixed(0)} mm`} hint={covering.type === 'slate' ? '(L − headlap) / 2' : 'L − headlap'} />
        <Stat
          label={covering.type === 'slate' ? 'Slates' : 'Tiles'}
          value={String(result.tilesRequired)}
        />
        <Stat
          label="Battens +20%"
          value={`${result.battenLinearWithWasteM.toFixed(1)} m`}
          hint={`${result.battenBundles} bundles · 10 / bundle`}
        />
        <Stat label="Felt rolls" value={`${result.feltRolls}`} hint={result.feltRollSpec} />
        <Stat label="Ridge tiles" value={String(result.ridgeTiles)} />
        <Stat label="Hip tiles" value={String(result.hipTiles)} />
        <Stat label="Verge" value={formatM(result.vergeM)} />
        <Stat label="Valley" value={formatM(result.valleyM)} />
        <Stat label="Net cover" value={formatM2(result.netCoverM2)} hint="Main + dormers − rooflights" />
      </div>

      <div className="mt-4 rounded-lg border border-line p-3">
        <p className="text-[11px] font-medium uppercase tracking-wider text-ink-soft">Dormers, rooflights & snow guards</p>
        <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <NumberField
            label="Dormers"
            min={0}
            value={covering.dormers}
            hint="Gable-front extras"
            onChange={(e) => patchCovering({ dormers: Number(e.target.value) })}
          />
          <NumberField
            label="Dormer width"
            unit="mm"
            value={covering.dormerWidthMm}
            onChange={(e) => patchCovering({ dormerWidthMm: Number(e.target.value) })}
          />
          <NumberField
            label="Cheek height"
            unit="mm"
            value={covering.dormerCheekHeightMm}
            onChange={(e) => patchCovering({ dormerCheekHeightMm: Number(e.target.value) })}
          />
          <NumberField
            label="Roof depth"
            unit="mm"
            value={covering.dormerRoofDepthMm}
            hint="Projection from main slope"
            onChange={(e) => patchCovering({ dormerRoofDepthMm: Number(e.target.value) })}
          />
          <NumberField
            label="Rooflights"
            min={0}
            value={covering.rooflights}
            onChange={(e) => patchCovering({ rooflights: Number(e.target.value) })}
          />
          <NumberField
            label="Rooflight width"
            unit="mm"
            value={covering.rooflightWidthMm}
            onChange={(e) => patchCovering({ rooflightWidthMm: Number(e.target.value) })}
          />
          <NumberField
            label="Rooflight height"
            unit="mm"
            value={covering.rooflightHeightMm}
            onChange={(e) => patchCovering({ rooflightHeightMm: Number(e.target.value) })}
          />
          <label className="flex min-h-11 items-center gap-3 pb-2 text-sm">
            <input
              type="checkbox"
              className="check-lg accent-accent"
              checked={covering.snowGuards}
              onChange={(e) => patchCovering({ snowGuards: e.target.checked })}
            />
            Snow guards
          </label>
          {covering.snowGuards ? (
            <>
              <NumberField
                label="Snow-guard rows"
                min={1}
                max={3}
                value={covering.snowGuardRows}
                hint="Typical 1–2"
                onChange={(e) => patchCovering({ snowGuardRows: Number(e.target.value) })}
              />
              <NumberField
                label="Snow-guard run"
                unit="mm"
                value={covering.snowGuardLengthOverrideMm ?? 0}
                hint="0 = eaves length"
                onChange={(e) => {
                  const v = Number(e.target.value)
                  patchCovering({ snowGuardLengthOverrideMm: v > 0 ? v : null })
                }}
              />
            </>
          ) : null}
        </div>
        {(covering.dormers > 0 || covering.rooflights > 0 || covering.snowGuards) && (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {covering.dormers > 0 ? (
              <>
                <Stat label="Dormer roof / cheeks" value={`${formatM2(result.dormerSlopeM2)} / ${formatM2(result.dormerCheekM2)}`} />
                <Stat label="Dormer valley / verge" value={`${formatM(result.dormerValleyM)} / ${formatM(result.dormerVergeM)}`} />
              </>
            ) : null}
            {covering.rooflights > 0 ? (
              <Stat
                label="Rooflight deduct"
                value={formatM2(result.rooflightDeductM2)}
                hint={`${result.rooflightFlashings} flashing kit(s)`}
              />
            ) : null}
            {covering.snowGuards ? (
              <Stat label="Snow guards" value={formatM(result.snowGuardM)} hint={`${result.snowGuardClips} clips`} />
            ) : null}
          </div>
        )}
        <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-ink-soft">
          {result.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      </div>
    </Panel>
  )
}

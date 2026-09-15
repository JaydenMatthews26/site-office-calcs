import { TILE_PRESETS, type CoveringResult } from '../../calc/roofCoverings'
import { formatM } from '../../calc/units'
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
      </div>

      <div className="mt-4 rounded-lg border border-dashed border-line p-3">
        <p className="text-[11px] font-medium uppercase tracking-wider text-ink-soft">Advanced (stubs)</p>
        <div className="mt-2 grid gap-3 sm:grid-cols-3">
          <NumberField
            label="Dormers"
            min={0}
            value={covering.dormers}
            onChange={(e) => patchCovering({ dormers: Number(e.target.value) })}
          />
          <NumberField
            label="Rooflights"
            min={0}
            value={covering.rooflights}
            onChange={(e) => patchCovering({ rooflights: Number(e.target.value) })}
          />
          <label className="flex items-end gap-2 pb-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 accent-accent"
              checked={covering.snowGuards}
              onChange={(e) => patchCovering({ snowGuards: e.target.checked })}
            />
            Snow guards
          </label>
        </div>
        <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-ink-soft">
          {result.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      </div>
    </Panel>
  )
}

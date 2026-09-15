import { useEffect, useMemo } from 'react'
import { calcJoinery, syncJoineryFromGeometry } from '../../calc/joinery'
import { formatM2 } from '../../calc/units'
import { useGeometry } from '../../hooks/useGeometry'
import { exportJoineryPdf } from '../../pdf/exportTakeoff'
import { useJobStore } from '../../store/useJobStore'
import { emptyJoineryItem, type GlazingKind, type JoineryStorey } from '../../types/modules'
import { CalcSection } from '../section/CalcSection'
import { NumberField, Panel, SelectField, Stat } from '../ui/Fields'
import { geomBlurb, jobState } from './geom'

function readPhoto(file: File, cb: (url: string) => void) {
  const reader = new FileReader()
  reader.onload = () => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const w = Math.min(480, img.width)
      const h = (img.height * w) / img.width
      canvas.width = w
      canvas.height = h
      canvas.getContext('2d')?.drawImage(img, 0, 0, w, h)
      cb(canvas.toDataURL('image/jpeg', 0.62))
    }
    img.src = String(reader.result)
  }
  reader.readAsDataURL(file)
}

export function JoinerySection() {
  const g = useGeometry()
  const plan = useJobStore((s) => s.plan)
  const manual = useJobStore((s) => s.manual)
  const joinery = useJobStore((s) => s.joinery)
  const setJoineryItems = useJobStore((s) => s.setJoineryItems)
  const patchItem = useJobStore((s) => s.patchJoineryItem)
  const addItem = useJobStore((s) => s.addJoineryItem)
  const removeItem = useJobStore((s) => s.removeJoineryItem)
  const sizes = useMemo(
    () => ({
      doorWidthMm: manual.doorWidthMm,
      doorHeightMm: manual.doorHeightMm,
      windowWidthMm: manual.windowWidthMm,
      windowHeightMm: manual.windowHeightMm,
    }),
    [manual.doorWidthMm, manual.doorHeightMm, manual.windowWidthMm, manual.windowHeightMm],
  )
  const r = useMemo(() => calcJoinery(plan, g, joinery, sizes), [plan, g, joinery, sizes])

  useEffect(() => {
    if (joinery.items.length > 0) return
    const seeded = syncJoineryFromGeometry(plan, g, sizes)
    if (seeded.length) setJoineryItems(seeded)
  }, [joinery.items.length, plan, g, setJoineryItems, sizes])

  const items = joinery.items.length > 0 ? joinery.items : r.items

  return (
    <CalcSection
      id="windows-doors"
      title="Windows & doors"
      blurb={geomBlurb(g)}
      exportLabel="Export window schedule PDF"
      onExport={() =>
        exportJoineryPdf(jobState(), g, { ...r, items: joinery.items.length > 0 ? joinery.items : r.items })
      }
    >
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="touch-target rounded-md border border-line px-3 text-sm"
          onClick={() => setJoineryItems(syncJoineryFromGeometry(plan, g, sizes))}
        >
          {g.source === 'manual' ? 'Sync from measurements' : 'Sync from plan'}
        </button>
        <button
          type="button"
          className="touch-target rounded-md border border-line px-3 text-sm"
          onClick={() => addItem(emptyJoineryItem('window', 'gf', `WG${items.length + 1}`))}
        >
          Add GF window
        </button>
        <button
          type="button"
          className="touch-target rounded-md border border-line px-3 text-sm"
          onClick={() => addItem(emptyJoineryItem('door', 'gf', `FD${items.length + 1}`))}
        >
          Add GF door
        </button>
        <button
          type="button"
          className="touch-target rounded-md border border-line px-3 text-sm"
          onClick={() => addItem(emptyJoineryItem('window', 'ff', `FW${items.length + 1}`))}
        >
          Add FF window
        </button>
        <button
          type="button"
          className="touch-target rounded-md border border-line px-3 text-sm"
          onClick={() => addItem(emptyJoineryItem('rooflight', 'roof', `RL${items.length + 1}`))}
        >
          Add rooflight
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="GF windows" value={String(r.gfWindows)} />
        <Stat label="GF doors" value={String(r.gfDoors)} />
        <Stat label="FF windows" value={String(r.ffWindows)} />
        <Stat label="Rooflights" value={String(r.rooflights)} />
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-ink-soft">Sync from the plan or add openings. Numbered WG1, FD1, FW1, RL1…</p>
      ) : (
        items.map((it) => (
          <Panel key={it.id} title={`${it.code} · ${it.kind}`}>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <NumberField
                label="Width"
                unit="mm"
                value={it.widthMm}
                onChange={(e) => patchItem(it.id, { widthMm: Number(e.target.value) })}
              />
              <NumberField
                label="Height"
                unit="mm"
                value={it.heightMm}
                onChange={(e) => patchItem(it.id, { heightMm: Number(e.target.value) })}
              />
              <NumberField
                label="Openings"
                min={1}
                value={it.openings}
                onChange={(e) => patchItem(it.id, { openings: Number(e.target.value) })}
              />
              <NumberField
                label="Panes"
                min={1}
                value={it.panes}
                onChange={(e) => patchItem(it.id, { panes: Number(e.target.value) })}
              />
              <SelectField
                label="Glazing"
                value={it.glazing}
                onChange={(e) => patchItem(it.id, { glazing: e.target.value as GlazingKind })}
              >
                <option value="double">Double</option>
                <option value="triple">Triple</option>
                <option value="integral-blinds">Integral blinds</option>
              </SelectField>
              <SelectField
                label="Storey"
                value={it.storey}
                onChange={(e) => patchItem(it.id, { storey: e.target.value as JoineryStorey })}
              >
                <option value="gf">Ground</option>
                <option value="ff">First</option>
                <option value="roof">Roof</option>
              </SelectField>
              <NumberField
                label="Sill"
                unit="mm"
                value={it.sillWidthMm}
                onChange={(e) => patchItem(it.id, { sillWidthMm: Number(e.target.value) })}
              />
              <NumberField
                label="Sub-sill"
                unit="mm"
                value={it.subSillWidthMm}
                onChange={(e) => patchItem(it.id, { subSillWidthMm: Number(e.target.value) })}
              />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <label className="text-sm">
                Photo of opening
                <input
                  type="file"
                  accept="image/*"
                  className="ml-2 text-xs"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) readPhoto(file, (photoDataUrl) => patchItem(it.id, { photoDataUrl }))
                  }}
                />
              </label>
              {it.photoDataUrl ? (
                <>
                  <img src={it.photoDataUrl} alt={`${it.code} opening`} className="h-16 w-20 rounded object-cover" />
                  <button
                    type="button"
                    className="text-sm text-ink-soft"
                    onClick={() => patchItem(it.id, { photoDataUrl: null })}
                  >
                    Remove photo
                  </button>
                </>
              ) : null}
              <JoineryPreview item={it} />
              <button type="button" className="text-sm text-accent" onClick={() => removeItem(it.id)}>
                Remove
              </button>
            </div>
          </Panel>
        ))
      )}
      <p className="text-xs text-ink-soft">Schedule area {formatM2(r.totalAreaM2)}. PDF draws a 2D mock-up per item.</p>
    </CalcSection>
  )
}

function JoineryPreview({
  item,
}: {
  item: { widthMm: number; heightMm: number; panes: number; sillWidthMm: number; subSillWidthMm: number }
}) {
  const cols = Math.max(1, Math.min(item.panes, 3))
  const rows = Math.max(1, Math.ceil(item.panes / cols))
  const sill = item.sillWidthMm > 0
  const sub = item.subSillWidthMm > 0
  return (
    <svg viewBox="0 0 80 62" className="h-14 w-20 stroke-ink fill-none" aria-hidden>
      <rect x="2" y="2" width="76" height="44" strokeWidth="2" />
      {Array.from({ length: cols - 1 }, (_, i) => (
        <line key={`c${i}`} x1={((i + 1) * 76) / cols + 2} y1="2" x2={((i + 1) * 76) / cols + 2} y2="46" />
      ))}
      {Array.from({ length: rows - 1 }, (_, i) => (
        <line key={`r${i}`} x1="2" y1={((i + 1) * 44) / rows + 2} x2="78" y2={((i + 1) * 44) / rows + 2} />
      ))}
      {sill ? <rect x="0" y="46" width="80" height="7" strokeWidth="1.5" /> : null}
      {sub ? <rect x="4" y="53" width="72" height="6" strokeWidth="1" /> : null}
    </svg>
  )
}

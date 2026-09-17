import { useEffect, useState } from 'react'
import { parseLengthMm } from '../../calc/units'
import { wallLengthMm } from '../../geometry/derive'
import { applyTypedLength, lengthOrigin, MIN_WALL_LEN_MM } from '../../geometry/planEdit'
import type { DrawTool } from '../../types/job'
import { DEFAULT_OUTER_SKIN } from '../../types/job'
import { useJobStore } from '../../store/useJobStore'

const TOOLS: { id: DrawTool; label: string; short: string; hint: string }[] = [
  { id: 'select', label: 'Select', short: 'Select', hint: 'Tap a wall or opening' },
  { id: 'pan', label: 'Pan', short: 'Pan', hint: 'Drag the sheet' },
  { id: 'rect', label: 'Rectangle', short: 'Rect', hint: 'Drag a building outline' },
  { id: 'external', label: 'External wall', short: 'Wall', hint: 'Drag; snaps square' },
  { id: 'partition', label: 'Partition', short: 'Part.', hint: 'Internal wall — snaps to walls, no crossing' },
  { id: 'door', label: 'Doorway', short: 'Door', hint: 'Tap a wall' },
  { id: 'opening', label: 'Opening', short: 'Open', hint: 'Window / hole' },
]

export function PlanToolbar({
  tool,
  onTool,
  selectedWallId,
  selectedOpeningId,
  onClearSelection,
}: {
  tool: DrawTool
  onTool: (t: DrawTool) => void
  selectedWallId: string | null
  selectedOpeningId: string | null
  onClearSelection: () => void
}) {
  const insertSampleBuilding = useJobStore((s) => s.insertSampleBuilding)
  const clearPlan = useJobStore((s) => s.clearPlan)
  const deleteWall = useJobStore((s) => s.deleteWall)
  const deleteOpening = useJobStore((s) => s.deleteOpening)
  const undo = useJobStore((s) => s.undo)
  const redo = useJobStore((s) => s.redo)
  const past = useJobStore((s) => s.past)
  const future = useJobStore((s) => s.future)
  const storeys = useJobStore((s) => s.plan.storeys)
  const setStoreys = useJobStore((s) => s.setStoreys)
  const storeyHeightMm = useJobStore((s) => s.plan.storeyHeightMm)
  const setStoreyHeight = useJobStore((s) => s.setStoreyHeight)
  const outerSkin = useJobStore((s) => s.plan.outerSkin ?? DEFAULT_OUTER_SKIN)
  const setOuterSkin = useJobStore((s) => s.setOuterSkin)
  const walls = useJobStore((s) => s.plan.walls)
  const updateWall = useJobStore((s) => s.updateWall)
  const selectedWall = selectedWallId ? (walls.find((w) => w.id === selectedWallId) ?? null) : null
  const [lengthText, setLengthText] = useState('')
  const [lengthFrom, setLengthFrom] = useState<'a' | 'b'>('a')
  const [lengthInvalid, setLengthInvalid] = useState(false)

  useEffect(() => {
    if (!selectedWall || selectedWall.kind !== 'partition') {
      setLengthText('')
      setLengthInvalid(false)
      return
    }
    setLengthFrom(lengthOrigin(selectedWall, walls))
    setLengthText(String(Math.round(wallLengthMm(selectedWall))))
    setLengthInvalid(false)
  }, [selectedWallId])

  const applySelectedLength = () => {
    if (!selectedWall || selectedWall.kind !== 'partition') return
    const mm = parseLengthMm(lengthText)
    if (mm === null || mm < MIN_WALL_LEN_MM) {
      setLengthInvalid(true)
      return
    }
    const origin =
      lengthFrom === 'a'
        ? { x: selectedWall.x1, y: selectedWall.y1 }
        : { x: selectedWall.x2, y: selectedWall.y2 }
    const other =
      lengthFrom === 'a'
        ? { x: selectedWall.x2, y: selectedWall.y2 }
        : { x: selectedWall.x1, y: selectedWall.y1 }
    const prepared = applyTypedLength(
      origin,
      { x: other.x - origin.x, y: other.y - origin.y },
      mm,
      walls,
      new Set([selectedWall.id]),
    )
    if (prepared.blocked) {
      setLengthInvalid(true)
      return
    }
    if (lengthFrom === 'a') updateWall(selectedWall.id, { x2: prepared.b.x, y2: prepared.b.y }, true)
    else updateWall(selectedWall.id, { x1: prepared.b.x, y1: prepared.b.y }, true)
    setLengthInvalid(false)
    setLengthText(String(Math.round(prepared.lengthMm)))
  }

  return (
    <div className="no-print flex flex-col gap-1.5 border-b border-line bg-card px-3 py-1.5 md:px-4 md:py-2 lg:flex-row lg:items-center lg:flex-wrap">
      <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-0.5 [scrollbar-width:thin]">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            type="button"
            title={t.hint}
            aria-pressed={tool === t.id}
            onClick={() => onTool(t.id)}
            className={`touch-target shrink-0 rounded-md px-3 text-sm font-medium ${
              tool === t.id
                ? 'bg-ink text-paper ring-2 ring-accent ring-offset-1 ring-offset-card'
                : 'border border-line bg-paper text-ink hover:border-ink'
            }`}
          >
            <span className="sm:hidden">{t.short}</span>
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>
      <div className="-mx-1 flex gap-1 overflow-x-auto px-1 [scrollbar-width:thin]">
        <button
          type="button"
          onClick={insertSampleBuilding}
          className="touch-target shrink-0 rounded-md border border-line px-3 text-sm hover:border-accent"
        >
          Insert 8 × 6 m sample
        </button>
        <button
          type="button"
          onClick={undo}
          disabled={past.length === 0}
          className="touch-target shrink-0 rounded-md border border-line px-3 text-sm disabled:opacity-40"
        >
          Undo
        </button>
        <button
          type="button"
          onClick={redo}
          disabled={future.length === 0}
          className="touch-target shrink-0 rounded-md border border-line px-3 text-sm disabled:opacity-40"
        >
          Redo
        </button>
        <button
          type="button"
          onClick={() => setOuterSkin({ enabled: !outerSkin.enabled })}
          aria-pressed={outerSkin.enabled}
          title="Offset an outer masonry skin outside the drawn inner/loadbearing line, across the cavity"
          className={`touch-target shrink-0 rounded-md px-3 text-sm ${
            outerSkin.enabled
              ? 'bg-ink text-paper ring-2 ring-accent ring-offset-1 ring-offset-card'
              : 'border border-line hover:border-accent'
          }`}
        >
          <span className="sm:hidden">{outerSkin.enabled ? 'Clear skin' : 'Skin'}</span>
          <span className="hidden sm:inline">
            {outerSkin.enabled ? 'Clear external skin' : 'Add external skin'}
          </span>
        </button>
        {outerSkin.enabled ? (
          <label className="flex shrink-0 items-center gap-2 text-xs text-ink-soft">
            Cavity
            <input
              type="number"
              min={50}
              max={200}
              step={5}
              inputMode="numeric"
              value={outerSkin.cavityMm}
              onChange={(e) => setOuterSkin({ cavityMm: Number(e.target.value) })}
              className="touch-target w-16 rounded-md border border-line bg-paper px-2 text-base"
            />
            mm
          </label>
        ) : null}
        {selectedWallId ? (
          <button
            type="button"
            onClick={() => {
              deleteWall(selectedWallId)
              onClearSelection()
            }}
            className="touch-target shrink-0 rounded-md bg-accent px-3 text-sm font-medium text-white"
          >
            Delete wall
          </button>
        ) : null}
        {selectedOpeningId ? (
          <button
            type="button"
            onClick={() => {
              deleteOpening(selectedOpeningId)
              onClearSelection()
            }}
            className="touch-target shrink-0 rounded-md bg-accent px-3 text-sm font-medium text-white"
          >
            Delete opening
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => {
            if (window.confirm('Clear the plan? Roofing will lose derived lengths until you redraw.')) {
              clearPlan()
              onClearSelection()
            }
          }}
          className="touch-target shrink-0 rounded-md border border-line px-3 text-sm text-ink-soft md:ml-auto"
        >
          Clear plan
        </button>
        <label className="flex shrink-0 items-center gap-2 text-xs text-ink-soft">
          Storeys
          <input
            type="number"
            min={1}
            max={3}
            inputMode="numeric"
            value={storeys}
            onChange={(e) => setStoreys(Number(e.target.value))}
            className="touch-target w-16 rounded-md border border-line bg-paper px-2 text-base"
          />
        </label>
        <label className="flex shrink-0 items-center gap-2 text-xs text-ink-soft">
          Height
          <input
            type="number"
            min={2100}
            step={50}
            inputMode="numeric"
            value={storeyHeightMm}
            onChange={(e) => setStoreyHeight(Number(e.target.value))}
            className="touch-target w-[5.5rem] rounded-md border border-line bg-paper px-2 text-base"
          />
          mm
        </label>
      </div>
      {selectedWall?.kind === 'partition' ? (
        <form
          className="flex flex-wrap items-center gap-2 border-t border-line pt-1.5"
          onSubmit={(e) => {
            e.preventDefault()
            applySelectedLength()
          }}
        >
          <p className="text-[11px] font-medium uppercase tracking-wider text-ink-soft">Internal length</p>
          <input
            type="text"
            inputMode="decimal"
            aria-label="Partition length in millimetres or metres"
            placeholder="e.g. 2400 or 2.4m"
            value={lengthText}
            onChange={(e) => {
              setLengthText(e.target.value)
              setLengthInvalid(false)
            }}
            className={`touch-target w-[9rem] rounded-md border bg-paper px-2 text-base outline-none focus:border-accent ${
              lengthInvalid ? 'border-red-600' : 'border-line'
            }`}
          />
          <button type="submit" className="touch-target rounded-md bg-ink px-3 text-sm font-medium text-paper">
            Apply
          </button>
          <button
            type="button"
            onClick={() => setLengthFrom((from) => (from === 'a' ? 'b' : 'a'))}
            className="touch-target rounded-md border border-line px-3 text-sm"
          >
            Flip
          </button>
          <span className="text-[11px] text-ink-soft">
            Away from {lengthFrom === 'a' ? 'start' : 'end'} · mm or m · Enter applies
          </span>
        </form>
      ) : null}
    </div>
  )
}

import type { DrawTool } from '../../types/job'
import { useJobStore } from '../../store/useJobStore'

const TOOLS: { id: DrawTool; label: string; hint: string }[] = [
  { id: 'select', label: 'Select', hint: 'Click a wall or opening' },
  { id: 'pan', label: 'Pan', hint: 'Drag the sheet' },
  { id: 'rect', label: 'Rectangle', hint: 'Drag a building outline' },
  { id: 'external', label: 'External wall', hint: 'Drag; snaps square' },
  { id: 'partition', label: 'Partition', hint: 'Internal wall' },
  { id: 'door', label: 'Doorway', hint: 'Tap a wall' },
  { id: 'opening', label: 'Opening', hint: 'Window / hole' },
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

  return (
    <div className="no-print flex flex-wrap items-center gap-2 border-b border-line bg-card px-4 py-2">
      <div className="flex flex-wrap gap-1">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            type="button"
            title={t.hint}
            onClick={() => onTool(t.id)}
            className={`touch-target rounded-md px-3 text-sm font-medium ${
              tool === t.id ? 'bg-ink text-paper' : 'border border-line bg-paper text-ink hover:border-ink'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="mx-2 hidden h-8 w-px bg-line sm:block" />
      <button
        type="button"
        onClick={insertSampleBuilding}
        className="touch-target rounded-md border border-line px-3 text-sm hover:border-accent"
      >
        Insert 8 × 6 m sample
      </button>
      <button
        type="button"
        onClick={undo}
        disabled={past.length === 0}
        className="touch-target rounded-md border border-line px-3 text-sm disabled:opacity-40"
      >
        Undo
      </button>
      <button
        type="button"
        onClick={redo}
        disabled={future.length === 0}
        className="touch-target rounded-md border border-line px-3 text-sm disabled:opacity-40"
      >
        Redo
      </button>
      {selectedWallId ? (
        <button
          type="button"
          onClick={() => {
            deleteWall(selectedWallId)
            onClearSelection()
          }}
          className="touch-target rounded-md bg-accent px-3 text-sm font-medium text-white"
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
          className="touch-target rounded-md bg-accent px-3 text-sm font-medium text-white"
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
        className="touch-target ml-auto rounded-md border border-line px-3 text-sm text-ink-soft"
      >
        Clear plan
      </button>
      <label className="ml-2 flex items-center gap-1 text-xs text-ink-soft">
        Storeys
        <input
          type="number"
          min={1}
          max={3}
          value={storeys}
          onChange={(e) => setStoreys(Number(e.target.value))}
          className="touch-target w-16 rounded-md border border-line bg-paper px-2 text-sm"
        />
      </label>
      <label className="flex items-center gap-1 text-xs text-ink-soft">
        Height
        <input
          type="number"
          min={2100}
          step={50}
          value={storeyHeightMm}
          onChange={(e) => setStoreyHeight(Number(e.target.value))}
          className="touch-target w-20 rounded-md border border-line bg-paper px-2 text-sm"
        />
        mm
      </label>
    </div>
  )
}

import { useMemo } from 'react'
import { calcFloorCover } from '../../calc/floorCover'
import { formatM2 } from '../../calc/units'
import { useGeometry } from '../../hooks/useGeometry'
import { exportFloorCoverPdf } from '../../pdf/exportTakeoff'
import { useJobStore } from '../../store/useJobStore'
import {
  emptyFloorCoverRoom,
  TYPICAL_FLOOR_ROOMS,
  type FloorCoverMode,
  type FloorCoverRoom,
} from '../../types/modules'
import { CalcSection } from '../section/CalcSection'
import { CheckField, Notes, NumberField, Panel, SelectField, Stat, TextField } from '../ui/Fields'
import { geomBlurb, jobState } from './geom'

export function FloorCoverSection() {
  const g = useGeometry()
  const input = useJobStore((s) => s.floorCover)
  const patch = useJobStore((s) => s.patchFloorCover)
  const addRoom = useJobStore((s) => s.addFloorCoverRoom)
  const patchRoom = useJobStore((s) => s.patchFloorCoverRoom)
  const removeRoom = useJobStore((s) => s.removeFloorCoverRoom)
  const setRooms = useJobStore((s) => s.setFloorCoverRooms)
  const r = useMemo(() => calcFloorCover(g, input), [g, input])

  const setMode = (mode: FloorCoverMode) => {
    if (mode === input.mode) return
    if (mode === 'room-by-room' && input.rooms.length === 0) {
      const rooms: FloorCoverRoom[] = [emptyFloorCoverRoom('Ground floor', Number(g.footprintM2.toFixed(2)))]
      if (g.storeys > 1) {
        rooms.push(emptyFloorCoverRoom('First floor', Number(g.footprintM2.toFixed(2))))
      }
      patch({ mode, rooms })
      return
    }
    patch({ mode })
  }

  const seedTypical = () => {
    const share = Number((g.footprintM2 / TYPICAL_FLOOR_ROOMS.length).toFixed(2))
    setRooms(TYPICAL_FLOOR_ROOMS.map((name) => emptyFloorCoverRoom(name, share)))
  }

  return (
    <CalcSection
      id="floor-coverings"
      title="Floor coverings"
      blurb={geomBlurb(g)}
      exportLabel="Export flooring PDF"
      onExport={() => exportFloorCoverPdf(jobState(), g, r)}
      footer={<Notes notes={r.notes} />}
    >
      <div
        role="radiogroup"
        aria-label="Floor covering take-off mode"
        className="flex max-w-md rounded-lg border border-line bg-paper p-1 text-sm font-medium"
      >
        <button
          type="button"
          role="radio"
          aria-checked={input.mode === 'whole-house'}
          className={`flex-1 rounded-md px-3 py-1.5 ${input.mode === 'whole-house' ? 'bg-ink text-paper' : 'text-ink-soft hover:text-ink'}`}
          onClick={() => setMode('whole-house')}
        >
          Whole house
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={input.mode === 'room-by-room'}
          className={`flex-1 rounded-md px-3 py-1.5 ${input.mode === 'room-by-room' ? 'bg-ink text-paper' : 'text-ink-soft hover:text-ink'}`}
          onClick={() => setMode('room-by-room')}
        >
          Room-by-room
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SelectField label="Covering" value={input.kind} onChange={(e) => patch({ kind: e.target.value as typeof input.kind })}>
          <option value="tile">Tiling</option>
          <option value="laminate">Laminate</option>
          <option value="carpet">Carpet</option>
          <option value="vinyl">Vinyl</option>
        </SelectField>
        <NumberField label="Tile length" unit="mm" value={input.tileLengthMm} onChange={(e) => patch({ tileLengthMm: Number(e.target.value) })} />
        <NumberField label="Tile width" unit="mm" value={input.tileWidthMm} onChange={(e) => patch({ tileWidthMm: Number(e.target.value) })} />
        <NumberField label="Grout joint" unit="mm" value={input.groutMm} onChange={(e) => patch({ groutMm: Number(e.target.value) })} />
        <NumberField label="Waste" unit="%" min={5} max={20} value={input.wastePct} hint="Default 10%" onChange={(e) => patch({ wastePct: Number(e.target.value) })} />
        {input.mode === 'whole-house' ? (
          <>
            <CheckField label="Include wall tiling" checked={input.includeWalls} onChange={(includeWalls) => patch({ includeWalls })} />
            {input.includeWalls ? (
              <NumberField
                label="Wall height"
                unit="mm"
                value={input.wallHeightMm}
                hint="Inner perimeter × height − openings"
                onChange={(e) => patch({ wallHeightMm: Number(e.target.value) })}
              />
            ) : null}
          </>
        ) : null}
      </div>

      {input.mode === 'room-by-room' ? (
        <Panel title="Rooms">
          <p className="mb-3 text-sm text-ink-soft">
            Name, floor area and optional wall-tile area. Openings come off wall tiles where that is ticked — not
            the floor. Combined {formatM2(r.floorM2)} floor vs {formatM2(g.footprintM2 * g.storeys)} footprint ×
            storeys.
          </p>
          <div className="mb-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="touch-target rounded-md border border-line px-3 text-sm"
              onClick={() => addRoom()}
            >
              Add room
            </button>
            <button type="button" className="touch-target rounded-md border border-line px-3 text-sm" onClick={seedTypical}>
              Typical rooms
            </button>
          </div>
          {input.rooms.length === 0 ? (
            <p className="text-sm text-ink-soft">No rooms yet. Add a room or seed a typical house list.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {input.rooms.map((room) => {
                const row = r.rooms.find((x) => x.id === room.id)
                return (
                  <div key={room.id} className="rounded-lg border border-line bg-paper p-3">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <TextField label="Name" value={room.name} onChange={(e) => patchRoom(room.id, { name: e.target.value })} />
                      <NumberField
                        label="Floor area"
                        unit="m²"
                        min={0}
                        step={0.1}
                        value={room.floorM2}
                        onChange={(e) => patchRoom(room.id, { floorM2: Number(e.target.value) })}
                      />
                      <NumberField
                        label="Wall tile area"
                        unit="m²"
                        min={0}
                        step={0.1}
                        value={room.wallTileM2}
                        hint="Optional. 0 = floor only"
                        onChange={(e) => patchRoom(room.id, { wallTileM2: Number(e.target.value) })}
                      />
                      <CheckField
                        label="Deduct openings from walls"
                        checked={room.deductOpenings}
                        onChange={(deductOpenings) => patchRoom(room.id, { deductOpenings })}
                      />
                    </div>
                    {room.deductOpenings && room.wallTileM2 > 0 ? (
                      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <NumberField
                          label="Doors"
                          min={0}
                          value={room.doorCount}
                          onChange={(e) => patchRoom(room.id, { doorCount: Number(e.target.value) })}
                        />
                        <NumberField
                          label="Door width"
                          unit="mm"
                          value={room.doorWidthMm}
                          onChange={(e) => patchRoom(room.id, { doorWidthMm: Number(e.target.value) })}
                        />
                        <NumberField
                          label="Door height"
                          unit="mm"
                          value={room.doorHeightMm}
                          onChange={(e) => patchRoom(room.id, { doorHeightMm: Number(e.target.value) })}
                        />
                        <NumberField
                          label="Windows"
                          min={0}
                          value={room.windowCount}
                          onChange={(e) => patchRoom(room.id, { windowCount: Number(e.target.value) })}
                        />
                        <NumberField
                          label="Window width"
                          unit="mm"
                          value={room.windowWidthMm}
                          onChange={(e) => patchRoom(room.id, { windowWidthMm: Number(e.target.value) })}
                        />
                        <NumberField
                          label="Window height"
                          unit="mm"
                          value={room.windowHeightMm}
                          onChange={(e) => patchRoom(room.id, { windowHeightMm: Number(e.target.value) })}
                        />
                      </div>
                    ) : null}
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                      <p className="text-ink-soft">
                        Net {row ? formatM2(row.areaM2) : '—'}
                        {row && row.openingDeductM2 > 0 ? ` · openings −${formatM2(row.openingDeductM2)}` : ''}
                      </p>
                      <button type="button" className="text-accent" onClick={() => removeRoom(room.id)}>
                        Remove
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Panel>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Floor" value={formatM2(r.floorM2)} />
        <Stat label="Walls" value={formatM2(r.wallM2)} />
        <Stat label="Tiles / m²" value={r.tilesPerM2.toFixed(2)} />
        <Stat label="Tiles needed" value={String(r.tiles)} hint={`incl. ${input.wastePct}% waste`} />
        <Stat label="Grout bags" value={String(r.groutBags)} hint="5 kg" />
        <Stat label="Adhesive bags" value={String(r.adhesiveBags)} hint="20 kg" />
      </div>
    </CalcSection>
  )
}

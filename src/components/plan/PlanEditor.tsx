import Konva from 'konva'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Circle, Group, Layer, Line, Rect, Stage, Text } from 'react-konva'
import { mmToPx, snapMm, MM_PER_PX } from '../../calc/units'
import { nearestWall, wallLengthMm } from '../../geometry/derive'
import { uid } from '../../geometry/ids'
import { useJobStore } from '../../store/useJobStore'
import {
  DOOR_HEIGHT_MM,
  DOOR_WIDTH_MM,
  EXTERNAL_THICKNESS_MM,
  OPENING_HEIGHT_MM,
  OPENING_WIDTH_MM,
  PARTITION_THICKNESS_MM,
  type DrawTool,
  type Opening,
  type PointMm,
  type Wall,
} from '../../types/job'

interface Props {
  tool: DrawTool
  selectedWallId: string | null
  selectedOpeningId: string | null
  onSelectWall: (id: string | null) => void
  onSelectOpening: (id: string | null) => void
}

interface Draft {
  kind: 'rect' | 'wall'
  wallKind?: Wall['kind']
  a: PointMm
  b: PointMm
}

function capturePointer(evt: PointerEvent) {
  const target = evt.target
  if (target instanceof Element && typeof evt.pointerId === 'number') {
    try {
      target.setPointerCapture(evt.pointerId)
    } catch {
      /* Safari can throw if capture is not available on this target. */
    }
  }
}

function applyDraft(d: Draft) {
  const { plan, addWall, replaceWalls } = useJobStore.getState()
  const walls = plan.walls
  const openings = plan.openings
  if (d.kind === 'rect') {
    const x = Math.min(d.a.x, d.b.x)
    const y = Math.min(d.a.y, d.b.y)
    const w = Math.abs(d.b.x - d.a.x)
    const h = Math.abs(d.b.y - d.a.y)
    if (w < 1000 || h < 1000) return
    const t = EXTERNAL_THICKNESS_MM
    const rectWalls: Wall[] = [
      { id: uid(), kind: 'external', x1: x, y1: y, x2: x + w, y2: y, thicknessMm: t },
      { id: uid(), kind: 'external', x1: x + w, y1: y, x2: x + w, y2: y + h, thicknessMm: t },
      { id: uid(), kind: 'external', x1: x + w, y1: y + h, x2: x, y2: y + h, thicknessMm: t },
      { id: uid(), kind: 'external', x1: x, y1: y + h, x2: x, y2: y, thicknessMm: t },
    ]
    const kept = walls.filter((wall) => wall.kind !== 'external')
    const nextWalls = [...kept, ...rectWalls]
    const ids = new Set(nextWalls.map((w) => w.id))
    replaceWalls(
      nextWalls,
      openings.filter((o) => ids.has(o.wallId)),
    )
    return
  }
  const { a, b, wallKind } = d
  let x2 = b.x
  let y2 = b.y
  if (Math.abs(b.x - a.x) >= Math.abs(b.y - a.y)) y2 = a.y
  else x2 = a.x
  if (Math.hypot(x2 - a.x, y2 - a.y) < 300) return
  addWall({
    id: uid(),
    kind: wallKind ?? 'external',
    x1: a.x,
    y1: a.y,
    x2,
    y2,
    thicknessMm: wallKind === 'partition' ? PARTITION_THICKNESS_MM : EXTERNAL_THICKNESS_MM,
  })
}

export function PlanEditor({
  tool,
  selectedWallId,
  selectedOpeningId,
  onSelectWall,
  onSelectOpening,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<Konva.Stage>(null)
  const [size, setSize] = useState({ w: 800, h: 560 })
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 48, y: 48 })
  const [draft, setDraft] = useState<Draft | null>(null)
  const draftRef = useRef<Draft | null>(null)
  const pinchRef = useRef<{ dist: number } | null>(null)
  const pointersRef = useRef(new Set<number>())
  const zoomRef = useRef(zoom)
  const panRef = useRef(pan)

  const walls = useJobStore((s) => s.plan.walls)
  const openings = useJobStore((s) => s.plan.openings)
  const updateWall = useJobStore((s) => s.updateWall)
  const addOpening = useJobStore((s) => s.addOpening)

  draftRef.current = draft
  zoomRef.current = zoom
  panRef.current = pan

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      setSize({ w: el.clientWidth, h: el.clientHeight })
    })
    ro.observe(el)
    setSize({ w: el.clientWidth, h: el.clientHeight })
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    stage.content.style.touchAction = 'none'
  }, [size.w, size.h])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const distance = (touches: TouchList) =>
      Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY)

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length >= 2) {
        pinchRef.current = { dist: distance(e.touches) }
        draftRef.current = null
        setDraft(null)
      }
    }

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length < 2 || !pinchRef.current) return
      e.preventDefault()
      const dist = distance(e.touches)
      const scale = dist / Math.max(pinchRef.current.dist, 1)
      pinchRef.current.dist = dist
      const oldZoom = zoomRef.current
      const next = Math.min(3.5, Math.max(0.3, oldZoom * scale))
      const rect = el.getBoundingClientRect()
      const pointer = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top,
      }
      const world = {
        x: (pointer.x - panRef.current.x) / oldZoom,
        y: (pointer.y - panRef.current.y) / oldZoom,
      }
      setZoom(next)
      setPan({ x: pointer.x - world.x * next, y: pointer.y - world.y * next })
    }

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) pinchRef.current = null
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd)
    el.addEventListener('touchcancel', onTouchEnd)
    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [])

  useEffect(() => {
    const complete = (e: PointerEvent) => {
      pointersRef.current.delete(e.pointerId)
      if (pinchRef.current) return
      const d = draftRef.current
      if (!d) return
      draftRef.current = null
      setDraft(null)
      applyDraft(d)
    }
    window.addEventListener('pointerup', complete)
    window.addEventListener('pointercancel', complete)
    return () => {
      window.removeEventListener('pointerup', complete)
      window.removeEventListener('pointercancel', complete)
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) useJobStore.getState().redo()
        else useJobStore.getState().undo()
      }
      if (e.key === 'Escape') {
        draftRef.current = null
        setDraft(null)
        onSelectWall(null)
        onSelectOpening(null)
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && !(e.target instanceof HTMLInputElement)) {
        if (selectedOpeningId) useJobStore.getState().deleteOpening(selectedOpeningId)
        else if (selectedWallId) useJobStore.getState().deleteWall(selectedWallId)
        onSelectWall(null)
        onSelectOpening(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onSelectOpening, onSelectWall, selectedOpeningId, selectedWallId])

  const pointerMm = (): PointMm | null => {
    const stage = stageRef.current
    if (!stage) return null
    const p = stage.getRelativePointerPosition()
    if (!p) return null
    return { x: snapMm(p.x * MM_PER_PX), y: snapMm(p.y * MM_PER_PX) }
  }

  const onWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault()
    const stage = stageRef.current
    if (!stage) return
    const pointer = stage.getPointerPosition()
    if (!pointer) return
    const oldZoom = zoom
    const next = Math.min(3.5, Math.max(0.3, zoom * (e.evt.deltaY > 0 ? 0.92 : 1.09)))
    const mouse = {
      x: (pointer.x - pan.x) / oldZoom,
      y: (pointer.y - pan.y) / oldZoom,
    }
    setZoom(next)
    setPan({ x: pointer.x - mouse.x * next, y: pointer.y - mouse.y * next })
  }

  const placeOpening = (kind: Opening['kind']) => {
    const pt = pointerMm()
    if (!pt) return
    const hit = nearestWall(pt, walls, 1200)
    if (!hit) return
    const length = wallLengthMm(hit.wall)
    const width = kind === 'door' ? DOOR_WIDTH_MM : OPENING_WIDTH_MM
    if (length < width + 200) return
    const offset = Math.max(100, Math.min(length - width - 100, hit.t * length - width / 2))
    addOpening({
      id: uid(),
      kind,
      wallId: hit.wall.id,
      offsetMm: offset,
      widthMm: width,
      heightMm: kind === 'door' ? DOOR_HEIGHT_MM : OPENING_HEIGHT_MM,
    })
  }

  const onDown = (e: Konva.KonvaEventObject<PointerEvent>) => {
    const evt = e.evt
    evt.preventDefault()
    if (typeof evt.pointerId === 'number') pointersRef.current.add(evt.pointerId)
    if (pinchRef.current || pointersRef.current.size > 1 || evt.isPrimary === false) {
      draftRef.current = null
      setDraft(null)
      return
    }
    if (tool === 'pan') return
    const isStage = e.target === e.target.getStage()
    const pt = pointerMm()
    if (!pt) return
    if (tool === 'select') {
      if (isStage) {
        onSelectWall(null)
        onSelectOpening(null)
      }
      return
    }
    if (tool === 'door' || tool === 'opening') {
      placeOpening(tool === 'door' ? 'door' : 'opening')
      return
    }
    if (tool === 'rect') {
      const next = { kind: 'rect' as const, a: pt, b: pt }
      draftRef.current = next
      setDraft(next)
      capturePointer(evt)
      return
    }
    if (tool === 'external' || tool === 'partition') {
      const next = { kind: 'wall' as const, wallKind: tool, a: pt, b: pt }
      draftRef.current = next
      setDraft(next)
      capturePointer(evt)
    }
  }

  const onMove = () => {
    if (pinchRef.current || !draftRef.current) return
    const pt = pointerMm()
    if (!pt) return
    const next = { ...draftRef.current, b: pt }
    draftRef.current = next
    setDraft(next)
  }

  const onUp = (e: Konva.KonvaEventObject<PointerEvent>) => {
    if (typeof e.evt.pointerId === 'number') pointersRef.current.delete(e.evt.pointerId)
  }

  const grid = useMemo(() => gridLines(40_000, 30_000, 1000), [])

  return (
    <div ref={containerRef} className="plan-stage relative h-full min-h-0 w-full overflow-hidden bg-[#efe8da]">
      <Stage
        ref={stageRef}
        width={size.w}
        height={size.h}
        scaleX={zoom}
        scaleY={zoom}
        x={pan.x}
        y={pan.y}
        draggable={tool === 'pan' && !draft}
        onDragEnd={(e) => {
          if (e.target !== e.target.getStage()) return
          setPan({ x: e.target.x(), y: e.target.y() })
        }}
        onWheel={onWheel}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        style={{
          cursor: tool === 'pan' ? 'grab' : tool === 'select' ? 'default' : 'crosshair',
          touchAction: 'none',
        }}
      >
        <Layer listening={false}>
          {grid.minor.map((pts, i) => (
            <Line key={`mi-${i}`} points={pts} stroke="#e4dccb" strokeWidth={1} />
          ))}
          {grid.major.map((pts, i) => (
            <Line key={`ma-${i}`} points={pts} stroke="#d3c7ae" strokeWidth={1} />
          ))}
          <Line points={[0, 0, mmToPx(2000), 0]} stroke="#c45c26" strokeWidth={3} />
          <Text text="2 m" x={4} y={6} fontSize={12 / zoom} fill="#9a4318" fontFamily="IBM Plex Mono" />
        </Layer>
        <Layer>
          {walls.map((wall) => (
            <WallShape
              key={wall.id}
              wall={wall}
              openings={openings.filter((o) => o.wallId === wall.id)}
              selected={wall.id === selectedWallId}
              zoom={zoom}
              selectable={tool === 'select'}
              onSelect={() => {
                onSelectOpening(null)
                onSelectWall(wall.id)
              }}
              onDragEnd={(which, pt) => {
                if (which === 'a') updateWall(wall.id, { x1: pt.x, y1: pt.y })
                else updateWall(wall.id, { x2: pt.x, y2: pt.y })
              }}
              onSelectOpening={(id) => {
                onSelectWall(null)
                onSelectOpening(id)
              }}
              selectedOpeningId={selectedOpeningId}
            />
          ))}
          {draft ? <DraftShape draft={draft} /> : null}
        </Layer>
      </Stage>
      <div
        className="no-print pointer-events-none absolute left-3 rounded bg-ink/80 px-2 py-1 font-mono text-[11px] text-paper"
        style={{ bottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
        zoom {zoom.toFixed(2)} · 40 px = 1 m · snap 100 mm · pinch to zoom
      </div>
      <div
        className="no-print absolute right-3 flex gap-1"
        style={{ top: '0.75rem' }}
      >
        <button
          type="button"
          className="touch-target pointer-events-auto rounded-md border border-line bg-card px-3 text-lg"
          onClick={() => setZoom((z) => Math.min(3.5, z * 1.15))}
        >
          +
        </button>
        <button
          type="button"
          className="touch-target pointer-events-auto rounded-md border border-line bg-card px-3 text-lg"
          onClick={() => setZoom((z) => Math.max(0.3, z / 1.15))}
        >
          −
        </button>
      </div>
    </div>
  )
}

function gridLines(widthMm: number, depthMm: number, stepMm: number) {
  const minor: number[][] = []
  const major: number[][] = []
  for (let x = 0; x <= widthMm; x += stepMm / 2) {
    const pts = [mmToPx(x), 0, mmToPx(x), mmToPx(depthMm)]
    if (x % stepMm === 0) major.push(pts)
    else minor.push(pts)
  }
  for (let y = 0; y <= depthMm; y += stepMm / 2) {
    const pts = [0, mmToPx(y), mmToPx(widthMm), mmToPx(y)]
    if (y % stepMm === 0) major.push(pts)
    else minor.push(pts)
  }
  return { minor, major }
}

function DraftShape({ draft }: { draft: Draft }) {
  if (draft.kind === 'rect') {
    const x = mmToPx(Math.min(draft.a.x, draft.b.x))
    const y = mmToPx(Math.min(draft.a.y, draft.b.y))
    const w = mmToPx(Math.abs(draft.b.x - draft.a.x))
    const h = mmToPx(Math.abs(draft.b.y - draft.a.y))
    return <Rect x={x} y={y} width={w} height={h} stroke="#c45c26" dash={[8, 6]} strokeWidth={2} />
  }
  let x2 = draft.b.x
  let y2 = draft.b.y
  if (Math.abs(draft.b.x - draft.a.x) >= Math.abs(draft.b.y - draft.a.y)) y2 = draft.a.y
  else x2 = draft.a.x
  return (
    <Line
      points={[mmToPx(draft.a.x), mmToPx(draft.a.y), mmToPx(x2), mmToPx(y2)]}
      stroke="#c45c26"
      strokeWidth={4}
      dash={[8, 6]}
    />
  )
}

function WallShape({
  wall,
  openings,
  selected,
  zoom,
  selectable,
  onSelect,
  onDragEnd,
  onSelectOpening,
  selectedOpeningId,
}: {
  wall: Wall
  openings: Opening[]
  selected: boolean
  zoom: number
  selectable: boolean
  onSelect: () => void
  onDragEnd: (which: 'a' | 'b', pt: PointMm) => void
  onSelectOpening: (id: string) => void
  selectedOpeningId: string | null
}) {
  const len = wallLengthMm(wall)
  const segs = wallSegments(wall, openings)
  const stroke = wall.kind === 'external' ? '#0f1c2e' : '#6b5e4e'
  const width = wall.kind === 'external' ? 8 : 4
  const mx = mmToPx((wall.x1 + wall.x2) / 2)
  const my = mmToPx((wall.y1 + wall.y2) / 2)
  const label = `${(len / 1000).toFixed(2)} m`

  return (
    <Group>
      {segs.map((seg, i) => (
        <Line
          key={i}
          points={[mmToPx(seg.x1), mmToPx(seg.y1), mmToPx(seg.x2), mmToPx(seg.y2)]}
          stroke={selected ? '#c45c26' : stroke}
          strokeWidth={width}
          lineCap="square"
          hitStrokeWidth={Math.max(28, 36 / zoom)}
          onClick={selectable ? onSelect : undefined}
          onTap={selectable ? onSelect : undefined}
        />
      ))}
      {openings.map((o) => (
          <OpeningMark
            key={o.id}
            wall={wall}
            opening={o}
            selected={o.id === selectedOpeningId}
            selectable={selectable}
            zoom={zoom}
            onSelect={() => onSelectOpening(o.id)}
          />
      ))}
      <Text
        x={mx + 4}
        y={my + 4}
        text={label}
        fontSize={Math.max(10, 12 / zoom)}
        fill="#3d4f66"
        fontFamily="IBM Plex Mono"
        listening={false}
      />
      {selected && selectable ? (
        <>
          <Anchor
            x={wall.x1}
            y={wall.y1}
            zoom={zoom}
            onDrag={(pt) => onDragEnd('a', pt)}
          />
          <Anchor
            x={wall.x2}
            y={wall.y2}
            zoom={zoom}
            onDrag={(pt) => onDragEnd('b', pt)}
          />
        </>
      ) : null}
    </Group>
  )
}

function OpeningMark({
  wall,
  opening,
  selected,
  selectable,
  zoom,
  onSelect,
}: {
  wall: Wall
  opening: Opening
  selected: boolean
  selectable: boolean
  zoom: number
  onSelect: () => void
}) {
  const a = pointAlong(wall, opening.offsetMm)
  const b = pointAlong(wall, opening.offsetMm + opening.widthMm)
  const color = opening.kind === 'door' ? '#2f5d50' : '#3d4f66'
  return (
    <Group onClick={selectable ? onSelect : undefined} onTap={selectable ? onSelect : undefined}>
      <Line
        points={[mmToPx(a.x), mmToPx(a.y), mmToPx(b.x), mmToPx(b.y)]}
        stroke={selected ? '#c45c26' : color}
        strokeWidth={opening.kind === 'door' ? 3 : 2}
        dash={opening.kind === 'opening' ? [6, 4] : undefined}
        hitStrokeWidth={Math.max(28, 36 / zoom)}
      />
      {opening.kind === 'door' ? <DoorSwing wall={wall} opening={opening} /> : null}
    </Group>
  )
}

function DoorSwing({ wall, opening }: { wall: Wall; opening: Opening }) {
  const hinge = pointAlong(wall, opening.offsetMm)
  const dx = wall.x2 - wall.x1
  const dy = wall.y2 - wall.y1
  const len = Math.max(wallLengthMm(wall), 1)
  const nx = -dy / len
  const ny = dx / len
  const r = opening.widthMm
  const points = [mmToPx(hinge.x), mmToPx(hinge.y)]
  for (let i = 0; i <= 6; i++) {
    const t = (i / 6) * (Math.PI / 2)
    const alongX = dx / len
    const alongY = dy / len
    const x = hinge.x + Math.cos(t) * r * alongX + Math.sin(t) * r * nx
    const y = hinge.y + Math.cos(t) * r * alongY + Math.sin(t) * r * ny
    points.push(mmToPx(x), mmToPx(y))
  }
  return <Line points={points} stroke="#2f5d50" strokeWidth={1} dash={[3, 3]} listening={false} />
}

function Anchor({
  x,
  y,
  zoom,
  onDrag,
}: {
  x: number
  y: number
  zoom: number
  onDrag: (pt: PointMm) => void
}) {
  return (
    <Circle
      x={mmToPx(x)}
      y={mmToPx(y)}
      radius={Math.max(12, 16 / zoom)}
      fill="#c45c26"
      stroke="#fff"
      strokeWidth={2}
      draggable
      onDragMove={(e) => {
        const pt = { x: snapMm(e.target.x() * MM_PER_PX), y: snapMm(e.target.y() * MM_PER_PX) }
        e.target.position({ x: mmToPx(pt.x), y: mmToPx(pt.y) })
        onDrag(pt)
      }}
    />
  )
}

function pointAlong(wall: Wall, distMm: number): PointMm {
  const len = Math.max(wallLengthMm(wall), 1)
  const t = distMm / len
  return { x: wall.x1 + (wall.x2 - wall.x1) * t, y: wall.y1 + (wall.y2 - wall.y1) * t }
}

function wallSegments(wall: Wall, openings: Opening[]): { x1: number; y1: number; x2: number; y2: number }[] {
  const len = wallLengthMm(wall)
  if (openings.length === 0 || len === 0) {
    return [{ x1: wall.x1, y1: wall.y1, x2: wall.x2, y2: wall.y2 }]
  }
  const cuts = openings
    .map((o) => ({ start: o.offsetMm, end: o.offsetMm + o.widthMm }))
    .sort((a, b) => a.start - b.start)
  const segs: { x1: number; y1: number; x2: number; y2: number }[] = []
  let cursor = 0
  for (const cut of cuts) {
    if (cut.start > cursor) {
      const a = pointAlong(wall, cursor)
      const b = pointAlong(wall, cut.start)
      segs.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y })
    }
    cursor = Math.max(cursor, cut.end)
  }
  if (cursor < len) {
    const a = pointAlong(wall, cursor)
    segs.push({ x1: a.x, y1: a.y, x2: wall.x2, y2: wall.y2 })
  }
  return segs
}

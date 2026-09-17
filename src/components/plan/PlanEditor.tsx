import Konva from 'konva'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Circle, Group, Layer, Line, Rect, Stage, Text } from 'react-konva'
import { hypot, mmToPx, parseLengthMm, snapMm, MM_PER_PX } from '../../calc/units'
import { nearestWall, wallLengthMm } from '../../geometry/derive'
import { uid } from '../../geometry/ids'
import { outerSkinOffsetMm, outerSkinPolylines } from '../../geometry/offset'
import {
  applyTypedLength,
  constrainEndpointMove,
  directionOffWall,
  lengthOrigin,
  MIN_WALL_LEN_MM,
  preparePartition,
  snapStart,
} from '../../geometry/planEdit'
import { resolveNonCrossingSegment } from '../../geometry/segments'
import { orthoFrom, snapKindActive, type SnapHit } from '../../geometry/snap'
import { useJobStore } from '../../store/useJobStore'
import {
  DEFAULT_OUTER_SKIN,
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
import { LengthEntry, LiveMeasureLabel } from './LengthHud'

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
  snap?: SnapHit | null
  clamped?: boolean
  blocked?: boolean
  attached?: boolean
  awaitingLength?: boolean
  dir?: PointMm
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
  const skin = plan.outerSkin ?? DEFAULT_OUTER_SKIN
  const externalThickness = skin.enabled
    ? skin.innerLeafMm + skin.cavityMm + skin.outerLeafMm
    : EXTERNAL_THICKNESS_MM
  if (d.kind === 'rect') {
    const x = Math.min(d.a.x, d.b.x)
    const y = Math.min(d.a.y, d.b.y)
    const w = Math.abs(d.b.x - d.a.x)
    const h = Math.abs(d.b.y - d.a.y)
    if (w < 1000 || h < 1000) return
    const t = externalThickness
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
  if (wallKind === 'partition') {
    const prepared = preparePartition(a, b, walls)
    if (prepared.blocked || prepared.lengthMm < MIN_WALL_LEN_MM) return
    addWall({
      id: uid(),
      kind: 'partition',
      x1: prepared.a.x,
      y1: prepared.a.y,
      x2: prepared.b.x,
      y2: prepared.b.y,
      thicknessMm: PARTITION_THICKNESS_MM,
    })
    return
  }
  const ortho = orthoFrom(a, b)
  const end = { x: snapMm(ortho.x), y: snapMm(ortho.y) }
  const resolved = resolveNonCrossingSegment(a, end, walls)
  if (resolved.blocked || hypot(resolved.end.x - a.x, resolved.end.y - a.y) < MIN_WALL_LEN_MM) return
  addWall({
    id: uid(),
    kind: wallKind ?? 'external',
    x1: a.x,
    y1: a.y,
    x2: resolved.end.x,
    y2: resolved.end.y,
    thicknessMm: externalThickness,
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
  const [lengthText, setLengthText] = useState('')
  const [lengthFrom, setLengthFrom] = useState<'a' | 'b'>('a')
  const [lengthInvalid, setLengthInvalid] = useState(false)
  const [dragSnap, setDragSnap] = useState<SnapHit | null>(null)
  const draftRef = useRef<Draft | null>(null)
  const pinchRef = useRef<{ dist: number } | null>(null)
  const pointersRef = useRef(new Set<number>())
  const zoomRef = useRef(zoom)
  const panRef = useRef(pan)
  const touchRef = useRef(false)

  const walls = useJobStore((s) => s.plan.walls)
  const openings = useJobStore((s) => s.plan.openings)
  const outerSkin = useJobStore((s) => s.plan.outerSkin ?? DEFAULT_OUTER_SKIN)
  const updateWall = useJobStore((s) => s.updateWall)
  const addOpening = useJobStore((s) => s.addOpening)
  const addWall = useJobStore((s) => s.addWall)

  const selectedWall = selectedWallId ? (walls.find((w) => w.id === selectedWallId) ?? null) : null

  draftRef.current = draft
  zoomRef.current = zoom
  panRef.current = pan

  useEffect(() => {
    if (!selectedWallId) return
    const all = useJobStore.getState().plan.walls
    const w = all.find((wall) => wall.id === selectedWallId)
    if (!w || w.kind !== 'partition') return
    setLengthFrom(lengthOrigin(w, all))
    setLengthText(String(Math.round(wallLengthMm(w))))
    setLengthInvalid(false)
  }, [selectedWallId])

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
      if (e.target instanceof HTMLElement && e.target.closest('[data-plan-hud]')) return
      const d = draftRef.current
      if (!d) return
      if (d.awaitingLength) return
      if (d.kind === 'wall' && d.wallKind === 'partition') {
        const prepared = preparePartition(d.a, d.b, useJobStore.getState().plan.walls, {
          touch: touchRef.current,
        })
        if (prepared.blocked) {
          draftRef.current = null
          setDraft(null)
          return
        }
        if (prepared.lengthMm < MIN_WALL_LEN_MM) {
          if (prepared.attached || d.attached) {
            const dir =
              prepared.lengthMm >= 50
                ? prepared.dir
                : prepared.attached
                  ? directionOffWall(d.a, prepared.attached, useJobStore.getState().plan.walls)
                  : (d.dir ?? { x: 1, y: 0 })
            const next: Draft = {
              ...d,
              b: d.a,
              awaitingLength: true,
              attached: true,
              dir,
              blocked: false,
              clamped: false,
            }
            draftRef.current = next
            setDraft(next)
            setLengthText('')
            setLengthInvalid(false)
            return
          }
          draftRef.current = null
          setDraft(null)
          return
        }
        draftRef.current = null
        setDraft(null)
        applyDraft({ ...d, a: prepared.a, b: prepared.b })
        return
      }
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

  const rawPointerMm = (): PointMm | null => {
    const stage = stageRef.current
    if (!stage) return null
    const p = stage.getRelativePointerPosition()
    if (!p) return null
    return { x: p.x * MM_PER_PX, y: p.y * MM_PER_PX }
  }

  const pointerMm = (): PointMm | null => {
    const raw = rawPointerMm()
    if (!raw) return null
    return { x: snapMm(raw.x), y: snapMm(raw.y) }
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
    touchRef.current = evt.pointerType === 'touch'
    if (pinchRef.current || pointersRef.current.size > 1 || evt.isPrimary === false) {
      draftRef.current = null
      setDraft(null)
      return
    }
    if (tool === 'pan') return
    const isStage = e.target === e.target.getStage()
    const raw = rawPointerMm()
    const pt = pointerMm()
    if (!raw || !pt) return
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
      const current = draftRef.current
      if (tool === 'partition' && current?.awaitingLength && current.kind === 'wall') {
        const prepared = preparePartition(current.a, raw, walls, { touch: touchRef.current })
        const next: Draft = {
          ...current,
          awaitingLength: false,
          b: prepared.b,
          snap: prepared.snap,
          clamped: prepared.clamped,
          blocked: prepared.blocked,
          dir: prepared.dir,
        }
        draftRef.current = next
        setDraft(next)
        capturePointer(evt)
        return
      }
      if (tool === 'partition') {
        const start = snapStart(raw, walls, touchRef.current)
        const dir = start.attached ? directionOffWall(start.point, start.attached, walls) : { x: 1, y: 0 }
        const next: Draft = {
          kind: 'wall',
          wallKind: 'partition',
          a: start.point,
          b: start.point,
          snap: start.snap,
          attached: Boolean(start.attached),
          dir,
        }
        draftRef.current = next
        setDraft(next)
        capturePointer(evt)
        return
      }
      const next: Draft = { kind: 'wall', wallKind: 'external', a: pt, b: pt }
      draftRef.current = next
      setDraft(next)
      capturePointer(evt)
    }
  }

  const onMove = () => {
    if (pinchRef.current || !draftRef.current) return
    const d = draftRef.current
    if (d.awaitingLength) return
    const raw = rawPointerMm()
    const pt = pointerMm()
    if (!raw || !pt) return
    if (d.kind === 'wall' && d.wallKind === 'partition') {
      const prepared = preparePartition(d.a, raw, walls, { touch: touchRef.current })
      const next: Draft = prepared.blocked
        ? { ...d, blocked: true, snap: prepared.snap }
        : {
            ...d,
            b: prepared.b,
            snap: prepared.snap,
            clamped: prepared.clamped,
            blocked: false,
            attached: Boolean(prepared.attached) || d.attached,
            dir: prepared.dir,
          }
      draftRef.current = next
      setDraft(next)
      return
    }
    if (d.kind === 'wall') {
      const ortho = orthoFrom(d.a, pt)
      const end = { x: snapMm(ortho.x), y: snapMm(ortho.y) }
      const resolved = resolveNonCrossingSegment(d.a, end, walls)
      const next: Draft = resolved.blocked
        ? { ...d, blocked: true }
        : { ...d, b: resolved.end, clamped: resolved.clamped, blocked: false }
      draftRef.current = next
      setDraft(next)
      return
    }
    const next = { ...d, b: pt }
    draftRef.current = next
    setDraft(next)
  }

  const onUp = (e: Konva.KonvaEventObject<PointerEvent>) => {
    if (typeof e.evt.pointerId === 'number') pointersRef.current.delete(e.evt.pointerId)
  }

  const applyLengthValue = (raw: string, origin: PointMm, dir: PointMm, ignoreIds: ReadonlySet<string>) => {
    const mm = parseLengthMm(raw)
    if (mm === null || mm < MIN_WALL_LEN_MM) {
      setLengthInvalid(true)
      return null
    }
    const prepared = applyTypedLength(origin, dir, mm, walls, ignoreIds)
    if (prepared.blocked) {
      setLengthInvalid(true)
      return null
    }
    setLengthInvalid(false)
    return prepared
  }

  const commitTypedPartition = () => {
    const d = draftRef.current
    if (!d || d.kind !== 'wall' || d.wallKind !== 'partition') return
    const dir = d.dir ?? { x: 1, y: 0 }
    const prepared = applyLengthValue(lengthText, d.a, dir, new Set())
    if (!prepared) return
    addWall({
      id: uid(),
      kind: 'partition',
      x1: prepared.a.x,
      y1: prepared.a.y,
      x2: prepared.b.x,
      y2: prepared.b.y,
      thicknessMm: PARTITION_THICKNESS_MM,
    })
    draftRef.current = null
    setDraft(null)
    setLengthText('')
  }

  const commitSelectedLength = () => {
    if (!selectedWall || selectedWall.kind !== 'partition') return
    const origin =
      lengthFrom === 'a'
        ? { x: selectedWall.x1, y: selectedWall.y1 }
        : { x: selectedWall.x2, y: selectedWall.y2 }
    const other =
      lengthFrom === 'a'
        ? { x: selectedWall.x2, y: selectedWall.y2 }
        : { x: selectedWall.x1, y: selectedWall.y1 }
    const dir = { x: other.x - origin.x, y: other.y - origin.y }
    const prepared = applyLengthValue(lengthText, origin, dir, new Set([selectedWall.id]))
    if (!prepared) return
    if (lengthFrom === 'a') updateWall(selectedWall.id, { x2: prepared.b.x, y2: prepared.b.y }, true)
    else updateWall(selectedWall.id, { x1: prepared.b.x, y1: prepared.b.y }, true)
    setLengthText('')
  }

  const skinLoops = useMemo(() => {
    if (!outerSkin.enabled) return []
    const dist = outerSkinOffsetMm(outerSkin.innerLeafMm, outerSkin.cavityMm, outerSkin.outerLeafMm)
    return outerSkinPolylines(walls, dist)
  }, [outerSkin, walls])

  const liveSnap = draft?.snap && snapKindActive(draft.snap.kind) ? draft.snap : dragSnap
  const draftLen = draft && draft.kind === 'wall' ? hypot(draft.b.x - draft.a.x, draft.b.y - draft.a.y) : 0
  const hudPt = draft && draft.kind === 'wall' ? draft.b : null
  const hudScreen = hudPt
    ? {
        left: Math.min(size.w - 140, Math.max(8, pan.x + mmToPx(hudPt.x) * zoom + 14)),
        top: Math.min(size.h - 72, Math.max(8, pan.y + mmToPx(hudPt.y) * zoom + 14)),
      }
    : null

  const showLengthEntry =
    (draft?.kind === 'wall' && draft.wallKind === 'partition' && draft.awaitingLength) ||
    (tool === 'select' && selectedWall?.kind === 'partition')

  const grid = useMemo(() => gridLines(40_000, 30_000, 1000), [])

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="no-print flex items-center justify-between gap-2 border-b border-line bg-card px-2 py-1 md:hidden">
        <p className="font-mono text-[11px] text-ink-soft">zoom {zoom.toFixed(2)} · pinch or +/−</p>
        <div className="flex gap-1">
          <button
            type="button"
            className="touch-target rounded-md border border-line bg-paper px-3 text-lg"
            onClick={() => setZoom((z) => Math.min(3.5, z * 1.15))}
          >
            +
          </button>
          <button
            type="button"
            className="touch-target rounded-md border border-line bg-paper px-3 text-lg"
            onClick={() => setZoom((z) => Math.max(0.3, z / 1.15))}
          >
            −
          </button>
        </div>
      </div>
      <div ref={containerRef} className="plan-stage relative min-h-0 flex-1 overflow-hidden bg-[#efe8da]">
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
          {skinLoops.map((loop, i) => (
            <Line
              key={`skin-${i}`}
              points={loop.flatMap((p) => [mmToPx(p.x), mmToPx(p.y)])}
              closed={loop.length > 2}
              stroke="#9a4318"
              strokeWidth={5}
              dash={[10, 7]}
              opacity={0.85}
              lineJoin="miter"
            />
          ))}
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
              onDrag={(which, pt) => {
                const prepared = constrainEndpointMove(wall, which, pt, walls, touchRef.current)
                setDragSnap(prepared.snap && snapKindActive(prepared.snap.kind) ? prepared.snap : null)
                if (prepared.blocked || prepared.lengthMm < MIN_WALL_LEN_MM) {
                  return { point: which === 'a' ? { x: wall.x1, y: wall.y1 } : { x: wall.x2, y: wall.y2 } }
                }
                if (which === 'a') updateWall(wall.id, { x1: prepared.b.x, y1: prepared.b.y })
                else updateWall(wall.id, { x2: prepared.b.x, y2: prepared.b.y })
                return { point: prepared.b }
              }}
              onDragEnd={() => setDragSnap(null)}
              onSelectOpening={(id) => {
                onSelectWall(null)
                onSelectOpening(id)
              }}
              selectedOpeningId={selectedOpeningId}
            />
          ))}
          {draft ? <DraftShape draft={draft} /> : null}
          {liveSnap && snapKindActive(liveSnap.kind) ? (
            <Circle
              x={mmToPx(liveSnap.point.x)}
              y={mmToPx(liveSnap.point.y)}
              radius={Math.max(7, 10 / zoom)}
              stroke="#fff"
              strokeWidth={2}
              fill={liveSnap.kind === 'endpoint' ? '#c45c26' : 'transparent'}
              listening={false}
            />
          ) : null}
        </Layer>
      </Stage>
      {draft?.kind === 'wall' && draft.wallKind === 'partition' && !draft.awaitingLength && hudScreen ? (
        <LiveMeasureLabel
          left={hudScreen.left}
          top={hudScreen.top}
          lengthMm={draftLen}
          invalid={draft.blocked}
          clamped={draft.clamped}
        />
      ) : null}
      {showLengthEntry ? (
        <div
          className="no-print absolute z-10"
          style={{
            left: 12,
            bottom: 'max(3.25rem, calc(env(safe-area-inset-bottom) + 2.5rem))',
          }}
        >
          <LengthEntry
            title={draft?.awaitingLength ? 'Partition length' : 'Wall length'}
            lengthMm={
              draft?.awaitingLength
                ? 0
                : selectedWall
                  ? wallLengthMm(selectedWall)
                  : draftLen
            }
            value={lengthText}
            onChange={(v) => {
              setLengthText(v)
              setLengthInvalid(false)
            }}
            onApply={draft?.awaitingLength ? commitTypedPartition : commitSelectedLength}
            onFlip={
              draft?.awaitingLength
                ? () => {
                    const d = draftRef.current
                    if (!d?.dir) return
                    const next = { ...d, dir: { x: -d.dir.x, y: -d.dir.y } }
                    draftRef.current = next
                    setDraft(next)
                  }
                : selectedWall?.kind === 'partition'
                  ? () => setLengthFrom((from) => (from === 'a' ? 'b' : 'a'))
                  : undefined
            }
            invalid={lengthInvalid}
            autoFocus={Boolean(draft?.awaitingLength)}
            hint={
              draft?.awaitingLength
                ? 'Length from the attached wall. mm or m (UK). Enter applies.'
                : 'Grows away from the attached end. Flip swaps the origin. mm or m.'
            }
          />
        </div>
      ) : null}
      {outerSkin.enabled ? (
        <div className="no-print pointer-events-none absolute right-3 top-14 hidden rounded bg-accent-dark/90 px-2 py-1 font-mono text-[10px] text-paper md:block">
          Outer skin · {outerSkin.cavityMm} mm cavity
        </div>
      ) : null}
      <div
        className="no-print pointer-events-none absolute left-3 hidden rounded bg-ink/80 px-2 py-1 font-mono text-[11px] text-paper md:block"
        style={{ bottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
        zoom {zoom.toFixed(2)} · 40 px = 1 m · snap 100 mm · pinch to zoom
      </div>
      <div className="no-print absolute right-3 top-3 hidden gap-1 md:flex">
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
  const stroke = draft.blocked ? '#b42318' : draft.clamped ? '#c45c26' : '#c45c26'
  return (
    <Line
      points={[mmToPx(draft.a.x), mmToPx(draft.a.y), mmToPx(draft.b.x), mmToPx(draft.b.y)]}
      stroke={stroke}
      strokeWidth={4}
      dash={[8, 6]}
      opacity={draft.blocked ? 0.85 : 1}
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
  onDrag,
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
  onDrag: (which: 'a' | 'b', pt: PointMm) => { point: PointMm }
  onDragEnd: () => void
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
            onDrag={(pt) => onDrag('a', pt)}
            onDragEnd={onDragEnd}
          />
          <Anchor
            x={wall.x2}
            y={wall.y2}
            zoom={zoom}
            onDrag={(pt) => onDrag('b', pt)}
            onDragEnd={onDragEnd}
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
  onDragEnd,
}: {
  x: number
  y: number
  zoom: number
  onDrag: (pt: PointMm) => { point: PointMm }
  onDragEnd: () => void
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
        const raw = { x: e.target.x() * MM_PER_PX, y: e.target.y() * MM_PER_PX }
        const next = onDrag(raw)
        e.target.position({ x: mmToPx(next.point.x), y: mmToPx(next.point.y) })
      }}
      onDragEnd={onDragEnd}
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

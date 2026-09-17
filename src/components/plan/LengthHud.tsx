import { useEffect, useRef } from 'react'
import { formatLengthHud } from '../../calc/units'

export function LiveMeasureLabel({
  left,
  top,
  lengthMm,
  invalid,
  clamped,
}: {
  left: number
  top: number
  lengthMm: number
  invalid?: boolean
  clamped?: boolean
}) {
  const { metres, millimetres } = formatLengthHud(lengthMm)
  return (
    <div
      className={`pointer-events-none absolute z-10 min-w-[7.5rem] rounded-md px-2 py-1 font-mono text-[11px] shadow-md ${
        invalid ? 'bg-red-800 text-white' : clamped ? 'bg-accent text-white' : 'bg-ink/90 text-paper'
      }`}
      style={{ left, top }}
    >
      <p className="text-sm font-medium">{metres}</p>
      <p className="text-[10px] opacity-80">{millimetres}</p>
      {invalid ? <p className="mt-0.5 text-[10px]">Can’t cross a wall</p> : null}
      {clamped && !invalid ? <p className="mt-0.5 text-[10px]">Stopped at wall</p> : null}
    </div>
  )
}

export function LengthEntry({
  title,
  lengthMm,
  value,
  onChange,
  onApply,
  onFlip,
  invalid,
  hint,
  autoFocus,
}: {
  title: string
  lengthMm: number
  value: string
  onChange: (v: string) => void
  onApply: () => void
  onFlip?: () => void
  invalid?: boolean
  hint?: string
  autoFocus?: boolean
}) {
  const ref = useRef<HTMLInputElement>(null)
  const { metres, millimetres } = formatLengthHud(lengthMm)

  useEffect(() => {
    if (autoFocus) ref.current?.focus()
  }, [autoFocus])

  return (
    <form
      data-plan-hud
      className="pointer-events-auto flex max-w-[min(100%,24rem)] flex-wrap items-end gap-2 rounded-md border border-line bg-card/95 px-2 py-1.5 shadow-md"
      onPointerDown={(e) => e.stopPropagation()}
      onSubmit={(e) => {
        e.preventDefault()
        onApply()
      }}
    >
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-wider text-ink-soft">{title}</p>
        <p className="font-mono text-[11px] text-ink-soft">
          {metres} · {millimetres}
        </p>
      </div>
      <label className="flex min-w-0 flex-col">
        <span className="sr-only">Length in millimetres or metres</span>
        <input
          ref={ref}
          type="text"
          inputMode="decimal"
          placeholder="e.g. 2400 or 2.4m"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`touch-target w-[8.5rem] rounded-md border bg-paper px-2 text-base outline-none focus:border-accent ${
            invalid ? 'border-red-600' : 'border-line'
          }`}
        />
      </label>
      <button
        type="submit"
        className="touch-target rounded-md bg-ink px-3 text-sm font-medium text-paper"
      >
        Apply
      </button>
      {onFlip ? (
        <button
          type="button"
          onClick={onFlip}
          className="touch-target rounded-md border border-line px-3 text-sm"
        >
          Flip
        </button>
      ) : null}
      {hint ? <p className="basis-full text-[10px] text-ink-soft">{hint}</p> : null}
    </form>
  )
}

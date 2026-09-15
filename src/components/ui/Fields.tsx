import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'

export function TextField({
  label,
  hint,
  ...props
}: {
  label: string
  hint?: string
} & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-medium uppercase tracking-wider text-ink-soft">{label}</span>
      <input
        type="text"
        {...props}
        className="touch-target w-full rounded-md border border-line bg-paper px-3 text-sm outline-none focus:border-accent"
      />
      {hint ? <span className="text-[11px] text-ink-soft">{hint}</span> : null}
    </label>
  )
}

export function NumberField({
  label,
  hint,
  unit,
  ...props
}: {
  label: string
  hint?: string
  unit?: string
} & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-medium uppercase tracking-wider text-ink-soft">{label}</span>
      <span className="flex items-center gap-2">
        <input
          type="number"
          {...props}
          className="touch-target w-full rounded-md border border-line bg-paper px-3 text-sm outline-none focus:border-accent"
        />
        {unit ? <span className="min-w-10 shrink-0 text-xs text-ink-soft">{unit}</span> : null}
      </span>
      {hint ? <span className="text-[11px] text-ink-soft">{hint}</span> : null}
    </label>
  )
}

export function SelectField({
  label,
  children,
  ...props
}: {
  label: string
  children: ReactNode
} & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-medium uppercase tracking-wider text-ink-soft">{label}</span>
      <select
        {...props}
        className="touch-target w-full rounded-md border border-line bg-paper px-3 text-sm outline-none focus:border-accent"
      >
        {children}
      </select>
    </label>
  )
}

export function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-line bg-paper px-3 py-2">
      <p className="text-[11px] font-medium uppercase tracking-wider text-ink-soft">{label}</p>
      <p className="font-mono text-base font-medium text-ink">{value}</p>
      {hint ? <p className="text-[11px] text-ink-soft">{hint}</p> : null}
    </div>
  )
}

const HEX6 = /^#[0-9a-fA-F]{6}$/

export function ColorField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string
  hint?: string
  value: string
  onChange: (hex: string) => void
}) {
  const pickerValue = HEX6.test(value) ? value : '#f4f1e8'
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-medium uppercase tracking-wider text-ink-soft">{label}</span>
      <span className="flex items-center gap-2">
        <input
          type="color"
          value={pickerValue}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 w-14 shrink-0 cursor-pointer rounded-md border border-line bg-paper p-1"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          className="touch-target w-full rounded-md border border-line bg-paper px-3 font-mono text-sm outline-none focus:border-accent"
        />
      </span>
      {hint ? <span className="text-[11px] text-ink-soft">{hint}</span> : null}
    </label>
  )
}

export function CheckField({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        className="h-4 w-4 accent-accent"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  )
}

export function Notes({ notes }: { notes: string[] }) {
  if (notes.length === 0) return null
  return (
    <ul className="list-disc space-y-1 pl-4 text-xs text-ink-soft">
      {notes.map((n) => (
        <li key={n}>{n}</li>
      ))}
    </ul>
  )
}

export function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-card p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  )
}

import { useEffect, useMemo } from 'react'
import { Controller } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { registryField, useSpeciesForm, type RegField } from '../lib/fieldForm'
import { valText, type Forms } from '../lib/forms'
import { W } from '../lib/words'

// The two data panes of layout A (R3): the parts on the left, the selected part's fields on the right. The fields are read only here: the labels, help and bands come from the schema through the form registry,
// the values from the form that holds the file. R7 turns the same fields into controls.
export const firstPart = (forms: Forms | undefined): string | null => forms?.outline.find((r) => r.kind !== 'section')?.id ?? forms?.outline[0]?.id ?? null

export function PartsPane({ forms, sel, onSelect, rail }: { forms: Forms | undefined; sel: string | null; onSelect: (id: string) => void; rail: boolean }) {
  const rows = forms?.outline ?? []
  return (
    <nav className="flex flex-col gap-0.5" aria-label="Parts list">
      {rows.map((r) => (
        <button key={r.id} type="button" onClick={() => onSelect(r.id)} aria-current={sel === r.id ? 'true' : undefined} data-part={r.id}
          className={cn('flex min-h-10 items-center gap-2 rounded-lg px-3 text-left text-[15px] text-muted-foreground outline-none transition-colors hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50', rail && 'justify-center px-1 text-center text-sm leading-tight', r.under && !rail && 'ml-4', r.kind === 'section' && 'text-faint', sel === r.id && 'bg-accent font-medium text-foreground')}>
          {r.sw && !rail && <i className="size-3 shrink-0 rounded-full" style={{ background: r.sw }} />}
          <span className={rail ? 'break-words' : 'truncate'}>{r.label}</span>
        </button>
      ))}
    </nav>
  )
}

const show = (f: RegField, v: unknown): string =>
  typeof v === 'number' ? valText(v, f.unit) : Array.isArray(v) ? v.map((x) => (typeof x === 'number' ? valText(x) : String(x))).join(', ') + (f.unit ? ` ${f.unit}` : '') : v === undefined || v === null ? '' : String(v)

export function FieldsPane({ file, forms, sel }: { file: Record<string, unknown>; forms: Forms | undefined; sel: string | null }) {
  const part = sel && forms ? forms.parts[sel] : undefined
  const schemaId = String(file.schema ?? 'mb-species/2')
  const fields = useMemo(() => (part?.fields ?? []).map((d) => registryField(schemaId, String(file.plan ?? ''), d)), [part, schemaId, file.plan])
  const form = useSpeciesForm(file, fields)
  const { trigger } = form
  useEffect(() => { void trigger(fields.map((f) => f.name)) }, [trigger, fields, file])
  const err = form.formState.errors
  const errOf = (name: string) => name.split('.').reduce<unknown>((e, t) => (e as Record<string, unknown> | undefined)?.[t], err) as { message?: string } | undefined
  return (
    <>
      <h2 className="text-xl font-semibold">{part?.label ?? 'Fields'}</h2>
      {!part && <p className="text-sm text-faint">Choose a part to see its fields.</p>}
      {part && !fields.length && <p className="text-sm text-faint">{W.nothing}</p>}
      <form className="flex min-h-0 flex-col gap-4 overflow-y-auto pb-4" onSubmit={(e) => e.preventDefault()} aria-label={`${part?.label ?? 'Part'} fields`}>
        {fields.map((f) => {
          const bad = errOf(f.name)
          return (
            <div key={f.id} className="flex flex-col gap-1.5" data-field={f.id}>
              <div className="flex items-baseline justify-between gap-3">
                <Label htmlFor={`r3-${f.id}`} className="text-[15px]">{f.label}</Label>
                {f.range && <span className="text-sm text-faint">{f.range[0]} to {f.range[1]}</span>}
              </div>
              <Controller control={form.control} name={f.name} render={({ field }) => (
                <Input id={`r3-${f.id}`} readOnly aria-invalid={!!bad || undefined} aria-describedby={`r3h-${f.id}`} className="h-10 text-[15px]" value={show(f, field.value)} onChange={() => {}} onBlur={field.onBlur} ref={field.ref} />
              )} />
              {bad?.message ? <p id={`r3h-${f.id}`} role="alert" className="text-sm text-destructive">{bad.message}</p> : <p id={`r3h-${f.id}`} className="text-sm text-faint">{f.meta?.help || f.help}</p>}
            </div>
          )
        })}
      </form>
    </>
  )
}

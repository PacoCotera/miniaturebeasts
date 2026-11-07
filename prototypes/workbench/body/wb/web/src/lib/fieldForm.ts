import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo } from 'react'
import { set, useForm, type FieldValues, type Resolver } from 'react-hook-form'
import { fieldMeta, schemaPathOfPtr, SCHEMAS, validateSpecies, type FieldMeta } from './speciesSchema'
import type { FieldDesc } from './forms'

// The form registry (R3). Every editable field is a react-hook-form field named by its place in the file: the pointer '/rig/bones/3/len' is the name 'rig.bones.3.len', so the form's values are the file's own shape and
// nothing is mapped back. The resolver is the species zod schema (made from the server's schema, through zodResolver) and the plan's bands on top, so a field turns red in the browser first; the server's refusal stays the record.
export const nameOfPtr = (ptr: string): string => ptr.split('/').slice(1).join('.')

// The control a field's kind picks (the page keeps no list of fields: the server's forms and the schema say which fields a part has and what each one is).
export type Control = 'number' | 'choice' | 'text' | 'vector' | 'weights' | 'switch' | 'none'
export const controlOf = (kind: string): Control => ({ number: 'number', int: 'number', enum: 'choice', text: 'text', vec3: 'vector', pair: 'vector', bool: 'switch', weights: 'weights' } as Record<string, Control>)[kind] ?? 'none'

/** What the registry says of a field the server's forms offer: the schema's words and band for its pointer, over the forms' own label (a mesh bone's name is the forms' to make). */
export type RegField = FieldDesc & { meta: FieldMeta | undefined; name: string; control: Control }
export function registryField(schemaId: string, plan: string | undefined, d: FieldDesc): RegField {
  const meta = fieldMeta(schemaId, schemaPathOfPtr(d.ptr), plan)
  return { ...d, meta, name: nameOfPtr(d.ptr), control: controlOf(d.type) }
}

// A message without the field's path in front: the label above it says which field.
export const plainMessage = (m: string): string => m.replace(/^[^:\s]+: /, '')

/** The species resolver: zod's structural answer for the file, in the server's words, plus the plan's bands. An error is placed by the form field's own dotted name; a fault in a field this form does not show is not its to report. */
export function speciesResolver(doc: Record<string, unknown>, idToName: Record<string, string>): Resolver<FieldValues> {
  const zod = SCHEMAS[String(doc.schema)]?.zod
  if (!zod) return async (values) => ({ values, errors: {} })                    // the file has not arrived yet
  const structure = zodResolver(zod as never) as Resolver<FieldValues>
  return async (values, ctx, opts) => {
    await structure(values, ctx, opts)                                          // zod's own pass over the file (its issues are re-said below in the server's words)
    const errors: Record<string, unknown> = {}
    for (const p of validateSpecies(values)) {
      const name = idToName[p.path]
      if (name) set(errors, name, { type: 'server', message: plainMessage(p.message) })
    }
    return Object.keys(errors).length ? { values: {}, errors: errors as never } : { values, errors: {} }
  }
}

/** One form over a species file: its values are the file, its resolver the species schema, its fields the registry's. The panes of R3 only show it; R7 turns editing on. */
export function useSpeciesForm(file: Record<string, unknown>, fields: RegField[]) {
  const idToName = useMemo(() => Object.fromEntries(fields.map((f) => [f.id, f.name])), [fields])
  const resolver = useMemo(() => speciesResolver(file, idToName), [file, idToName])
  return useForm<FieldValues>({ values: file, resolver, mode: 'onChange' })
}

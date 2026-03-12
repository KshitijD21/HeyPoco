'use client'

import { useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Check, X } from 'lucide-react'
import { useEntryStore } from '@/stores/entry-store'
import { useCreateEntry } from '@/hooks/use-entries'
import { createEntrySchema, type CreateEntryFormData } from '@/utils/validation'
import { getEntryTypeLabel, getEntryTypeIcon, formatCurrency } from '@/utils/format'
import { cn } from '@/lib/utils'

export function ConfirmationCard() {
  const { pendingEntry, clearPendingEntry } = useEntryStore()
  const createEntry = useCreateEntry()

  const form = useForm<CreateEntryFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(createEntrySchema) as any,
    values: pendingEntry
      ? {
          type: pendingEntry.extract.type,
          raw_text: pendingEntry.raw_text,
          extracted_fields: pendingEntry.extract.extracted_fields,
          tags: pendingEntry.extract.tags,
          attachments: [],
        }
      : undefined,
  })

  const onSubmit = useCallback(
    async (data: CreateEntryFormData) => {
      try {
        await createEntry.mutateAsync(data)
        clearPendingEntry()
      } catch (err) {
        console.error('Failed to save entry:', err)
      }
    },
    [createEntry, clearPendingEntry]
  )

  if (!pendingEntry) return null

  const { extract } = pendingEntry
  const fields = extract.extracted_fields

  return (
    <div className="animate-in slide-in-from-bottom-4 fade-in w-full max-w-md duration-300">
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="border-black/8 rounded-2xl border bg-white p-5 shadow-sm backdrop-blur-sm"
      >
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{getEntryTypeIcon(extract.type)}</span>
            <span className="text-sm font-medium text-black/80">
              {getEntryTypeLabel(extract.type)}
            </span>
            <span className="rounded-full bg-black/5 px-2 py-0.5 text-xs text-black/40">
              {Math.round(extract.confidence * 100)}% sure
            </span>
          </div>
          <button
            type="button"
            onClick={clearPendingEntry}
            className="text-black/40 transition-colors hover:text-black/70"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Raw text */}
        <p className="mb-4 text-sm leading-relaxed text-black/70">
          &ldquo;{pendingEntry.raw_text}&rdquo;
        </p>

        {/* Extracted fields */}
        <div className="mb-4 space-y-2">
          {/* Finance */}
          {fields.amount != null && (
            <FieldRow
              label="Amount"
              value={formatCurrency(fields.amount, fields.currency || 'USD')}
            />
          )}
          {fields.merchant && <FieldRow label="Merchant" value={fields.merchant} />}
          {fields.category && <FieldRow label="Category" value={fields.category} />}
          {/* Journal */}
          {fields.mood && <FieldRow label="Mood" value={fields.mood} />}
          {fields.energy && <FieldRow label="Energy" value={fields.energy} />}
          {/* Task */}
          {fields.action && <FieldRow label="Action" value={fields.action} />}
          {fields.deadline && <FieldRow label="Deadline" value={fields.deadline} />}
          {fields.status && <FieldRow label="Status" value={fields.status} />}
          {/* Event */}
          {fields.title && <FieldRow label="Title" value={fields.title} />}
          {fields.scheduled_at && <FieldRow label="Scheduled" value={fields.scheduled_at} />}
          {fields.location && <FieldRow label="Location" value={fields.location} />}
          {fields.duration_minutes != null && (
            <FieldRow label="Duration" value={`${fields.duration_minutes} min`} />
          )}
          {/* Health */}
          {fields.symptom && <FieldRow label="Symptom" value={fields.symptom} />}
          {fields.medication && <FieldRow label="Medication" value={fields.medication} />}
          {fields.severity && <FieldRow label="Severity" value={fields.severity} />}
          {/* Shared */}
          {fields.person && <FieldRow label="Person" value={fields.person} />}
          {fields.topic && <FieldRow label="Topic" value={fields.topic} />}
          {fields.project && <FieldRow label="Project" value={fields.project} />}
          {fields.notes && <FieldRow label="Notes" value={fields.notes} />}
        </div>

        {/* Tags */}
        {extract.tags.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-1.5">
            {extract.tags.map((tag) => (
              <span
                key={tag}
                className="border-black/8 rounded-full border bg-[#f5f4f0] px-2 py-0.5 text-xs text-black/40"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={createEntry.isPending}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium transition-all',
              'bg-black text-white',
              'hover:bg-black/80',
              'disabled:cursor-not-allowed disabled:opacity-50'
            )}
          >
            <Check className="h-4 w-4" />
            {createEntry.isPending ? 'Saving...' : 'Save'}
          </button>
          <button
            type="button"
            onClick={clearPendingEntry}
            className="flex items-center justify-center gap-2 rounded-xl border border-black/15 px-4 py-2.5 text-sm text-black/50 transition-colors hover:border-black/30 hover:text-black/80"
          >
            <X className="h-4 w-4" />
            Discard
          </button>
        </div>

        {/* Error */}
        {createEntry.isError && (
          <p className="mt-3 text-center text-xs text-red-400">Failed to save. Please try again.</p>
        )}
      </form>
    </div>
  )
}

function FieldRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-black/40">{label}</span>
      <span className="font-medium text-black/80">{value}</span>
    </div>
  )
}

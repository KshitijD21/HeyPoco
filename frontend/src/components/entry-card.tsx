'use client'

import type { Entry } from '@/types'
import {
  getEntryTypeIcon,
  getEntryTypeLabel,
  formatRelativeTime,
  formatCurrency,
} from '@/utils/format'

interface EntryCardProps {
  entry: Entry
}

export function EntryCard({ entry }: EntryCardProps) {
  const fields = entry.extracted_fields

  return (
    <div className="border-black/8 group rounded-2xl border bg-white p-4 transition-all duration-200 hover:border-black/15 hover:shadow-sm">
      {/* Header row */}
      <div className="mb-2 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">{getEntryTypeIcon(entry.type)}</span>
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-black/40">
            {getEntryTypeLabel(entry.type)}
          </span>
        </div>
        <span className="text-xs text-black/30">{formatRelativeTime(entry.created_at)}</span>
      </div>

      {/* Raw text */}
      <p className="mb-3 text-sm leading-relaxed text-black/70">{entry.raw_text}</p>

      {/* Key extracted values */}
      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1">
        {/* Finance */}
        {fields.amount != null && (
          <span className="text-sm font-semibold text-emerald-700">
            {formatCurrency(fields.amount, fields.currency || 'USD')}
          </span>
        )}
        {fields.merchant && <span className="text-sm text-black/50">{fields.merchant}</span>}
        {fields.category && <span className="text-sm text-black/40">{fields.category}</span>}
        {/* Journal */}
        {fields.mood && <span className="text-sm text-black/50">Mood: {fields.mood}</span>}
        {fields.energy && <span className="text-sm text-black/50">Energy: {fields.energy}</span>}
        {/* Task */}
        {fields.action && <span className="text-sm text-black/60">{fields.action}</span>}
        {fields.deadline && <span className="text-sm text-black/40">Due: {fields.deadline}</span>}
        {fields.status && <span className="text-sm text-black/40">{fields.status}</span>}
        {/* Event */}
        {fields.title && <span className="text-sm font-medium text-black/60">{fields.title}</span>}
        {fields.scheduled_at && (
          <span className="text-sm text-black/40">{fields.scheduled_at}</span>
        )}
        {fields.location && <span className="text-sm text-black/40">📍 {fields.location}</span>}
        {/* Health */}
        {fields.symptom && <span className="text-sm text-black/50">{fields.symptom}</span>}
        {fields.medication && <span className="text-sm text-black/50">💊 {fields.medication}</span>}
        {fields.severity && <span className="text-sm text-black/40">{fields.severity}</span>}
        {/* Shared */}
        {fields.person && <span className="text-sm text-black/50">{fields.person}</span>}
        {fields.topic && <span className="text-sm text-black/40">{fields.topic}</span>}
        {fields.project && <span className="text-sm text-black/40">📂 {fields.project}</span>}
      </div>

      {/* Tags */}
      {entry.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {entry.tags.map((tag) => (
            <span
              key={tag}
              className="border-black/8 rounded-full border bg-[#f5f4f0] px-2 py-0.5 text-xs text-black/40"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

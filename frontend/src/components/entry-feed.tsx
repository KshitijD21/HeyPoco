'use client'

import { useEntries } from '@/hooks/use-entries'
import { useEntryStore } from '@/stores/entry-store'
import { EntryCard } from '@/components/entry-card'
import { groupEntriesByDate, formatDayLabel } from '@/utils/format'
import { Loader2 } from 'lucide-react'

export function EntryFeed() {
  const { activeFilter } = useEntryStore()

  const { data, isLoading, error } = useEntries({
    type: activeFilter ?? undefined,
    limit: 50,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-black/30" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm text-red-400">Failed to load entries.</p>
        <p className="mt-1 text-xs text-black/30">
          {error instanceof Error ? error.message : 'Unknown error'}
        </p>
      </div>
    )
  }

  const entries = data?.entries || []

  if (entries.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="mb-3 text-4xl">🎙️</p>
        <p className="text-sm text-black/50">Nothing logged yet.</p>
        <p className="mt-1 text-xs text-black/30">Tap the mic and start speaking.</p>
      </div>
    )
  }

  const grouped = groupEntriesByDate(entries)

  return (
    <div className="space-y-8">
      {Array.from(grouped.entries()).map(([dateKey, dayEntries]) => (
        <section key={dateKey}>
          <h3 className="sticky top-0 z-10 mb-3 bg-[#f5f4f0]/90 py-2 text-xs font-bold uppercase tracking-[0.2em] text-black/40 backdrop-blur-sm">
            {formatDayLabel(dayEntries[0].created_at)}
          </h3>
          <div className="space-y-3">
            {dayEntries.map((entry) => (
              <EntryCard key={entry.id} entry={entry} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

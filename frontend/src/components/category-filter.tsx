'use client'

import { EntryType } from '@/types'
import { useEntryStore } from '@/stores/entry-store'
import { getEntryTypeLabel, getEntryTypeIcon } from '@/utils/format'
import { cn } from '@/lib/utils'

const CATEGORIES = [
  { type: null, label: 'All', icon: '📋' },
  {
    type: EntryType.FINANCE,
    label: getEntryTypeLabel(EntryType.FINANCE),
    icon: getEntryTypeIcon(EntryType.FINANCE),
  },
  {
    type: EntryType.JOURNAL,
    label: getEntryTypeLabel(EntryType.JOURNAL),
    icon: getEntryTypeIcon(EntryType.JOURNAL),
  },
  {
    type: EntryType.TASK,
    label: getEntryTypeLabel(EntryType.TASK),
    icon: getEntryTypeIcon(EntryType.TASK),
  },
  {
    type: EntryType.EVENT,
    label: getEntryTypeLabel(EntryType.EVENT),
    icon: getEntryTypeIcon(EntryType.EVENT),
  },
  {
    type: EntryType.NOTE,
    label: getEntryTypeLabel(EntryType.NOTE),
    icon: getEntryTypeIcon(EntryType.NOTE),
  },
  {
    type: EntryType.HEALTH,
    label: getEntryTypeLabel(EntryType.HEALTH),
    icon: getEntryTypeIcon(EntryType.HEALTH),
  },
  {
    type: EntryType.GENERAL,
    label: getEntryTypeLabel(EntryType.GENERAL),
    icon: getEntryTypeIcon(EntryType.GENERAL),
  },
]

export function CategoryFilter() {
  const { activeFilter, setActiveFilter } = useEntryStore()

  return (
    <div className="scrollbar-hide flex gap-2 overflow-x-auto pb-2">
      {CATEGORIES.map(({ type, label, icon }) => {
        const isActive = activeFilter === type
        return (
          <button
            key={label}
            onClick={() => setActiveFilter(type)}
            className={cn(
              'flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-200',
              isActive
                ? 'border border-black bg-black text-white'
                : 'border-black/8 border bg-[#f5f4f0] text-black/50 hover:bg-black/5 hover:text-black/70'
            )}
          >
            <span>{icon}</span>
            {label}
          </button>
        )
      })}
    </div>
  )
}

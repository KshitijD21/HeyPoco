"use client";

import { EntryType } from "@/types";
import { useEntryStore } from "@/stores/entry-store";
import { getEntryTypeLabel, getEntryTypeIcon } from "@/utils/format";
import { cn } from "@/lib/utils";

const CATEGORIES = [
    { type: null, label: "All", icon: "📋" },
    { type: EntryType.FINANCE, label: getEntryTypeLabel(EntryType.FINANCE), icon: getEntryTypeIcon(EntryType.FINANCE) },
    { type: EntryType.LINK, label: getEntryTypeLabel(EntryType.LINK), icon: getEntryTypeIcon(EntryType.LINK) },
    { type: EntryType.CAREER, label: getEntryTypeLabel(EntryType.CAREER), icon: getEntryTypeIcon(EntryType.CAREER) },
    { type: EntryType.DOCUMENT, label: getEntryTypeLabel(EntryType.DOCUMENT), icon: getEntryTypeIcon(EntryType.DOCUMENT) },
    { type: EntryType.GENERAL, label: getEntryTypeLabel(EntryType.GENERAL), icon: getEntryTypeIcon(EntryType.GENERAL) },
];

export function CategoryFilter() {
    const { activeFilter, setActiveFilter } = useEntryStore();

    return (
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {CATEGORIES.map(({ type, label, icon }) => {
                const isActive = activeFilter === type;
                return (
                    <button
                        key={label}
                        onClick={() => setActiveFilter(type)}
                        className={cn(
                            "flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-200",
                            isActive
                                ? "bg-violet-500/20 text-violet-300 border border-violet-500/30"
                                : "bg-zinc-800/50 text-zinc-400 border border-zinc-700/50 hover:bg-zinc-700/50 hover:text-zinc-300",
                        )}
                    >
                        <span>{icon}</span>
                        {label}
                    </button>
                );
            })}
        </div>
    );
}

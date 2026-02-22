"use client";

import { useEntries } from "@/hooks/use-entries";
import { useEntryStore } from "@/stores/entry-store";
import { EntryCard } from "@/components/entry-card";
import { groupEntriesByDate, formatDayLabel } from "@/utils/format";
import { Loader2 } from "lucide-react";

export function EntryFeed() {
    const { activeFilter } = useEntryStore();

    const { data, isLoading, error } = useEntries({
        type: activeFilter ?? undefined,
        limit: 50,
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-6 w-6 text-zinc-500 animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-20">
                <p className="text-sm text-red-400">Failed to load entries.</p>
                <p className="text-xs text-zinc-500 mt-1">
                    {error instanceof Error ? error.message : "Unknown error"}
                </p>
            </div>
        );
    }

    const entries = data?.entries || [];

    if (entries.length === 0) {
        return (
            <div className="text-center py-20">
                <p className="text-4xl mb-3">🎙️</p>
                <p className="text-sm text-zinc-400">Nothing logged yet.</p>
                <p className="text-xs text-zinc-600 mt-1">
                    Tap the mic and start speaking.
                </p>
            </div>
        );
    }

    const grouped = groupEntriesByDate(entries);

    return (
        <div className="space-y-8">
            {Array.from(grouped.entries()).map(([dateKey, dayEntries]) => (
                <section key={dateKey}>
                    <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3 sticky top-0 bg-zinc-950/80 backdrop-blur-sm py-2 z-10">
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
    );
}

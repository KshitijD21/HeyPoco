"use client";

import type { Entry } from "@/types";
import {
    getEntryTypeIcon,
    getEntryTypeLabel,
    formatRelativeTime,
    formatCurrency,
} from "@/utils/format";

interface EntryCardProps {
    entry: Entry;
}

export function EntryCard({ entry }: EntryCardProps) {
    const fields = entry.extracted_fields;

    return (
        <div className="group rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 hover:border-zinc-700 hover:bg-zinc-800/50 transition-all duration-200">
            {/* Header row */}
            <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                    <span className="text-base">{getEntryTypeIcon(entry.type)}</span>
                    <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                        {getEntryTypeLabel(entry.type)}
                    </span>
                </div>
                <span className="text-xs text-zinc-600">{formatRelativeTime(entry.created_at)}</span>
            </div>

            {/* Raw text */}
            <p className="text-sm text-zinc-300 leading-relaxed mb-3">{entry.raw_text}</p>

            {/* Key extracted values */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3">
                {fields.amount != null && (
                    <span className="text-sm font-semibold text-emerald-400">
                        {formatCurrency(fields.amount, fields.currency || "USD")}
                    </span>
                )}
                {fields.merchant && (
                    <span className="text-sm text-zinc-400">{fields.merchant}</span>
                )}
                {fields.company && (
                    <span className="text-sm text-zinc-400">{fields.company}</span>
                )}
                {fields.role && (
                    <span className="text-sm text-violet-400">{fields.role}</span>
                )}
                {fields.url && (
                    <a
                        href={fields.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-400 hover:underline truncate max-w-[200px]"
                    >
                        {new URL(fields.url).hostname}
                    </a>
                )}
            </div>

            {/* Tags */}
            {entry.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {entry.tags.map((tag) => (
                        <span
                            key={tag}
                            className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full border border-zinc-700/50"
                        >
                            #{tag}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}

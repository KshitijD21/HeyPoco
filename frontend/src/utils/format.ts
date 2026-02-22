import { EntryType } from "@/types";

/**
 * Format a number as currency.
 */
export function formatCurrency(amount: number, currency = "USD"): string {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        minimumFractionDigits: 2,
    }).format(amount);
}

/**
 * Format an ISO date string as a human-readable relative time (e.g., "2 hours ago").
 */
export function formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffSec < 60) return "just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;

    return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
}

/**
 * Format a date string as a day label for feed grouping.
 */
export function formatDayLabel(dateString: string): string {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

    return date.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
    });
}

/**
 * Group entries by their creation date (day).
 */
export function groupEntriesByDate<T extends { created_at: string }>(
    entries: T[],
): Map<string, T[]> {
    const groups = new Map<string, T[]>();

    for (const entry of entries) {
        const dayKey = new Date(entry.created_at).toDateString();
        const existing = groups.get(dayKey) || [];
        existing.push(entry);
        groups.set(dayKey, existing);
    }

    return groups;
}

/**
 * Format duration in seconds to mm:ss display.
 */
export function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Get a human-friendly label for an entry type.
 */
export function getEntryTypeLabel(type: EntryType): string {
    const labels: Record<EntryType, string> = {
        [EntryType.FINANCE]: "Finance",
        [EntryType.LINK]: "Link",
        [EntryType.CAREER]: "Career",
        [EntryType.DOCUMENT]: "Document",
        [EntryType.GENERAL]: "General",
    };
    return labels[type] || type;
}

/**
 * Get an emoji icon for an entry type.
 */
export function getEntryTypeIcon(type: EntryType): string {
    const icons: Record<EntryType, string> = {
        [EntryType.FINANCE]: "💰",
        [EntryType.LINK]: "🔗",
        [EntryType.CAREER]: "💼",
        [EntryType.DOCUMENT]: "📄",
        [EntryType.GENERAL]: "📝",
    };
    return icons[type] || "📝";
}

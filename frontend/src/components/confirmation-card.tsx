"use client";

import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, X } from "lucide-react";
import { useEntryStore } from "@/stores/entry-store";
import { useCreateEntry } from "@/hooks/use-entries";
import { createEntrySchema, type CreateEntryFormData } from "@/utils/validation";
import { getEntryTypeLabel, getEntryTypeIcon, formatCurrency } from "@/utils/format";
import { cn } from "@/lib/utils";

export function ConfirmationCard() {
    const { pendingEntry, clearPendingEntry } = useEntryStore();
    const createEntry = useCreateEntry();

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
    });

    const onSubmit = useCallback(
        async (data: CreateEntryFormData) => {
            try {
                await createEntry.mutateAsync(data);
                clearPendingEntry();
            } catch (err) {
                console.error("Failed to save entry:", err);
            }
        },
        [createEntry, clearPendingEntry],
    );

    if (!pendingEntry) return null;

    const { extract } = pendingEntry;
    const fields = extract.extracted_fields;

    return (
        <div className="w-full max-w-md animate-in slide-in-from-bottom-4 fade-in duration-300">
            <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="rounded-2xl border border-zinc-700/50 bg-zinc-800/80 backdrop-blur-sm p-5 shadow-xl"
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <span className="text-lg">{getEntryTypeIcon(extract.type)}</span>
                        <span className="text-sm font-medium text-zinc-200">
                            {getEntryTypeLabel(extract.type)}
                        </span>
                        <span className="text-xs text-zinc-500 bg-zinc-700/50 px-2 py-0.5 rounded-full">
                            {Math.round(extract.confidence * 100)}% sure
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={clearPendingEntry}
                        className="text-zinc-500 hover:text-zinc-300 transition-colors"
                        aria-label="Dismiss"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Raw text */}
                <p className="text-sm text-zinc-300 mb-4 leading-relaxed">
                    &ldquo;{pendingEntry.raw_text}&rdquo;
                </p>

                {/* Extracted fields */}
                <div className="space-y-2 mb-4">
                    {fields.amount != null && (
                        <FieldRow
                            label="Amount"
                            value={formatCurrency(fields.amount, fields.currency || "USD")}
                        />
                    )}
                    {fields.merchant && <FieldRow label="Merchant" value={fields.merchant} />}
                    {fields.company && <FieldRow label="Company" value={fields.company} />}
                    {fields.role && <FieldRow label="Role" value={fields.role} />}
                    {fields.url && (
                        <FieldRow
                            label="URL"
                            value={
                                <a
                                    href={fields.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-violet-400 hover:underline truncate block max-w-[200px]"
                                >
                                    {fields.url}
                                </a>
                            }
                        />
                    )}
                    {fields.category && <FieldRow label="Category" value={fields.category} />}
                    {fields.due_date && <FieldRow label="Due" value={fields.due_date} />}
                    {fields.notes && <FieldRow label="Notes" value={fields.notes} />}
                </div>

                {/* Tags */}
                {extract.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                        {extract.tags.map((tag) => (
                            <span
                                key={tag}
                                className="text-xs bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded-full"
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
                            "flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium transition-all",
                            "bg-gradient-to-r from-violet-500 to-indigo-600 text-white",
                            "hover:from-violet-400 hover:to-indigo-500",
                            "disabled:opacity-50 disabled:cursor-not-allowed",
                        )}
                    >
                        <Check className="h-4 w-4" />
                        {createEntry.isPending ? "Saving..." : "Save"}
                    </button>
                    <button
                        type="button"
                        onClick={clearPendingEntry}
                        className="flex items-center justify-center gap-2 rounded-xl border border-zinc-600 px-4 py-2.5 text-sm text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors"
                    >
                        <X className="h-4 w-4" />
                        Discard
                    </button>
                </div>

                {/* Error */}
                {createEntry.isError && (
                    <p className="mt-3 text-xs text-red-400 text-center">
                        Failed to save. Please try again.
                    </p>
                )}
            </form>
        </div>
    );
}

function FieldRow({
    label,
    value,
}: {
    label: string;
    value: React.ReactNode;
}) {
    return (
        <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-500">{label}</span>
            <span className="text-zinc-200 font-medium">{value}</span>
        </div>
    );
}

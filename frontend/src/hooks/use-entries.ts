"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    fetchEntries,
    createEntry,
    updateEntry,
    deleteEntry,
} from "@/lib/api-client";
import type {
    CreateEntryRequest,
    EntryFilterParams,
    UpdateEntryRequest,
} from "@/types";

const ENTRIES_KEY = "entries";

export function useEntries(params: EntryFilterParams = {}) {
    return useQuery({
        queryKey: [ENTRIES_KEY, params],
        queryFn: () => fetchEntries(params),
    });
}

export function useCreateEntry() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateEntryRequest) => createEntry(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [ENTRIES_KEY] });
        },
    });
}

export function useUpdateEntry() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: UpdateEntryRequest }) =>
            updateEntry(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [ENTRIES_KEY] });
        },
    });
}

export function useDeleteEntry() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => deleteEntry(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [ENTRIES_KEY] });
        },
    });
}

"use client";

import { useMutation } from "@tanstack/react-query";
import { queryEntries } from "@/lib/api-client";
import { useState } from "react";
import type { QueryResponse } from "@/types";

export function useQuery_() {
    const [lastResponse, setLastResponse] = useState<QueryResponse | null>(null);

    const mutation = useMutation({
        mutationFn: (question: string) => queryEntries({ question }),
        onSuccess: (data) => {
            setLastResponse(data);
        },
    });

    return {
        ask: mutation.mutate,
        askAsync: mutation.mutateAsync,
        response: lastResponse,
        isLoading: mutation.isPending,
        error: mutation.error,
        reset: () => {
            mutation.reset();
            setLastResponse(null);
        },
    };
}

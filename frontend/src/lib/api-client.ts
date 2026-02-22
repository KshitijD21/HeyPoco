import type {
    CreateEntryRequest,
    Entry,
    EntryFilterParams,
    EntryListResponse,
    ExtractRequest,
    ExtractResponse,
    QueryRequest,
    QueryResponse,
    TranscribeResponse,
    UpdateEntryRequest,
} from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

class ApiError extends Error {
    constructor(
        public status: number,
        message: string,
    ) {
        super(message);
        this.name = "ApiError";
    }
}

async function getAuthHeaders(): Promise<HeadersInit> {
    // Dynamic import to avoid SSR issues
    const { createBrowserClient } = await import("@supabase/ssr");

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    const {
        data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
        throw new ApiError(401, "Not authenticated");
    }

    return {
        Authorization: `Bearer ${session.access_token}`,
    };
}

async function apiFetch<T>(
    endpoint: string,
    options: RequestInit = {},
): Promise<T> {
    const authHeaders = await getAuthHeaders();

    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...authHeaders,
            ...options.headers,
        },
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: "Request failed" }));
        throw new ApiError(response.status, error.detail || `HTTP ${response.status}`);
    }

    if (response.status === 204) {
        return undefined as T;
    }

    return response.json();
}

// ── Transcribe ──────────────────────────────────────────────────────────────

export async function transcribeAudio(audioBlob: Blob): Promise<TranscribeResponse> {
    const authHeaders = await getAuthHeaders();
    const formData = new FormData();
    formData.append("file", audioBlob, "recording.webm");

    const response = await fetch(`${API_BASE}/api/transcribe`, {
        method: "POST",
        headers: authHeaders,
        body: formData,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: "Transcription failed" }));
        throw new ApiError(response.status, error.detail);
    }

    return response.json();
}

// ── Extract ─────────────────────────────────────────────────────────────────

export async function extractEntry(data: ExtractRequest): Promise<ExtractResponse> {
    return apiFetch<ExtractResponse>("/api/extract", {
        method: "POST",
        body: JSON.stringify(data),
    });
}

// ── Entries CRUD ────────────────────────────────────────────────────────────

export async function fetchEntries(params: EntryFilterParams = {}): Promise<EntryListResponse> {
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            searchParams.set(key, String(value));
        }
    });

    const query = searchParams.toString();
    return apiFetch<EntryListResponse>(`/api/entries${query ? `?${query}` : ""}`);
}

export async function createEntry(data: CreateEntryRequest): Promise<Entry> {
    return apiFetch<Entry>("/api/entries", {
        method: "POST",
        body: JSON.stringify(data),
    });
}

export async function updateEntry(id: string, data: UpdateEntryRequest): Promise<Entry> {
    return apiFetch<Entry>(`/api/entries/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
    });
}

export async function deleteEntry(id: string): Promise<void> {
    return apiFetch<void>(`/api/entries/${id}`, {
        method: "DELETE",
    });
}

// ── Query ───────────────────────────────────────────────────────────────────

export async function queryEntries(data: QueryRequest): Promise<QueryResponse> {
    return apiFetch<QueryResponse>("/api/query", {
        method: "POST",
        body: JSON.stringify(data),
    });
}

// ── Entry Types ──────────────────────────────────────────────────────────────

export enum EntryType {
    FINANCE = "finance",
    LINK = "link",
    CAREER = "career",
    DOCUMENT = "document",
    GENERAL = "general",
}

export interface ExtractedFields {
    amount?: number | null;
    currency?: string | null;
    merchant?: string | null;
    category?: string | null;
    company?: string | null;
    role?: string | null;
    url?: string | null;
    filename?: string | null;
    due_date?: string | null;
    notes?: string | null;
}

export interface Entry {
    id: string;
    user_id: string;
    type: EntryType;
    raw_text: string;
    extracted_fields: ExtractedFields;
    tags: string[];
    attachments: string[];
    created_at: string;
    updated_at: string;
}

// ── API Request Types ───────────────────────────────────────────────────────

export interface CreateEntryRequest {
    type: EntryType;
    raw_text: string;
    extracted_fields: ExtractedFields;
    tags: string[];
    attachments?: string[];
}

export interface UpdateEntryRequest {
    type?: EntryType;
    raw_text?: string;
    extracted_fields?: ExtractedFields;
    tags?: string[];
    attachments?: string[];
}

export interface ExtractRequest {
    raw_text: string;
}

export interface QueryRequest {
    question: string;
}

export interface EntryFilterParams {
    type?: EntryType;
    tag?: string;
    date_from?: string;
    date_to?: string;
    search?: string;
    limit?: number;
    offset?: number;
}

// ── API Response Types ──────────────────────────────────────────────────────

export interface TranscribeResponse {
    transcript: string;
}

export interface ExtractResponse {
    type: EntryType;
    extracted_fields: ExtractedFields;
    tags: string[];
    confidence: number;
}

export interface EntryListResponse {
    entries: Entry[];
    total: number;
    limit: number;
    offset: number;
}

export interface QueryResponse {
    answer: string;
    sources: Entry[];
    has_data: boolean;
}

// ── UI State Types ──────────────────────────────────────────────────────────

export type RecordingState = "idle" | "recording" | "processing" | "error";

export interface PendingEntry {
    raw_text: string;
    extract: ExtractResponse;
}

// ── Entry Types ──────────────────────────────────────────────────────────────

export enum EntryType {
  FINANCE = 'finance',
  JOURNAL = 'journal',
  TASK = 'task',
  EVENT = 'event',
  NOTE = 'note',
  HEALTH = 'health',
  GENERAL = 'general',
}

export interface ExtractedFields {
  // Finance
  amount?: number | null
  currency?: string | null
  merchant?: string | null
  category?: string | null
  breakdown?: Array<Record<string, unknown>> | null
  // Journal
  mood?: string | null
  energy?: string | null
  highlights?: string[] | null
  // Task
  action?: string | null
  deadline?: string | null
  status?: string | null
  // Event
  title?: string | null
  scheduled_at?: string | null
  location?: string | null
  duration_minutes?: number | null
  reminder?: boolean | null
  // Shared
  person?: string | null
  people?: string[] | null
  topic?: string | null
  project?: string | null
  symptom?: string | null
  medication?: string | null
  severity?: string | null
  time?: string | null
  notes?: string | null
}

export interface Entry {
  id: string
  user_id: string
  type: EntryType
  raw_text: string
  extracted_fields: ExtractedFields
  tags: string[]
  attachments: string[]
  entry_date?: string | null
  source?: string | null
  is_sensitive?: boolean
  pii_types?: string[]
  created_at: string
  updated_at: string
  // Returned by match_entries() vector search — absent on SQL-only results
  similarity?: number | null
}

// ── API Request Types ───────────────────────────────────────────────────────

export interface CreateEntryRequest {
  type: EntryType
  raw_text: string
  extracted_fields: ExtractedFields
  tags: string[]
  attachments?: string[]
}

export interface UpdateEntryRequest {
  type?: EntryType
  raw_text?: string
  extracted_fields?: ExtractedFields
  tags?: string[]
  attachments?: string[]
}

export interface ExtractRequest {
  raw_text: string
}

export interface QueryRequest {
  question: string
}

export interface EntryFilterParams {
  type?: EntryType
  tag?: string
  date_from?: string
  date_to?: string
  search?: string
  limit?: number
  offset?: number
}

// ── API Response Types ──────────────────────────────────────────────────────

export interface TranscribeResponse {
  transcript: string
}

export interface ExtractResponse {
  type: EntryType
  extracted_fields: ExtractedFields
  tags: string[]
  confidence: number
}

export interface EntryListResponse {
  entries: Entry[]
  total: number
  limit: number
  offset: number
}

export interface QueryResponse {
  answer: string
  sources: Entry[]
  has_data: boolean
}

// ── UI State Types ──────────────────────────────────────────────────────────

export type RecordingState = 'idle' | 'recording' | 'processing' | 'error'

export interface PendingEntry {
  raw_text: string
  extract: ExtractResponse
}

// ── Pipeline Types ──────────────────────────────────────────────────────────

export type StepState = 'idle' | 'running' | 'done' | 'skipped' | 'error'

export interface PipelineStep {
  id: string
  label: string
  sub: string
  state: StepState
  detail?: string
}

export interface IngestResponse {
  id: string
  user_id: string
  type: string
  raw_text: string
  extracted_fields: Record<string, unknown>
  tags: string[]
  entry_date: string | null
  source: string
  is_sensitive: boolean
  pii_types: string[]
  created_at: string | null
  updated_at: string | null
}

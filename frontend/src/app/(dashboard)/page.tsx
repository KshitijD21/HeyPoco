'use client'

import { useCallback, useRef, useState } from 'react'
import { EntryFeed } from '@/components/entry-feed'
import { CategoryFilter } from '@/components/category-filter'
import { ingestEntry } from '@/lib/api-client'
import type { IngestResponse, PipelineStep, StepState } from '@/types'

// ── Constants ───────────────────────────────────────────────────────────────

const INITIAL_STEPS: PipelineStep[] = [
  { id: 'transcribe', label: 'Transcription', sub: 'Whisper → raw text', state: 'idle' },
  { id: 'pii', label: 'PII Detection', sub: 'Local regex — zero API calls', state: 'idle' },
  { id: 'extract', label: 'Extraction', sub: 'GPT-4o → type + fields + tags', state: 'idle' },
  { id: 'embed', label: 'Embedding', sub: 'text-embedding-3-small → 1536d', state: 'idle' },
  { id: 'insert', label: 'Database Insert', sub: 'Supabase → entries table', state: 'idle' },
]

const TYPE_COLOURS: Record<string, string> = {
  finance: 'bg-emerald-100 text-emerald-800',
  journal: 'bg-blue-100 text-blue-800',
  task: 'bg-amber-100 text-amber-800',
  event: 'bg-purple-100 text-purple-800',
  note: 'bg-slate-100 text-slate-700',
  health: 'bg-red-100 text-red-800',
  general: 'bg-zinc-100 text-zinc-700',
}

const QUICK_PHRASES = [
  'Spent $60 at Starbucks this morning',
  'Today was amazing, felt super focused',
  'Send the contract to Sarah by Friday',
  'Dentist appointment tomorrow at 3pm',
  'Headache all morning, took paracetamol',
]

// ── Sub-components ──────────────────────────────────────────────────────────

function StepRow({ step }: { step: PipelineStep }) {
  const icons: Record<StepState, string> = {
    idle: '○',
    running: '◌',
    done: '✓',
    skipped: '–',
    error: '✗',
  }
  const colours: Record<StepState, string> = {
    idle: 'text-black/20',
    running: 'text-blue-500 animate-spin',
    done: 'text-green-600',
    skipped: 'text-black/30',
    error: 'text-red-500',
  }

  return (
    <div className="flex items-center gap-3 py-1">
      <span className={`w-4 text-center font-mono text-sm ${colours[step.state]}`}>
        {icons[step.state]}
      </span>
      <div className="flex-1">
        <span
          className={`text-sm font-medium ${step.state === 'idle' ? 'text-black/30' : 'text-black/80'}`}
        >
          {step.label}
        </span>
        <span className="ml-2 text-xs text-black/30">{step.sub}</span>
      </div>
      {step.detail && (
        <span className="shrink-0 font-mono text-xs text-black/40">{step.detail}</span>
      )}
    </div>
  )
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[#f9f8f6] px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-widest text-black/30">{label}</p>
      <p className="mt-0.5 truncate text-sm text-black/70">{value}</p>
    </div>
  )
}

function SavedEntryCard({ entry }: { entry: IngestResponse }) {
  const typeClass = TYPE_COLOURS[entry.type] ?? TYPE_COLOURS.general

  return (
    <div className="space-y-4">
      {/* Type + ID */}
      <div className="flex items-center gap-3">
        <span
          className={`rounded-lg px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${typeClass}`}
        >
          {entry.type}
        </span>
        {entry.is_sensitive && (
          <span className="rounded-lg bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700">
            🔒 SENSITIVE — no embedding
          </span>
        )}
        <span className="ml-auto font-mono text-xs text-black/30">{entry.id}</span>
      </div>

      {/* Raw text */}
      <div className="rounded-xl bg-[#f9f8f6] px-4 py-3 text-sm italic text-black/70">
        &ldquo;{entry.raw_text}&rdquo;
      </div>

      {/* Meta grid */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <MetaRow label="entry_date" value={entry.entry_date ?? '—'} />
        <MetaRow label="source" value={entry.source} />
        <MetaRow label="tags" value={entry.tags.join(', ') || '—'} />
        <MetaRow label="pii_types" value={entry.pii_types.join(', ') || 'none'} />
      </div>

      {/* Extracted fields */}
      {Object.keys(entry.extracted_fields).length > 0 && (
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-black/30">
            extracted_fields
          </p>
          <div className="space-y-1 rounded-xl bg-[#f9f8f6] px-4 py-3 font-mono text-xs text-black/60">
            {Object.entries(entry.extracted_fields).map(([k, v]) => (
              <div key={k} className="flex gap-2">
                <span className="text-cyan-700">{k}:</span>
                <span>{JSON.stringify(v)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Page ───────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [recording, setRecording] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [textInput, setTextInput] = useState('')
  const [recSeconds, setRecSeconds] = useState(0)
  const [steps, setSteps] = useState<PipelineStep[]>(INITIAL_STEPS)
  const [result, setResult] = useState<IngestResponse | null>(null)
  const [recentEntries, setRecentEntries] = useState<IngestResponse[]>([])
  const [error, setError] = useState<string | null>(null)
  // Track whether we've ever successfully ingested — to refresh the feed
  const [feedKey, setFeedKey] = useState(0)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // ── Step helpers ──────────────────────────────────────────────────

  const resetSteps = () => setSteps(INITIAL_STEPS.map((s) => ({ ...s, state: 'idle' as const })))

  const setStep = (id: string, patch: Partial<PipelineStep>) =>
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))

  // ── Recording ─────────────────────────────────────────────────────

  const startRecording = useCallback(async () => {
    setError(null)
    setResult(null)
    resetSteps()
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm'

      const recorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.start(100)

      setRecording(true)
      setRecSeconds(0)
      timerRef.current = setInterval(() => setRecSeconds((s) => s + 1), 1000)
    } catch {
      setError('Microphone access denied. Allow mic permission and try again.')
    }
  }, [])

  const stopRecording = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current
      if (!recorder) {
        resolve(null)
        return
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        resolve(blob)
      }
      recorder.stop()

      if (timerRef.current) clearInterval(timerRef.current)
      streamRef.current?.getTracks().forEach((t) => t.stop())
      setRecording(false)
      setRecSeconds(0)
    })
  }, [])

  // ── Pipeline ──────────────────────────────────────────────────────

  const runPipeline = useCallback(async (audioBlob: Blob | null, text: string | null) => {
    setProcessing(true)
    setError(null)
    setResult(null)
    resetSteps()

    // Visual step animation — the actual pipeline is one POST
    if (audioBlob) {
      setStep('transcribe', { state: 'running', detail: 'Sending to Whisper…' })
    } else {
      setStep('transcribe', { state: 'running', detail: 'Skipped — text mode' })
    }

    setTimeout(() => setStep('pii', { state: 'running', detail: 'Scanning locally…' }), 300)
    setTimeout(() => setStep('extract', { state: 'running', detail: 'Calling GPT-4o…' }), 600)
    setTimeout(() => setStep('embed', { state: 'running', detail: 'Generating vectors…' }), 900)
    setTimeout(() => setStep('insert', { state: 'running', detail: 'Writing to Supabase…' }), 1200)

    try {
      const entry = await ingestEntry({
        audioBlob: audioBlob ?? undefined,
        rawText: text ?? undefined,
      })

      // Mark all steps done
      setStep('transcribe', {
        state: audioBlob ? 'done' : 'skipped',
        detail: audioBlob ? 'transcribed' : 'text input',
      })
      setStep('pii', {
        state: 'done',
        detail: entry.is_sensitive ? `PII found: ${entry.pii_types.join(', ')}` : 'No PII',
      })
      setStep('extract', { state: 'done', detail: `type=${entry.type}` })
      setStep('embed', {
        state: entry.is_sensitive ? 'skipped' : 'done',
        detail: entry.is_sensitive ? 'Skipped (sensitive)' : '1536 dims',
      })
      setStep('insert', { state: 'done', detail: `id: ${entry.id.slice(0, 8)}…` })

      setResult(entry)
      setRecentEntries((prev) => [entry, ...prev].slice(0, 5))
      setTextInput('')
      setFeedKey((k) => k + 1) // refresh feed
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Pipeline failed'
      setError(msg)
      setSteps((prev) =>
        prev.map((s) => (s.state === 'running' ? { ...s, state: 'error' as const } : s))
      )
    } finally {
      setProcessing(false)
    }
  }, [])

  const handleMicClick = useCallback(async () => {
    if (recording) {
      const blob = await stopRecording()
      if (blob) await runPipeline(blob, null)
    } else {
      await startRecording()
    }
  }, [recording, stopRecording, startRecording, runPipeline])

  const handleTextSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!textInput.trim() || processing) return
      await runPipeline(null, textInput)
    },
    [textInput, processing, runPipeline]
  )

  return (
    <div className="space-y-8">
      {/* ── Mic + Text Input ───────────────────────────────────── */}
      <section className="border-black/8 flex flex-col items-center gap-6 rounded-2xl border bg-white p-8">
        <p className="text-center text-sm text-black/40">Tap to record voice, or type below.</p>

        {/* Big mic button */}
        <button
          onClick={handleMicClick}
          disabled={processing}
          className={[
            'flex h-24 w-24 select-none items-center justify-center rounded-full text-3xl transition-all duration-200',
            recording
              ? 'scale-105 animate-pulse bg-red-500 text-white shadow-lg shadow-red-200'
              : processing
                ? 'cursor-not-allowed bg-black/10 text-black/30'
                : 'bg-black text-white shadow-md hover:scale-105 hover:bg-black/80',
          ].join(' ')}
        >
          {recording ? '■' : processing ? '…' : '🎤'}
        </button>

        {recording && (
          <p className="animate-pulse font-mono text-sm text-red-500">
            ● REC {recSeconds}s — click to stop
          </p>
        )}

        {/* Divider */}
        <div className="flex w-full items-center gap-3">
          <div className="bg-black/8 h-px flex-1" />
          <span className="text-xs text-black/30">or type</span>
          <div className="bg-black/8 h-px flex-1" />
        </div>

        {/* Text input */}
        <form onSubmit={handleTextSubmit} className="flex w-full gap-2">
          <input
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder='e.g. "Spent $60 at Starbucks this morning"'
            disabled={processing || recording}
            className="flex-1 rounded-xl border border-black/15 bg-[#f9f8f6] px-4 py-3 text-sm placeholder-black/25 focus:outline-none focus:ring-2 focus:ring-black/20 disabled:opacity-40"
          />
          <button
            type="submit"
            disabled={!textInput.trim() || processing || recording}
            className="rounded-xl bg-black px-4 py-3 text-sm font-medium text-white transition-opacity hover:bg-black/80 disabled:opacity-30"
          >
            Send
          </button>
        </form>

        {/* Error */}
        {error && (
          <div className="w-full rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            ✗ {error}
          </div>
        )}
      </section>

      {/* ── Pipeline Steps ─────────────────────────────────────── */}
      <section className="border-black/8 space-y-3 rounded-2xl border bg-white p-6">
        <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-black/40">
          Pipeline
        </h2>
        {steps.map((step) => (
          <StepRow key={step.id} step={step} />
        ))}
      </section>

      {/* ── Saved Entry Result ─────────────────────────────────── */}
      {result && (
        <section className="border-black/8 space-y-5 rounded-2xl border bg-white p-6">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-black/40">
            Saved Entry
          </h2>
          <SavedEntryCard entry={result} />
        </section>
      )}

      {/* ── Recent Entries This Session ────────────────────────── */}
      {recentEntries.length > 0 && (
        <section className="border-black/8 rounded-2xl border bg-white p-6">
          <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-black/40">
            Saved This Session
          </h2>
          <div className="space-y-2">
            {recentEntries.map((e) => (
              <div
                key={e.id}
                className="flex items-center gap-3 border-b border-black/5 py-2 text-sm last:border-0"
              >
                <span
                  className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${TYPE_COLOURS[e.type] ?? TYPE_COLOURS.general}`}
                >
                  {e.type}
                </span>
                <span className="flex-1 truncate text-black/70">{e.raw_text}</span>
                <span className="shrink-0 font-mono text-[10px] text-black/30">
                  {e.id.slice(0, 8)}…
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Quick Test Phrases ─────────────────────────────────── */}
      <section className="border-black/8 rounded-2xl border bg-white p-6">
        <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-black/40">
          Quick Phrases
        </h2>
        <div className="flex flex-wrap gap-2">
          {QUICK_PHRASES.map((t) => (
            <button
              key={t}
              onClick={() => setTextInput(t)}
              disabled={processing || recording}
              className="border-black/8 rounded-full border bg-[#f5f4f0] px-3 py-1.5 text-xs text-black/60 transition-colors hover:bg-black/10 disabled:opacity-30"
            >
              {t}
            </button>
          ))}
        </div>
      </section>

      {/* ── Filters ────────────────────────────────────────────── */}
      <section className="border-black/8 rounded-2xl border bg-white p-6">
        <CategoryFilter />
      </section>

      {/* ── Entry Feed ─────────────────────────────────────────── */}
      <section className="border-black/8 rounded-2xl border bg-white p-6">
        <EntryFeed key={feedKey} />
      </section>
    </div>
  )
}

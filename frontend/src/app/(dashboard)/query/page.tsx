'use client'

import { useCallback, useRef, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { queryEntries, transcribeAudio } from '@/lib/api-client'
import type { QueryResponse, Entry, PipelineStep, StepState } from '@/types'
import {
  getEntryTypeIcon,
  getEntryTypeLabel,
  formatRelativeTime,
  formatCurrency,
  getSimilarityLabel,
} from '@/utils/format'

// ── Constants ───────────────────────────────────────────────────────────────

const INITIAL_STEPS: PipelineStep[] = [
  { id: 'transcribe', label: 'Transcription', sub: 'Whisper → raw text', state: 'idle' },
  { id: 'embed', label: 'Embedding', sub: 'text-embedding-3-small → 1536d', state: 'idle' },
  { id: 'search', label: 'Vector Search', sub: 'pgvector cosine similarity', state: 'idle' },
  { id: 'answer', label: 'RAG Answer', sub: 'GPT-4o → natural language', state: 'idle' },
]

const QUICK_PHRASES = [
  'How much did I spend this week?',
  'What did I do today?',
  'When did I last feel productive?',
  "What's planned for this week?",
  'Show my recent health logs',
  'Any tasks due soon?',
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

function SourceCard({ entry }: { entry: Entry }) {
  const fields = entry.extracted_fields
  const dateStr = entry.entry_date || entry.created_at

  return (
    <div className="border-black/8 space-y-1.5 rounded-2xl border bg-[#f9f8f6] p-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">{getEntryTypeIcon(entry.type)}</span>
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-black/40">
            {getEntryTypeLabel(entry.type)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {entry.similarity != null &&
            (() => {
              const { label, color } = getSimilarityLabel(entry.similarity)
              return <span className={`text-xs ${color}`}>{label}</span>
            })()}
          {dateStr && <span className="text-xs text-black/30">{formatRelativeTime(dateStr)}</span>}
        </div>
      </div>

      {/* Raw text */}
      <p className="text-sm leading-relaxed text-black/70">{entry.raw_text}</p>

      {/* Key fields */}
      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
        {fields.amount != null && (
          <span className="text-xs font-semibold text-emerald-700">
            {formatCurrency(fields.amount, fields.currency || 'USD')}
          </span>
        )}
        {fields.merchant && <span className="text-xs text-black/50">{fields.merchant}</span>}
        {fields.mood && <span className="text-xs text-black/50">Mood: {fields.mood}</span>}
        {fields.action && <span className="text-xs text-black/60">{fields.action}</span>}
        {fields.deadline && <span className="text-xs text-black/40">Due: {fields.deadline}</span>}
        {fields.title && <span className="text-xs font-medium text-black/60">{fields.title}</span>}
        {fields.scheduled_at && (
          <span className="text-xs text-black/40">{fields.scheduled_at}</span>
        )}
        {fields.location && <span className="text-xs text-black/40">📍 {fields.location}</span>}
        {fields.symptom && <span className="text-xs text-black/50">{fields.symptom}</span>}
        {fields.medication && <span className="text-xs text-black/50">💊 {fields.medication}</span>}
        {fields.person && <span className="text-xs text-black/50">{fields.person}</span>}
        {fields.topic && <span className="text-xs text-black/40">{fields.topic}</span>}
      </div>

      {/* Tags */}
      {entry.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {entry.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="border-black/8 rounded-full border bg-white px-1.5 py-0.5 text-xs text-black/40"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main Page ───────────────────────────────────────────────────────────────

export default function QueryPage() {
  const [recording, setRecording] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [textInput, setTextInput] = useState('')
  const [recSeconds, setRecSeconds] = useState(0)
  const [steps, setSteps] = useState<PipelineStep[]>(INITIAL_STEPS)
  const [result, setResult] = useState<QueryResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

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

  // ── Query Pipeline ────────────────────────────────────────────────

  const runQuery = useCallback(async (audioBlob: Blob | null, text: string | null) => {
    setProcessing(true)
    setError(null)
    setResult(null)
    resetSteps()

    let question = text?.trim() ?? ''
    const t1 = Date.now()

    try {
      // Step 1 — Transcription
      if (audioBlob) {
        setStep('transcribe', { state: 'running', detail: 'Sending to Whisper…' })
        const { transcript } = await transcribeAudio(audioBlob)
        question = transcript
        setTextInput(transcript)
        const t1d = Date.now() - t1
        setStep('transcribe', { state: 'done', detail: `${(t1d / 1000).toFixed(2)}s` })
      } else {
        setStep('transcribe', { state: 'skipped', detail: 'text input' })
      }

      if (!question) {
        setError('Provide audio or type a question.')
        setProcessing(false)
        return
      }

      // Step 2 — Embedding (visual — happens inside the backend)
      setStep('embed', { state: 'running', detail: 'Generating query vector…' })

      // Step 3 — Vector Search (visual)
      setTimeout(() => setStep('search', { state: 'running', detail: 'Searching entries…' }), 300)

      // Step 4 — RAG Answer (visual)
      setTimeout(() => setStep('answer', { state: 'running', detail: 'Calling GPT-4o…' }), 600)

      // Actual API call — all steps happen server-side
      const res = await queryEntries({ question })
      const totalMs = Date.now() - t1

      // Mark all steps done
      setStep('embed', { state: 'done', detail: '1536 dims' })
      setStep('search', {
        state: 'done',
        detail: `${res.sources.length} ${res.sources.length === 1 ? 'match' : 'matches'}`,
      })
      setStep('answer', {
        state: 'done',
        detail: `${(totalMs / 1000).toFixed(2)}s total`,
      })

      setResult(res)
      setTextInput('')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Query failed'
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
      if (blob) await runQuery(blob, null)
    } else {
      await startRecording()
    }
  }, [recording, stopRecording, startRecording, runQuery])

  const handleTextSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!textInput.trim() || processing) return
      await runQuery(null, textInput)
    },
    [textInput, processing, runQuery]
  )

  return (
    <div className="space-y-8">
      {/* ── Mic + Text Input ───────────────────────────────────── */}
      <section className="border-black/8 flex flex-col items-center gap-6 rounded-2xl border bg-white p-8">
        <p className="text-center text-sm text-black/40">
          Ask anything about what you&apos;ve logged. Tap to speak or type below.
        </p>

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
            placeholder='e.g. "How much did I spend this week?"'
            disabled={processing || recording}
            className="flex-1 rounded-xl border border-black/15 bg-[#f9f8f6] px-4 py-3 text-sm placeholder-black/25 focus:outline-none focus:ring-2 focus:ring-black/20 disabled:opacity-40"
          />
          <button
            type="submit"
            disabled={!textInput.trim() || processing || recording}
            className="rounded-xl bg-black px-4 py-3 text-sm font-medium text-white transition-opacity hover:bg-black/80 disabled:opacity-30"
          >
            Ask
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
          Query Pipeline
        </h2>
        {steps.map((step) => (
          <StepRow key={step.id} step={step} />
        ))}
      </section>

      {/* ── Answer ─────────────────────────────────────────────── */}
      {result && (
        <section className="border-black/8 space-y-5 rounded-2xl border bg-white p-6">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-black/40">Answer</h2>

          {/* Answer text */}
          <div className="rounded-xl bg-[#f9f8f6] px-4 py-3">
            <div className="flex items-start gap-2">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-black/30" />
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-black/70">
                {result.answer}
              </p>
            </div>
            {!result.has_data && (
              <p className="mt-3 pl-6 text-xs text-black/30">
                Keep logging and I&apos;ll have more to tell you.
              </p>
            )}
          </div>

          {/* Source entries */}
          {result.sources.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-black/40">
                Based on {result.sources.length} {result.sources.length === 1 ? 'entry' : 'entries'}
              </h3>
              <div className="space-y-2">
                {result.sources.map((entry) => (
                  <SourceCard key={entry.id} entry={entry} />
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── Quick Phrases ──────────────────────────────────────── */}
      <section className="border-black/8 rounded-2xl border bg-white p-6">
        <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-black/40">
          Quick Questions
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
    </div>
  )
}

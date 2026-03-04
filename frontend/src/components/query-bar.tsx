'use client'

import { useState, useCallback } from 'react'
import { Search, Loader2, Sparkles, X, Mic, Square } from 'lucide-react'
import { useQuery_ } from '@/hooks/use-query'
import { useVoiceRecorder } from '@/hooks/use-voice-recorder'
import { transcribeAudio } from '@/lib/api-client'
import { cn } from '@/lib/utils'
import {
  getEntryTypeIcon,
  getEntryTypeLabel,
  formatRelativeTime,
  formatCurrency,
  getSimilarityLabel,
} from '@/utils/format'
import type { Entry } from '@/types'

interface QueryBarProps {
  suggestions?: string[]
}

// ── Source entry card — lighter than EntryCard, tailored for query results ──
function QuerySourceCard({ entry }: { entry: Entry }) {
  const fields = entry.extracted_fields
  // entry_date from vector search, fall back to created_at
  const dateStr = entry.entry_date || entry.created_at

  return (
    <div className="border-black/8 space-y-1.5 rounded-2xl border bg-white p-3">
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
          <span className="text-xs text-black/30">{formatRelativeTime(dateStr!)}</span>
        </div>
      </div>

      {/* Raw text */}
      <p className="text-sm leading-relaxed text-black/70">{entry.raw_text}</p>

      {/* Key fields */}
      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
        {/* Finance */}
        {fields.amount != null && (
          <span className="text-xs font-semibold text-emerald-700">
            {formatCurrency(fields.amount, fields.currency || 'USD')}
          </span>
        )}
        {fields.merchant && <span className="text-xs text-black/50">{fields.merchant}</span>}
        {fields.category && <span className="text-xs text-black/40">{fields.category}</span>}
        {/* Journal */}
        {fields.mood && <span className="text-xs text-black/50">Mood: {fields.mood}</span>}
        {fields.energy && <span className="text-xs text-black/50">Energy: {fields.energy}</span>}
        {/* Task */}
        {fields.action && <span className="text-xs text-black/60">{fields.action}</span>}
        {fields.deadline && <span className="text-xs text-black/40">Due: {fields.deadline}</span>}
        {fields.status && <span className="text-xs text-black/40">{fields.status}</span>}
        {/* Event */}
        {fields.title && <span className="text-xs font-medium text-black/60">{fields.title}</span>}
        {fields.scheduled_at && (
          <span className="text-xs text-black/40">{fields.scheduled_at}</span>
        )}
        {fields.location && <span className="text-xs text-black/40">📍 {fields.location}</span>}
        {/* Health */}
        {fields.symptom && <span className="text-xs text-black/50">{fields.symptom}</span>}
        {fields.medication && <span className="text-xs text-black/50">💊 {fields.medication}</span>}
        {fields.severity && <span className="text-xs text-black/40">{fields.severity}</span>}
        {/* Shared */}
        {fields.person && <span className="text-xs text-black/50">{fields.person}</span>}
        {fields.topic && <span className="text-xs text-black/40">{fields.topic}</span>}
        {fields.project && <span className="text-xs text-black/40">📂 {fields.project}</span>}
      </div>

      {/* Tags */}
      {entry.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {entry.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="border-black/8 rounded-full border bg-[#f5f4f0] px-1.5 py-0.5 text-xs text-black/40"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main QueryBar ────────────────────────────────────────────────────────────
export function QueryBar({ suggestions = [] }: QueryBarProps) {
  const [question, setQuestion] = useState('')
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [voiceError, setVoiceError] = useState<string | null>(null)
  const { ask, response, isLoading, error, reset } = useQuery_()
  const {
    state: recorderState,
    startRecording,
    stopRecording,
    cancelRecording,
  } = useVoiceRecorder()

  const isRecording = recorderState === 'recording'
  const isBusy = isLoading || isTranscribing

  // Submit text question
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (!question.trim() || isBusy) return
      ask(question.trim())
    },
    [question, isBusy, ask]
  )

  // Tap mic → start recording; tap again → stop, transcribe, ask
  const handleMicToggle = useCallback(async () => {
    if (isRecording) {
      const blob = await stopRecording()
      if (!blob) return
      setIsTranscribing(true)
      setVoiceError(null)
      try {
        const { transcript } = await transcribeAudio(blob)
        setQuestion(transcript)
        ask(transcript)
      } catch {
        setVoiceError('Could not transcribe. Please try again.')
      } finally {
        setIsTranscribing(false)
      }
    } else {
      setVoiceError(null)
      reset()
      setQuestion('')
      await startRecording()
    }
  }, [isRecording, stopRecording, startRecording, ask, reset])

  const handleSuggestion = useCallback(
    (text: string) => {
      setQuestion(text)
      ask(text)
    },
    [ask]
  )

  const handleClear = useCallback(() => {
    reset()
    setQuestion('')
    setVoiceError(null)
    if (isRecording) cancelRecording()
  }, [reset, isRecording, cancelRecording])

  return (
    <div className="w-full space-y-4">
      {/* Search input */}
      <form onSubmit={handleSubmit}>
        <div
          className={cn(
            'flex items-center gap-2 rounded-2xl border bg-[#f9f8f6] px-4 py-3 transition-all',
            isRecording
              ? 'border-red-400 ring-2 ring-red-400/20'
              : 'border-black/15 focus-within:border-black/30 focus-within:ring-2 focus-within:ring-black/10'
          )}
        >
          <Sparkles className="h-4 w-4 shrink-0 text-black/30" />
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={isRecording ? 'Listening...' : 'Try "How much did I spend this week?"'}
            className="flex-1 bg-transparent text-sm text-black/80 placeholder:text-black/25 focus:outline-none"
            disabled={isBusy || isRecording}
          />

          {/* Clear button */}
          {question && !isBusy && !isRecording && (
            <button
              type="button"
              onClick={handleClear}
              className="shrink-0 text-black/30 transition-colors hover:text-black/60"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Mic button */}
          <button
            type="button"
            onClick={handleMicToggle}
            disabled={isBusy}
            className={cn(
              'shrink-0 rounded-full p-1.5 transition-all disabled:opacity-30',
              isRecording
                ? 'animate-pulse bg-red-500 text-white'
                : 'bg-black text-white shadow-sm hover:bg-black/80'
            )}
            aria-label={isRecording ? 'Stop recording' : 'Ask by voice'}
          >
            {isRecording ? (
              <Square className="h-3.5 w-3.5 fill-white" />
            ) : (
              <Mic className="h-3.5 w-3.5" />
            )}
          </button>

          {/* Submit button */}
          <button
            type="submit"
            disabled={!question.trim() || isBusy || isRecording}
            className="shrink-0 rounded-xl bg-black px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-black/80 disabled:opacity-30"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </button>
        </div>
      </form>

      {/* Voice status */}
      {isRecording && (
        <div className="flex items-center gap-2 text-sm text-red-500">
          <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
          <span>Recording... tap the mic to stop</span>
          <button
            onClick={() => {
              cancelRecording()
              setVoiceError(null)
            }}
            className="ml-auto text-xs text-black/40 transition-colors hover:text-black/70"
          >
            Cancel
          </button>
        </div>
      )}
      {isTranscribing && (
        <div className="flex items-center gap-2 text-sm text-black/40">
          <Loader2 className="h-4 w-4 animate-spin text-black/40" />
          <span>Transcribing...</span>
        </div>
      )}
      {voiceError && <p className="text-sm text-red-500">{voiceError}</p>}

      {/* Suggestion pills — only shown before first query */}
      {!response && !isLoading && !isRecording && suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => handleSuggestion(s)}
              className="border-black/8 rounded-full border bg-[#f5f4f0] px-3 py-1.5 text-xs text-black/50 transition-all hover:border-black/20 hover:bg-black/5 hover:text-black/70"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center gap-2 py-2 text-sm text-black/40">
          <Loader2 className="h-4 w-4 animate-spin text-black/40" />
          <span>Searching your entries...</span>
        </div>
      )}

      {/* Answer */}
      {response && (
        <div className="animate-in fade-in slide-in-from-bottom-2 space-y-4 duration-300">
          {/* Answer box */}
          <div className="border-black/8 rounded-2xl border bg-white p-4">
            <div className="flex items-start gap-2">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-black/30" />
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-black/70">
                {response.answer}
              </p>
            </div>
            {!response.has_data && (
              <p className="mt-3 pl-6 text-xs text-black/30">
                Keep logging and I&apos;ll have more to tell you.
              </p>
            )}
          </div>

          {/* Source entries */}
          {response.sources.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-black/40">
                  Based on {response.sources.length}{' '}
                  {response.sources.length === 1 ? 'entry' : 'entries'}
                </h4>
                <button
                  onClick={handleClear}
                  className="text-xs text-black/30 transition-colors hover:text-black/60"
                >
                  Clear
                </button>
              </div>
              <div className="space-y-2">
                {response.sources.map((entry) => (
                  <QuerySourceCard key={entry.id} entry={entry} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Query error */}
      {error && (
        <div className="flex items-start gap-2 rounded-2xl border border-red-100 bg-red-50 p-3">
          <X className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <p className="text-sm text-red-700">
            {error instanceof Error ? error.message : 'Query failed. Please try again.'}
          </p>
        </div>
      )}
    </div>
  )
}

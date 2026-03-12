'use client'

import { useCallback, useState } from 'react'
import { Mic, Square, Loader2, Keyboard } from 'lucide-react'
import { useVoiceRecorder } from '@/hooks/use-voice-recorder'
import { useEntryStore } from '@/stores/entry-store'
import { transcribeAudio, extractEntry } from '@/lib/api-client'
import { formatDuration } from '@/utils/format'
import { cn } from '@/lib/utils'

export function VoiceCapture() {
  const { state, startRecording, stopRecording, cancelRecording, duration } = useVoiceRecorder()
  const { setPendingEntry, setRecordingState, textInput, setTextInput, clearTextInput } =
    useEntryStore()
  const [showTextInput, setShowTextInput] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const processText = useCallback(
    async (text: string) => {
      setIsProcessing(true)
      setError(null)

      try {
        const extraction = await extractEntry({ raw_text: text })
        setPendingEntry({ raw_text: text, extract: extraction })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Processing failed')
      } finally {
        setIsProcessing(false)
        setRecordingState('idle')
      }
    },
    [setPendingEntry, setRecordingState]
  )

  const handleRecordToggle = useCallback(async () => {
    if (state === 'recording') {
      const blob = await stopRecording()
      if (blob) {
        setRecordingState('processing')
        setIsProcessing(true)
        try {
          const { transcript } = await transcribeAudio(blob)
          await processText(transcript)
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Transcription failed')
          setIsProcessing(false)
          setRecordingState('idle')
        }
      }
    } else {
      setError(null)
      setRecordingState('recording')
      await startRecording()
    }
  }, [state, stopRecording, startRecording, processText, setRecordingState])

  const handleTextSubmit = useCallback(async () => {
    if (!textInput.trim()) return
    await processText(textInput.trim())
    clearTextInput()
    setShowTextInput(false)
  }, [textInput, processText, clearTextInput])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleTextSubmit()
      }
    },
    [handleTextSubmit]
  )

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Main record button */}
      <button
        onClick={handleRecordToggle}
        disabled={isProcessing}
        className={cn(
          'relative flex h-20 w-20 items-center justify-center rounded-full transition-all duration-300',
          state === 'recording'
            ? 'animate-pulse bg-red-500 shadow-lg shadow-red-500/30'
            : 'bg-black shadow-lg shadow-black/20 hover:scale-105 hover:shadow-xl',
          isProcessing && 'cursor-not-allowed opacity-50'
        )}
        aria-label={state === 'recording' ? 'Stop recording' : 'Start recording'}
      >
        {isProcessing ? (
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        ) : state === 'recording' ? (
          <Square className="h-7 w-7 fill-white text-white" />
        ) : (
          <Mic className="h-8 w-8 text-white" />
        )}
      </button>

      {/* Duration display */}
      {state === 'recording' && (
        <div className="flex items-center gap-2 text-sm font-medium text-red-500">
          <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
          {formatDuration(duration)}
        </div>
      )}

      {/* Processing indicator */}
      {isProcessing && <p className="text-sm text-black/40">Listening & understanding...</p>}

      {/* Error */}
      {error && <p className="max-w-xs text-center text-sm text-red-400">{error}</p>}

      {/* Cancel button during recording */}
      {state === 'recording' && (
        <button
          onClick={cancelRecording}
          className="text-xs text-black/40 transition-colors hover:text-black/70"
        >
          Cancel
        </button>
      )}

      {/* Text fallback toggle */}
      {!isProcessing && state !== 'recording' && (
        <button
          onClick={() => setShowTextInput(!showTextInput)}
          className="flex items-center gap-1.5 text-xs text-black/40 transition-colors hover:text-black/70"
        >
          <Keyboard className="h-3.5 w-3.5" />
          {showTextInput ? 'Hide keyboard' : 'Type instead'}
        </button>
      )}

      {/* Text input fallback */}
      {showTextInput && (
        <div className="flex w-full max-w-md gap-2">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type what happened..."
            className="flex-1 rounded-xl border border-black/15 bg-[#f9f8f6] px-4 py-2.5 text-sm text-black/80 placeholder:text-black/25 focus:outline-none focus:ring-2 focus:ring-black/10"
          />
          <button
            onClick={handleTextSubmit}
            disabled={!textInput.trim() || isProcessing}
            className="rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Log
          </button>
        </div>
      )}
    </div>
  )
}

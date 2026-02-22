"use client";

import { useCallback, useState } from "react";
import { Mic, Square, Loader2, Keyboard } from "lucide-react";
import { useVoiceRecorder } from "@/hooks/use-voice-recorder";
import { useEntryStore } from "@/stores/entry-store";
import { transcribeAudio, extractEntry } from "@/lib/api-client";
import { formatDuration } from "@/utils/format";
import { cn } from "@/lib/utils";

export function VoiceCapture() {
    const { state, startRecording, stopRecording, cancelRecording, duration } =
        useVoiceRecorder();
    const { setPendingEntry, setRecordingState, textInput, setTextInput, clearTextInput } =
        useEntryStore();
    const [showTextInput, setShowTextInput] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const processText = useCallback(
        async (text: string) => {
            setIsProcessing(true);
            setError(null);

            try {
                const extraction = await extractEntry({ raw_text: text });
                setPendingEntry({ raw_text: text, extract: extraction });
            } catch (err) {
                setError(err instanceof Error ? err.message : "Processing failed");
            } finally {
                setIsProcessing(false);
                setRecordingState("idle");
            }
        },
        [setPendingEntry, setRecordingState],
    );

    const handleRecordToggle = useCallback(async () => {
        if (state === "recording") {
            const blob = await stopRecording();
            if (blob) {
                setRecordingState("processing");
                setIsProcessing(true);
                try {
                    const { transcript } = await transcribeAudio(blob);
                    await processText(transcript);
                } catch (err) {
                    setError(err instanceof Error ? err.message : "Transcription failed");
                    setIsProcessing(false);
                    setRecordingState("idle");
                }
            }
        } else {
            setError(null);
            setRecordingState("recording");
            await startRecording();
        }
    }, [state, stopRecording, startRecording, processText, setRecordingState]);

    const handleTextSubmit = useCallback(async () => {
        if (!textInput.trim()) return;
        await processText(textInput.trim());
        clearTextInput();
        setShowTextInput(false);
    }, [textInput, processText, clearTextInput]);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleTextSubmit();
            }
        },
        [handleTextSubmit],
    );

    return (
        <div className="flex flex-col items-center gap-4">
            {/* Main record button */}
            <button
                onClick={handleRecordToggle}
                disabled={isProcessing}
                className={cn(
                    "relative flex h-20 w-20 items-center justify-center rounded-full transition-all duration-300",
                    state === "recording"
                        ? "bg-red-500 shadow-lg shadow-red-500/30 animate-pulse"
                        : "bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/30 hover:shadow-xl hover:scale-105",
                    isProcessing && "opacity-50 cursor-not-allowed",
                )}
                aria-label={state === "recording" ? "Stop recording" : "Start recording"}
            >
                {isProcessing ? (
                    <Loader2 className="h-8 w-8 text-white animate-spin" />
                ) : state === "recording" ? (
                    <Square className="h-7 w-7 text-white fill-white" />
                ) : (
                    <Mic className="h-8 w-8 text-white" />
                )}
            </button>

            {/* Duration display */}
            {state === "recording" && (
                <div className="flex items-center gap-2 text-sm text-red-500 font-medium">
                    <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                    {formatDuration(duration)}
                </div>
            )}

            {/* Processing indicator */}
            {isProcessing && (
                <p className="text-sm text-zinc-400">Listening & understanding...</p>
            )}

            {/* Error */}
            {error && (
                <p className="text-sm text-red-400 max-w-xs text-center">{error}</p>
            )}

            {/* Cancel button during recording */}
            {state === "recording" && (
                <button
                    onClick={cancelRecording}
                    className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                    Cancel
                </button>
            )}

            {/* Text fallback toggle */}
            {!isProcessing && state !== "recording" && (
                <button
                    onClick={() => setShowTextInput(!showTextInput)}
                    className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                    <Keyboard className="h-3.5 w-3.5" />
                    {showTextInput ? "Hide keyboard" : "Type instead"}
                </button>
            )}

            {/* Text input fallback */}
            {showTextInput && (
                <div className="w-full max-w-md flex gap-2">
                    <input
                        type="text"
                        value={textInput}
                        onChange={(e) => setTextInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type what happened..."
                        className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                    />
                    <button
                        onClick={handleTextSubmit}
                        disabled={!textInput.trim() || isProcessing}
                        className="rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        Log
                    </button>
                </div>
            )}
        </div>
    );
}

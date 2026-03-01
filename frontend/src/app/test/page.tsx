"use client";

/**
 * /test  — HeyPoco Pipeline Test Page
 *
 * A dev-only page to test the full voice/text ingestion pipeline
 * end-to-end without needing to log in.
 *
 * Calls  POST /api/dev/ingest  (only active when backend DEBUG=True).
 * Uses the hardcoded test user "kshitij" (UUID: 00000000-…-0001).
 *
 * Access: http://localhost:3000/test
 *
 * Features:
 *  - Hold-to-record mic button (same MediaRecorder the main app uses)
 *  - Text input fallback
 *  - Live step-by-step status while the backend processes
 *  - Full breakdown of every pipeline output (PII, type, fields, tags, embedding)
 *  - Recent entries table (latest 5 saves)
 */

import { useCallback, useRef, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type StepState = "idle" | "running" | "done" | "skipped" | "error";

interface PipelineStep {
  id: string;
  label: string;
  sub: string;
  state: StepState;
  detail?: string;
  elapsed?: number;
}

interface SavedEntry {
  id: string;
  type: string;
  raw_text: string;
  entry_date: string | null;
  tags: string[];
  extracted_fields: Record<string, unknown>;
  is_sensitive: boolean;
  pii_types: string[];
  source: string;
  created_at: string | null;
}

interface PipelineResult {
  entry: SavedEntry;
  raw_text: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const TEST_TIMEZONE = "Asia/Kolkata";

const INITIAL_STEPS: PipelineStep[] = [
  { id: "transcribe", label: "Transcription",  sub: "Whisper → raw text",              state: "idle" },
  { id: "pii",        label: "PII Detection",   sub: "Local regex — zero API calls",    state: "idle" },
  { id: "extract",    label: "Extraction",      sub: "GPT-4o → type + fields + tags",   state: "idle" },
  { id: "embed",      label: "Embedding",       sub: "text-embedding-3-small → 1536d",  state: "idle" },
  { id: "insert",     label: "Database Insert", sub: "Supabase → entries table",        state: "idle" },
];

// Type → accent colour class
const TYPE_COLOURS: Record<string, string> = {
  finance: "bg-emerald-100 text-emerald-800",
  journal: "bg-blue-100 text-blue-800",
  task:    "bg-amber-100 text-amber-800",
  event:   "bg-purple-100 text-purple-800",
  note:    "bg-slate-100 text-slate-700",
  health:  "bg-red-100 text-red-800",
  general: "bg-zinc-100 text-zinc-700",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function TestPage() {
  // Recording state
  const [recording, setRecording]       = useState(false);
  const [processing, setProcessing]     = useState(false);
  const [textInput, setTextInput]       = useState("");
  const [steps, setSteps]               = useState<PipelineStep[]>(INITIAL_STEPS);
  const [result, setResult]             = useState<PipelineResult | null>(null);
  const [error, setError]               = useState<string | null>(null);
  const [recSeconds, setRecSeconds]     = useState(0);
  const [recentEntries, setRecentEntries] = useState<SavedEntry[]>([]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef        = useRef<Blob[]>([]);
  const timerRef         = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef        = useRef<MediaStream | null>(null);

  // ── Step helpers ──────────────────────────────────────────────────

  const resetSteps = () => setSteps(INITIAL_STEPS.map(s => ({ ...s, state: "idle" })));

  const setStep = (id: string, patch: Partial<PipelineStep>) =>
    setSteps(prev => prev.map(s => (s.id === id ? { ...s, ...patch } : s)));

  // ── Recording ─────────────────────────────────────────────────────

  const startRecording = useCallback(async () => {
    setError(null);
    setResult(null);
    resetSteps();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.start(100);

      setRecording(true);
      setRecSeconds(0);
      timerRef.current = setInterval(() => setRecSeconds(s => s + 1), 1000);
    } catch {
      setError("Microphone access denied. Allow mic permission and try again.");
    }
  }, []);

  const stopRecording = useCallback((): Promise<Blob | null> => {
    return new Promise(resolve => {
      const recorder = mediaRecorderRef.current;
      if (!recorder) { resolve(null); return; }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        resolve(blob);
      };
      recorder.stop();

      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
      setRecording(false);
      setRecSeconds(0);
    });
  }, []);

  // ── Submit ────────────────────────────────────────────────────────

  const runPipeline = useCallback(async (audioBlob: Blob | null, text: string | null) => {
    setProcessing(true);
    setError(null);
    setResult(null);
    resetSteps();

    const formData = new FormData();

    // Step 1: Transcription / Input
    const t1 = Date.now();
    if (audioBlob) {
      setStep("transcribe", { state: "running", detail: "Sending to Whisper…" });
      formData.append("audio_file", audioBlob, "recording.webm");
    } else if (text?.trim()) {
      setStep("transcribe", { state: "running", detail: "Skipped — text mode" });
      formData.append("raw_text", text.trim());
    } else {
      setError("Provide audio or text.");
      setProcessing(false);
      return;
    }

    formData.append("user_timezone", TEST_TIMEZONE);

    // Mark remaining steps as running sequentially — updates are visual only,
    // actual processing is one POST. We animate them in sequence after the call.
    setTimeout(() => setStep("pii",     { state: "running", detail: "Scanning locally…" }),      300);
    setTimeout(() => setStep("extract", { state: "running", detail: "Calling GPT-4o…"      }),   600);
    setTimeout(() => setStep("embed",   { state: "running", detail: "Generating vectors…"   }),  900);
    setTimeout(() => setStep("insert",  { state: "running", detail: "Writing to Supabase…"  }), 1200);

    try {
      const res = await fetch(`${API_BASE}/api/dev/ingest`, {
        method: "POST",
        body: formData,
      });

      const totalMs = Date.now() - t1;

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Unknown error" }));
        throw new Error(err.detail || `HTTP ${res.status}`);
      }

      const entry: SavedEntry = await res.json();

      // Mark all steps done with rough timing
      const transcribeT = audioBlob ? totalMs * 0.25 : 0;
      setStep("transcribe", { state: audioBlob ? "done" : "skipped",
                              detail: audioBlob ? `${(transcribeT / 1000).toFixed(2)}s` : "text input",
                              elapsed: transcribeT });
      setStep("pii",        { state: "done",    detail: entry.is_sensitive ? `PII found: ${entry.pii_types.join(", ")}` : "No PII",      elapsed: 0 });
      setStep("extract",    { state: "done",    detail: `type=${entry.type}`,      elapsed: totalMs * 0.55 });
      setStep("embed",      { state: entry.is_sensitive ? "skipped" : "done",
                              detail: entry.is_sensitive ? "Skipped (sensitive)" : "1536 dims",
                              elapsed: totalMs * 0.2 });
      setStep("insert",     { state: "done",    detail: `id: ${entry.id.slice(0, 8)}…`, elapsed: totalMs * 0.05 });

      setResult({ entry, raw_text: entry.raw_text });
      setRecentEntries(prev => [entry, ...prev].slice(0, 5));
      setTextInput("");

    } catch (err) {
      const msg = err instanceof Error ? err.message : "Pipeline failed";
      setError(msg);
      // Mark all running steps as errored
      setSteps(prev => prev.map(s => s.state === "running" ? { ...s, state: "error" } : s));
    } finally {
      setProcessing(false);
    }
  }, []);

  const handleMicClick = useCallback(async () => {
    if (recording) {
      const blob = await stopRecording();
      if (blob) await runPipeline(blob, null);
    } else {
      await startRecording();
    }
  }, [recording, stopRecording, startRecording, runPipeline]);

  const handleTextSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim() || processing) return;
    await runPipeline(null, textInput);
  }, [textInput, processing, runPipeline]);

  // ─── Render ──────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#f5f4f0] font-sans">

      {/* ── Header ────────────────────────────────────────────────── */}
      <header className="border-b border-black/10 bg-white/80 backdrop-blur px-6 py-3 flex items-center gap-4">
        <div className="w-2 h-2 rounded-full bg-black" />
        <span className="text-xs font-bold tracking-[0.3em] uppercase text-black/50">HeyPoco</span>
        <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-100 text-amber-700 border border-amber-200">
          DEV / TEST
        </span>
        <span className="text-xs text-black/40 ml-auto">
          User: <strong>kshitij</strong> · {TEST_TIMEZONE}
        </span>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">

        {/* ── Mic + Text Input ──────────────────────────────────── */}
        <section className="bg-white rounded-2xl border border-black/8 p-8 flex flex-col items-center gap-6">
          <p className="text-sm text-black/40 text-center">
            Hold to record voice, or type below to test the full pipeline.
          </p>

          {/* Mic button */}
          <button
            onClick={handleMicClick}
            disabled={processing}
            className={[
              "w-24 h-24 rounded-full flex items-center justify-center transition-all duration-200 text-3xl select-none",
              recording
                ? "bg-red-500 text-white scale-105 shadow-lg shadow-red-200 animate-pulse"
                : processing
                  ? "bg-black/10 text-black/30 cursor-not-allowed"
                  : "bg-black text-white hover:bg-black/80 hover:scale-105 shadow-md"
            ].join(" ")}
          >
            {recording ? "■" : processing ? "…" : "🎤"}
          </button>

          {recording && (
            <p className="text-sm text-red-500 font-mono animate-pulse">
              ● REC {recSeconds}s — click to stop
            </p>
          )}

          {/* Divider */}
          <div className="flex items-center gap-3 w-full">
            <div className="flex-1 h-px bg-black/8" />
            <span className="text-xs text-black/30">or type</span>
            <div className="flex-1 h-px bg-black/8" />
          </div>

          {/* Text input */}
          <form onSubmit={handleTextSubmit} className="w-full flex gap-2">
            <input
              value={textInput}
              onChange={e => setTextInput(e.target.value)}
              placeholder='e.g. "Spent $60 at Starbucks this morning"'
              disabled={processing || recording}
              className="flex-1 text-sm border border-black/15 rounded-xl px-4 py-3 bg-[#f9f8f6] placeholder-black/25 focus:outline-none focus:ring-2 focus:ring-black/20 disabled:opacity-40"
            />
            <button
              type="submit"
              disabled={!textInput.trim() || processing || recording}
              className="px-4 py-3 rounded-xl bg-black text-white text-sm font-medium hover:bg-black/80 disabled:opacity-30 transition-opacity"
            >
              Send
            </button>
          </form>

          {/* Error */}
          {error && (
            <div className="w-full rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-3">
              ✗ {error}
            </div>
          )}
        </section>

        {/* ── Pipeline Steps ────────────────────────────────────── */}
        <section className="bg-white rounded-2xl border border-black/8 p-6 space-y-3">
          <h2 className="text-xs font-bold tracking-[0.2em] uppercase text-black/40 mb-4">
            Pipeline
          </h2>
          {steps.map((step, i) => (
            <StepRow key={step.id} step={step} index={i} />
          ))}
        </section>

        {/* ── Result ────────────────────────────────────────────── */}
        {result && (
          <section className="bg-white rounded-2xl border border-black/8 p-6 space-y-5">
            <h2 className="text-xs font-bold tracking-[0.2em] uppercase text-black/40">
              Saved Entry
            </h2>

            <EntryCard entry={result.entry} />
          </section>
        )}

        {/* ── Recent Entries ────────────────────────────────────── */}
        {recentEntries.length > 0 && (
          <section className="bg-white rounded-2xl border border-black/8 p-6">
            <h2 className="text-xs font-bold tracking-[0.2em] uppercase text-black/40 mb-4">
              Saved This Session
            </h2>
            <div className="space-y-2">
              {recentEntries.map(e => (
                <div key={e.id} className="flex items-center gap-3 text-sm py-2 border-b border-black/5 last:border-0">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${TYPE_COLOURS[e.type] ?? TYPE_COLOURS.general}`}>
                    {e.type}
                  </span>
                  <span className="text-black/70 truncate flex-1">{e.raw_text}</span>
                  <span className="text-black/30 font-mono text-[10px] shrink-0">{e.id.slice(0, 8)}…</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Quick tests ───────────────────────────────────────── */}
        <section className="bg-white rounded-2xl border border-black/8 p-6">
          <h2 className="text-xs font-bold tracking-[0.2em] uppercase text-black/40 mb-4">
            Quick Test Phrases
          </h2>
          <div className="flex flex-wrap gap-2">
            {QUICK_TESTS.map(t => (
              <button
                key={t}
                onClick={() => setTextInput(t)}
                disabled={processing || recording}
                className="text-xs px-3 py-1.5 rounded-full bg-[#f5f4f0] text-black/60 hover:bg-black/10 transition-colors disabled:opacity-30 border border-black/8"
              >
                {t}
              </button>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}

// ─── Quick test buttons ───────────────────────────────────────────────────────

const QUICK_TESTS = [
  "Spent $60 at Starbucks this morning",
  "Today was amazing, felt super focused",
  "Send the contract to Sarah by Friday",
  "Dentist appointment tomorrow at 3pm",
  "Ahmed is moving to Dubai next month",
  "Headache all morning, took paracetamol",
  "My SSN is 123-45-6789 (PII test)",
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function StepRow({ step, index }: { step: PipelineStep; index: number }) {
  const icons: Record<StepState, string> = {
    idle:    "○",
    running: "◌",
    done:    "✓",
    skipped: "–",
    error:   "✗",
  };
  const colours: Record<StepState, string> = {
    idle:    "text-black/20",
    running: "text-blue-500 animate-spin",
    done:    "text-green-600",
    skipped: "text-black/30",
    error:   "text-red-500",
  };

  return (
    <div className="flex items-center gap-3 py-1">
      <span className={`text-sm w-4 text-center font-mono ${colours[step.state]}`}>
        {icons[step.state]}
      </span>
      <div className="flex-1">
        <span className={`text-sm font-medium ${step.state === "idle" ? "text-black/30" : "text-black/80"}`}>
          {step.label}
        </span>
        <span className="text-xs text-black/30 ml-2">{step.sub}</span>
      </div>
      {step.detail && (
        <span className="text-xs font-mono text-black/40 shrink-0">{step.detail}</span>
      )}
    </div>
  );
}

function EntryCard({ entry }: { entry: SavedEntry }) {
  const typeClass = TYPE_COLOURS[entry.type] ?? TYPE_COLOURS.general;

  return (
    <div className="space-y-4">
      {/* Type + ID */}
      <div className="flex items-center gap-3">
        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wide ${typeClass}`}>
          {entry.type}
        </span>
        {entry.is_sensitive && (
          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-red-100 text-red-700">
            🔒 SENSITIVE — no embedding
          </span>
        )}
        <span className="text-xs font-mono text-black/30 ml-auto">{entry.id}</span>
      </div>

      {/* Raw text */}
      <div className="bg-[#f9f8f6] rounded-xl px-4 py-3 text-sm text-black/70 italic">
        "{entry.raw_text}"
      </div>

      {/* Meta grid */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <MetaRow label="entry_date"   value={entry.entry_date ?? "—"} />
        <MetaRow label="source"       value={entry.source} />
        <MetaRow label="tags"         value={entry.tags.join(", ") || "—"} />
        <MetaRow label="pii_types"    value={entry.pii_types.join(", ") || "none"} />
      </div>

      {/* Extracted fields */}
      {Object.keys(entry.extracted_fields).length > 0 && (
        <div>
          <p className="text-xs font-bold text-black/30 uppercase tracking-widest mb-2">
            extracted_fields
          </p>
          <div className="bg-[#f9f8f6] rounded-xl px-4 py-3 font-mono text-xs text-black/60 space-y-1">
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
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#f9f8f6] rounded-xl px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-widest text-black/30">{label}</p>
      <p className="text-sm text-black/70 mt-0.5 truncate">{value}</p>
    </div>
  );
}

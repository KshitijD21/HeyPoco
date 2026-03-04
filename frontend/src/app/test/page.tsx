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

import { useCallback, useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Send, Pause, Sparkles, Loader2, CheckCircle2, XCircle, ChevronRight } from "lucide-react";

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
  { id: "transcribe", label: "Transcription", sub: "Whisper → raw text", state: "idle" },
  { id: "pii", label: "PII Detection", sub: "Local regex — zero API calls", state: "idle" },
  { id: "extract", label: "Extraction", sub: "GPT-4o → type + fields + tags", state: "idle" },
  { id: "embed", label: "Embedding", sub: "text-embedding-3-small → 1536d", state: "idle" },
  { id: "insert", label: "Database Insert", sub: "Supabase → entries table", state: "idle" },
];

// Type → accent colour class
const TYPE_COLOURS: Record<string, string> = {
  finance: "bg-emerald-100 text-emerald-800",
  journal: "bg-blue-100 text-blue-800",
  task: "bg-amber-100 text-amber-800",
  event: "bg-purple-100 text-purple-800",
  note: "bg-slate-100 text-slate-700",
  health: "bg-red-100 text-red-800",
  general: "bg-zinc-100 text-zinc-700",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function TestPage() {
  // Recording state
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [steps, setSteps] = useState<PipelineStep[]>(INITIAL_STEPS);
  const [result, setResult] = useState<PipelineResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recSeconds, setRecSeconds] = useState(0);
  const [recentEntries, setRecentEntries] = useState<SavedEntry[]>([]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

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
      const displaySnippet = text.trim().length > 30 ? text.trim().slice(0, 30) + "..." : text.trim();
      setStep("transcribe", { state: "running", detail: `Input: "${displaySnippet}"` });
      formData.append("raw_text", text.trim());
    } else {
      setError("Provide audio or text.");
      setProcessing(false);
      return;
    }

    formData.append("user_timezone", TEST_TIMEZONE);

    // Mark remaining steps as running sequentially — updates are visual only,
    // actual processing is one POST. We animate them in sequence after the call.
    setTimeout(() => setStep("pii", { state: "running", detail: "Scanning locally…" }), 300);
    setTimeout(() => setStep("extract", { state: "running", detail: "Calling GPT-4o…" }), 600);
    setTimeout(() => setStep("embed", { state: "running", detail: "Generating vectors…" }), 900);
    setTimeout(() => setStep("insert", { state: "running", detail: "Writing to Supabase…" }), 1200);

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
      const displaySnippet = entry.raw_text.length > 25 ? entry.raw_text.slice(0, 25) + "..." : entry.raw_text;

      setStep("transcribe", {
        state: "done",
        detail: audioBlob ? `${(transcribeT / 1000).toFixed(2)}s` : `Text: "${displaySnippet}"`,
        elapsed: transcribeT
      });
      setStep("pii", { state: "done", detail: entry.is_sensitive ? `PII found: ${entry.pii_types.join(", ")}` : "No PII", elapsed: 0 });
      setStep("extract", { state: "done", detail: `type=${entry.type}`, elapsed: totalMs * 0.55 });
      setStep("embed", {
        state: entry.is_sensitive ? "skipped" : "done",
        detail: entry.is_sensitive ? "Skipped (sensitive)" : "1536 dims",
        elapsed: totalMs * 0.2
      });
      setStep("insert", { state: "done", detail: `id: ${entry.id.slice(0, 8)}…`, elapsed: totalMs * 0.05 });

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
          {recording && (
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="flex flex-col items-center space-y-2 mb-2"
              >
                <div className="flex items-center gap-1 h-6">
                  {[1, 2, 3, 4, 5, 4, 3, 2].map((i, index) => (
                    <motion.div
                      key={index}
                      className="w-1 bg-[#ef4444] rounded-full"
                      animate={{
                        height: [4, 20, 4],
                        opacity: [0.4, 1, 0.4],
                      }}
                      transition={{
                        repeat: Infinity,
                        duration: 0.8,
                        delay: i * 0.1,
                        ease: "easeInOut",
                      }}
                    />
                  ))}
                </div>
                <p className="text-[10px] font-bold text-red-500 tracking-[0.2em] uppercase animate-pulse">
                  REC {recSeconds}s — click to stop
                </p>
              </motion.div>
            </AnimatePresence>
          )}

          {/* Mic Button Area */}
          <div className="relative">
            {/* Pulse glow */}
            <div
              className={`absolute inset-0 rounded-full bg-[#2d2d2d]/10 blur-xl transition-all duration-1000 ${recording ? "scale-150 opacity-100 bg-red-500/10" : "scale-75 opacity-0"
                }`}
            />

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleMicClick}
              disabled={processing}
              className={`relative w-24 h-24 rounded-full flex items-center justify-center shadow-2xl transition-all duration-500 z-10 ${recording
                ? "bg-[#ef4444] text-white scale-110"
                : processing
                  ? "bg-[#e5e5e5] text-[#737373] cursor-not-allowed"
                  : "bg-[#1a1a1a] text-white hover:scale-105"
                }`}
            >
              <AnimatePresence mode="wait">
                {recording ? (
                  <motion.div
                    key="stop"
                    initial={{ opacity: 0, rotate: -90 }}
                    animate={{ opacity: 1, rotate: 0 }}
                    exit={{ opacity: 0, rotate: 90 }}
                  >
                    <Pause size={32} fill="currentColor" />
                  </motion.div>
                ) : processing ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <Loader2 size={32} className="animate-spin" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="mic"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <Mic size={32} strokeWidth={1.5} />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 w-full max-w-sm">
            <div className="flex-1 h-px bg-black/5" />
            <span className="text-[10px] font-bold text-black/20 uppercase tracking-widest">or type</span>
            <div className="flex-1 h-px bg-black/5" />
          </div>

          {/* Text input */}
          <form onSubmit={handleTextSubmit} className="w-full max-w-xl relative group">
            <input
              value={textInput}
              onChange={e => setTextInput(e.target.value)}
              placeholder='Try "Spent $60 at Starbucks"'
              disabled={processing || recording}
              className="w-full pl-6 pr-14 py-4 bg-[#f4f4f5]/50 border border-transparent rounded-2xl text-base font-light text-[#1a1a1a] focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#2d2d2d]/20 focus:border-[#e5e5e5] transition-all placeholder:text-[#737373]/60 shadow-inner disabled:opacity-40"
            />
            <button
              type="submit"
              disabled={!textInput.trim() || processing || recording}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-[#737373] hover:text-[#2d2d2d] disabled:opacity-30 transition-colors"
            >
              <Send size={20} strokeWidth={2} />
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
        <section className="bg-white rounded-3xl border border-[#e5e5e5]/50 p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-6 bg-[#1a1a1a] rounded-full" />
            <h2 className="text-[11px] font-black tracking-[0.2em] uppercase text-black/40">
              Pipeline Execution
            </h2>
          </div>
          <div className="space-y-4">
            {steps.map((step, i) => (
              <StepRow key={step.id} step={step} index={i} />
            ))}
          </div>
        </section>

        {/* ── Result ────────────────────────────────────────────── */}
        {result && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl border border-[#e5e5e5]/50 p-8 shadow-lg space-y-6"
          >
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-[#3b82f6]" />
              <h2 className="text-[11px] font-black tracking-[0.2em] uppercase text-black/40">
                Processed Result
              </h2>
            </div>

            <EntryCard entry={result.entry} />
          </motion.section>
        )}

        {/* ── Recent Entries ────────────────────────────────────── */}
        {recentEntries.length > 0 && (
          <section className="bg-white rounded-3xl border border-[#e5e5e5]/50 p-8 shadow-sm">
            <h2 className="text-[11px] font-black tracking-[0.2em] uppercase text-black/40 mb-6">
              Saved This Session
            </h2>
            <div className="space-y-3">
              {recentEntries.map(e => (
                <div key={e.id} className="group flex items-center gap-4 py-3 px-4 rounded-2xl hover:bg-[#f9f8f6] transition-colors border border-transparent hover:border-black/5">
                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${TYPE_COLOURS[e.type] ?? TYPE_COLOURS.general}`}>
                    {e.type}
                  </span>
                  <span className="text-sm text-black/70 truncate flex-1 font-light italic">"{e.raw_text}"</span>
                  <ChevronRight size={14} className="text-black/10 group-hover:text-black/30 transition-colors" />
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
  const icons: Record<StepState, React.ReactNode> = {
    idle: <div className="w-2 h-2 rounded-full border border-black/20" />,
    running: <Loader2 size={14} className="animate-spin text-blue-500" />,
    done: <CheckCircle2 size={14} className="text-emerald-500" />,
    skipped: <div className="w-2 h-0.5 bg-black/20" />,
    error: <XCircle size={14} className="text-red-500" />,
  };

  const statusColors: Record<StepState, string> = {
    idle: "opacity-20",
    running: "opacity-100",
    done: "opacity-100",
    skipped: "opacity-40",
    error: "opacity-100",
  };

  return (
    <div className={`flex items-center gap-4 px-4 py-3 rounded-2xl border transition-all duration-300 ${step.state === "running" ? "bg-blue-50/50 border-blue-100" :
      step.state === "error" ? "bg-red-50/50 border-red-100" :
        "border-transparent"
      } ${statusColors[step.state]}`}>
      <div className="w-6 flex justify-center">
        {icons[step.state]}
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-[#1a1a1a]">
          {step.label}
        </p>
        <p className="text-[11px] text-[#737373]/60 font-light">
          {step.sub}
        </p>
      </div>
      {step.detail && (
        <span className="text-[11px] font-mono bg-black/5 px-2 py-0.5 rounded-md text-black/50">
          {step.detail}
        </span>
      )}
    </div>
  );
}

function EntryCard({ entry }: { entry: SavedEntry }) {
  const typeClass = TYPE_COLOURS[entry.type] ?? TYPE_COLOURS.general;

  return (
    <div className="space-y-6">
      {/* Type + ID */}
      <div className="flex items-center gap-3">
        <span className={`px-3 py-1 rounded-xl text-[11px] font-black uppercase tracking-widest bg-white border shadow-sm ${typeClass}`}>
          {entry.type}
        </span>
        {entry.is_sensitive && (
          <span className="px-3 py-1 rounded-xl text-[11px] font-black tracking-widest bg-red-50 text-red-600 border border-red-100 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
            SENSITIVE
          </span>
        )}
        <span className="text-[10px] font-mono text-black/20 ml-auto select-all">{entry.id}</span>
      </div>

      {/* Raw text */}
      <div className="bg-[#f9f8f6] rounded-2xl px-6 py-5 text-base text-[#1a1a1a] font-light italic leading-relaxed shadow-inner border border-black/5">
        "{entry.raw_text}"
      </div>

      {/* Meta grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <MetaRow label="entry_date" value={entry.entry_date ?? "—"} />
        <MetaRow label="source" value={entry.source} />
        <MetaRow label="tags" value={entry.tags.join(", ") || "—"} />
        <MetaRow label="pii_types" value={entry.pii_types.join(", ") || "none"} />
      </div>

      {/* Extracted fields */}
      {Object.keys(entry.extracted_fields).length > 0 && (
        <div className="space-y-3">
          <p className="text-[11px] font-black text-black/30 uppercase tracking-[0.2em]">
            Extracted Intelligence
          </p>
          <div className="bg-[#1a1a1a] rounded-2xl p-6 font-mono text-[12px] text-white/80 space-y-2 shadow-xl">
            {Object.entries(entry.extracted_fields).map(([k, v]) => (
              <div key={k} className="flex gap-3 border-b border-white/5 pb-2 last:border-0 last:pb-0">
                <span className="text-[#3b82f6] font-bold w-32 shrink-0">{k}:</span>
                <span className="text-white/60">{JSON.stringify(v)}</span>
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
    <div className="bg-white border border-[#e5e5e5]/50 rounded-2xl px-5 py-3 shadow-sm">
      <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#737373]/50 mb-1">{label}</p>
      <p className="text-sm text-[#1a1a1a] font-medium truncate">{value}</p>
    </div>
  );
}

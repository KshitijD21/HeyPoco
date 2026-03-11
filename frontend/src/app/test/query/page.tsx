"use client";

/**
 * /test/query  — HeyPoco Retrieval Pipeline Test Page
 *
 * A dev-only page to test the retrieval/query pipeline
 * end-to-end without needing to log in.
 *
 * Calls  POST /api/dev/query  (only active when backend DEBUG=True).
 * Uses the hardcoded test user "kshitij" (timezone: Asia/Kolkata).
 *
 * Access: http://localhost:3000/test/query
 */

import { useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Send,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  ArrowLeft,
  MessageSquare,
  Database,
  Zap,
  Brain,
  SkipForward,
} from "lucide-react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

interface EntrySource {
  id: string;
  type: string;
  raw_text: string;
  entry_date: string | null;
  tags: string[];
  extracted_fields: Record<string, unknown>;
  is_sensitive: boolean;
  similarity?: number;
}

interface PipelineStep {
  id: string;
  label: string;
  status: "done" | "skipped";
  detail: string | null;
  duration_ms: number | null;
}

interface QueryResult {
  answer: string;
  sources: EntrySource[];
  has_data: boolean;
  fallback_triggered: boolean;
  finance_total: number | null;
  confidence: string;
  pipeline_steps: PipelineStep[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const TYPE_COLOURS: Record<string, string> = {
  finance: "bg-emerald-100 text-emerald-800",
  journal: "bg-blue-100 text-blue-800",
  task: "bg-amber-100 text-amber-800",
  event: "bg-purple-100 text-purple-800",
  note: "bg-slate-100 text-slate-700",
  health: "bg-red-100 text-red-800",
  general: "bg-zinc-100 text-zinc-700",
};

const CONFIDENCE_STYLES: Record<string, string> = {
  high: "bg-emerald-50 text-emerald-700 border-emerald-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  low: "bg-red-50 text-red-700 border-red-200",
};

const QUICK_QUERIES = [
  { label: "Finance", query: "How much did I spend this week?" },
  { label: "Journal", query: "When did I last feel productive?" },
  { label: "Person", query: "What has Ahmed been up to?" },
  { label: "List", query: "Show me my journals this week" },
  { label: "Task", query: "What are my open tasks?" },
  { label: "Health", query: "Any health logs recently?" },
  { label: "Fallback", query: "How much did I spend on shopping?" },
  { label: "Semantic", query: "What happened at Starbucks?" },
  { label: "Empty", query: "Tell me about my trip to Mars" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function QueryTestPage() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState<number | null>(null);
  const [history, setHistory] = useState<
    Array<{ question: string; answer: string; confidence: string; elapsed: number }>
  >([]);

  const runQuery = useCallback(async (q: string) => {
    if (!q.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setElapsed(null);

    const t0 = Date.now();

    try {
      const res = await fetch(`${API_BASE}/api/dev/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });

      const ms = Date.now() - t0;
      setElapsed(ms);

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Unknown error" }));
        throw new Error(err.detail || `HTTP ${res.status}`);
      }

      const data: QueryResult = await res.json();
      setResult(data);
      setHistory((prev) => [
        { question: q, answer: data.answer, confidence: data.confidence, elapsed: ms },
        ...prev,
      ].slice(0, 10));
      setQuestion("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Query failed");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      runQuery(question);
    },
    [question, runQuery]
  );

  return (
    <div className="min-h-screen bg-[#f5f4f0] font-sans">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="border-b border-black/10 bg-white/80 backdrop-blur px-6 py-3 flex items-center gap-4">
        <div className="w-2 h-2 rounded-full bg-black" />
        <span className="text-xs font-bold tracking-[0.3em] uppercase text-black/50">
          HeyPoco
        </span>
        <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-violet-100 text-violet-700 border border-violet-200">
          RETRIEVAL TEST
        </span>

        <div className="ml-auto flex items-center gap-4">
          <Link
            href="/test"
            className="text-xs text-black/40 hover:text-black/70 transition-colors flex items-center gap-1"
          >
            <ArrowLeft size={12} />
            Ingestion Test
          </Link>
          <span className="text-xs text-black/40">
            User: <strong>kshitij</strong> · Asia/Kolkata
          </span>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
        {/* ── Query Input ─────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl border border-black/8 p-8 space-y-6">
          <div className="flex items-center gap-3">
            <Search size={18} className="text-black/30" />
            <p className="text-sm text-black/40">
              Ask a question about your logged entries.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="relative">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder='Try "How much did I spend this week?"'
              disabled={loading}
              className="w-full pl-6 pr-14 py-4 bg-[#f4f4f5]/50 border border-transparent rounded-2xl text-base font-light text-[#1a1a1a] focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#2d2d2d]/20 focus:border-[#e5e5e5] transition-all placeholder:text-[#737373]/60 shadow-inner disabled:opacity-40"
            />
            <button
              type="submit"
              disabled={!question.trim() || loading}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-[#737373] hover:text-[#2d2d2d] disabled:opacity-30 transition-colors"
            >
              {loading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <Send size={20} strokeWidth={2} />
              )}
            </button>
          </form>

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-3">
              {error}
            </div>
          )}
        </section>

        {/* ── Answer ──────────────────────────────────────────────── */}
        <AnimatePresence>
          {result && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white rounded-3xl border border-[#e5e5e5]/50 p-8 shadow-lg space-y-6"
            >
              {/* Meta bar */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <Brain size={16} className="text-violet-500" />
                  <h2 className="text-[11px] font-black tracking-[0.2em] uppercase text-black/40">
                    Answer
                  </h2>
                </div>

                <span
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${
                    CONFIDENCE_STYLES[result.confidence] ?? CONFIDENCE_STYLES.low
                  }`}
                >
                  {result.confidence} confidence
                </span>

                {result.fallback_triggered && (
                  <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-600 border border-amber-200 flex items-center gap-1">
                    <AlertTriangle size={10} />
                    Fallback
                  </span>
                )}

                {result.finance_total !== null && (
                  <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Total: ${result.finance_total.toFixed(2)}
                  </span>
                )}

                {elapsed !== null && (
                  <span className="text-[10px] font-mono text-black/25 ml-auto">
                    {(elapsed / 1000).toFixed(2)}s
                  </span>
                )}
              </div>

              {/* Pipeline Steps */}
              {result.pipeline_steps?.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-black/30 mb-2">
                    Pipeline
                  </p>
                  {result.pipeline_steps.map((step, i) => (
                    <div
                      key={step.id}
                      className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-[#f9f8f6] border border-black/5"
                    >
                      {/* Step icon */}
                      {step.status === "done" ? (
                        <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                      ) : (
                        <SkipForward size={14} className="text-black/20 shrink-0" />
                      )}

                      {/* Step number + label */}
                      <span className="text-[10px] font-mono text-black/25 shrink-0">
                        {i + 1}.
                      </span>
                      <span className={`text-xs font-medium ${step.status === "done" ? "text-black/70" : "text-black/30"}`}>
                        {step.label}
                      </span>

                      {/* Detail */}
                      {step.detail && (
                        <span className="text-[10px] text-black/30 font-mono truncate">
                          {step.detail}
                        </span>
                      )}

                      {/* Duration */}
                      <span className="ml-auto text-[10px] font-mono text-black/20 shrink-0">
                        {step.duration_ms != null ? `${step.duration_ms}ms` : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Answer text */}
              <div className="bg-[#f9f8f6] rounded-2xl px-6 py-5 text-base text-[#1a1a1a] font-light leading-relaxed shadow-inner border border-black/5 whitespace-pre-wrap">
                {result.answer}
              </div>

              {/* Stats bar */}
              <div className="flex gap-4">
                <StatPill
                  icon={<Database size={12} />}
                  label="Sources"
                  value={String(result.sources.length)}
                />
                <StatPill
                  icon={<Zap size={12} />}
                  label="Has Data"
                  value={result.has_data ? "Yes" : "No"}
                />
                {result.finance_total !== null && (
                  <StatPill
                    icon={<MessageSquare size={12} />}
                    label="Finance Total"
                    value={`$${result.finance_total.toFixed(2)}`}
                  />
                )}
              </div>

              {/* Sources */}
              {result.sources.length > 0 && (
                <div className="space-y-3">
                  <p className="text-[11px] font-black text-black/30 uppercase tracking-[0.2em]">
                    Source Entries ({result.sources.length})
                  </p>
                  <div className="space-y-2">
                    {result.sources.map((s) => (
                      <SourceCard key={s.id} entry={s} />
                    ))}
                  </div>
                </div>
              )}
            </motion.section>
          )}
        </AnimatePresence>

        {/* ── Quick Queries ───────────────────────────────────────── */}
        <section className="bg-white rounded-2xl border border-black/8 p-6 space-y-4">
          <h2 className="text-xs font-bold tracking-[0.2em] uppercase text-black/40">
            Quick Test Queries
          </h2>
          <div className="flex flex-wrap gap-2">
            {QUICK_QUERIES.map((q) => (
              <button
                key={q.query}
                onClick={() => runQuery(q.query)}
                disabled={loading}
                className="text-xs px-3 py-1.5 rounded-full bg-[#f5f4f0] text-black/60 hover:bg-black/10 transition-colors disabled:opacity-30 border border-black/8 flex items-center gap-1.5"
              >
                <span className="font-bold text-black/30">{q.label}</span>
                <ChevronRight size={10} className="text-black/20" />
                <span className="italic">{q.query}</span>
              </button>
            ))}
          </div>
        </section>

        {/* ── History ─────────────────────────────────────────────── */}
        {history.length > 0 && (
          <section className="bg-white rounded-3xl border border-[#e5e5e5]/50 p-8 shadow-sm space-y-4">
            <h2 className="text-[11px] font-black tracking-[0.2em] uppercase text-black/40">
              Query History (this session)
            </h2>
            <div className="space-y-2">
              {history.map((h, i) => (
                <div
                  key={i}
                  className="group flex items-start gap-4 py-3 px-4 rounded-2xl hover:bg-[#f9f8f6] transition-colors border border-transparent hover:border-black/5 cursor-pointer"
                  onClick={() => {
                    setQuestion(h.question);
                  }}
                >
                  <span
                    className={`mt-0.5 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border shrink-0 ${
                      CONFIDENCE_STYLES[h.confidence] ?? CONFIDENCE_STYLES.low
                    }`}
                  >
                    {h.confidence}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1a1a1a] truncate">
                      {h.question}
                    </p>
                    <p className="text-xs text-black/40 truncate mt-0.5">
                      {h.answer}
                    </p>
                  </div>
                  <span className="text-[10px] font-mono text-black/20 shrink-0">
                    {(h.elapsed / 1000).toFixed(1)}s
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── No Data Banner ─────────────────────────────────────── */}
        {!result && !loading && history.length === 0 && (
          <section className="bg-white/50 rounded-2xl border border-dashed border-black/10 p-8 text-center space-y-3">
            <p className="text-sm text-black/30 font-light">
              No queries yet. Type a question or click a quick test above.
            </p>
            <p className="text-xs text-black/20">
              Make sure you have entries in the database first.{" "}
              <Link href="/test" className="underline hover:text-black/40">
                Ingest some data
              </Link>{" "}
              or use the SQL insert below.
            </p>
          </section>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatPill({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-[#f9f8f6] rounded-xl border border-black/5">
      <span className="text-black/30">{icon}</span>
      <span className="text-[10px] text-black/40 font-medium">{label}:</span>
      <span className="text-[11px] text-black/70 font-bold">{value}</span>
    </div>
  );
}

function SourceCard({ entry }: { entry: EntrySource }) {
  const typeClass = TYPE_COLOURS[entry.type] ?? TYPE_COLOURS.general;
  const date = entry.entry_date
    ? new Date(entry.entry_date).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

  const fields = entry.extracted_fields || {};
  const cleanFields = Object.entries(fields).filter(
    ([, v]) => v !== null && v !== "" && JSON.stringify(v) !== "[]" && JSON.stringify(v) !== "{}"
  );

  return (
    <div className="bg-[#f9f8f6] rounded-2xl p-4 border border-black/5 space-y-3">
      {/* Header row */}
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${typeClass}`}
        >
          {entry.type}
        </span>
        <span className="text-[10px] text-black/30">{date}</span>

        {entry.similarity !== undefined && entry.similarity !== null && (
          <span
            className={`ml-auto text-[10px] font-mono px-2 py-0.5 rounded ${
              entry.similarity < 0.3
                ? "bg-emerald-50 text-emerald-600"
                : entry.similarity < 0.6
                ? "bg-amber-50 text-amber-600"
                : "bg-red-50 text-red-600"
            }`}
          >
            {entry.similarity < 0.3
              ? "strong"
              : entry.similarity < 0.6
              ? "related"
              : "weak"}{" "}
            ({entry.similarity.toFixed(3)})
          </span>
        )}
      </div>

      {/* Raw text */}
      <p className="text-sm text-[#1a1a1a] font-light italic leading-relaxed">
        &ldquo;{entry.raw_text}&rdquo;
      </p>

      {/* Fields (collapsed) */}
      {cleanFields.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {cleanFields.map(([k, v]) => (
            <span
              key={k}
              className="text-[10px] px-2 py-0.5 rounded-md bg-white border border-black/5 text-black/50"
            >
              <span className="font-bold text-black/40">{k}:</span>{" "}
              {typeof v === "object" ? JSON.stringify(v) : String(v)}
            </span>
          ))}
        </div>
      )}

      {/* Tags */}
      {entry.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {entry.tags.map((t) => (
            <span
              key={t}
              className="text-[9px] px-2 py-0.5 rounded-full bg-black/5 text-black/40 font-medium"
            >
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

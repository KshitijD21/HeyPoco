"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Mic, Send, Pause, Sparkles,
    CreditCard, CheckCircle2, HeartPulse,
    Briefcase, Clock, FileText,
} from "lucide-react";
import { ingestEntry, queryEntries, transcribeAudio } from "@/lib/api-client";
import type { IngestResponse, QueryResponse } from "@/types";

/* ─── Types ──────────────────────────────────────────────────────────────── */

interface RichData {
    type: "expense" | "summary" | "schedule" | "health" | "note" | "journal";
    // expense
    amount?: string;
    merchant?: string;
    // summary
    totalAmount?: string;
    count?: number;
    stats?: Array<{ label: string; value: string; color?: string }>;
    // schedule
    items?: Array<{ label: string; time: string }>;
    // health
    steps?: string;
    sleep?: string;
    mood?: string;
    // note / journal
    body?: string;
    tags?: string[];
    person?: string;
}

interface ChatMessage {
    id: string;
    text: string;
    sender: "user" | "poco";
    category?: string;
    timestamp: Date;
    richData?: RichData;
    error?: boolean;
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function formatTime(raw: string): string {
    // Try parsing as ISO datetime; fall back to returning as-is
    try {
        const d = new Date(raw);
        if (!isNaN(d.getTime())) {
            return d.toLocaleString(undefined, {
                weekday: "short", month: "short", day: "numeric",
                hour: "numeric", minute: "2-digit",
            });
        }
    } catch {
        // ignore
    }
    return raw;
}

function isQuery(text: string): boolean {
    const lower = text.toLowerCase().trim();
    const startsWithQuery = [
        "how much", "how many", "what", "when", "who", "where", "why",
        "show me", "list", "find", "search", "tell me", "give me",
    ];
    const containsQuery = ["did i", "have i", "do i", "summary", "total", "any"];
    return (
        startsWithQuery.some((w) => lower.startsWith(w)) ||
        (containsQuery.some((w) => lower.includes(w)) && lower.endsWith("?")) ||
        lower.endsWith("?")
    );
}

function ingestToRichData(response: IngestResponse): RichData | undefined {
    const f = response.extracted_fields as Record<string, unknown>;

    if (response.type === "finance") {
        const amount = f.amount != null ? `$${Number(f.amount).toFixed(2)}` : "";
        const merchant = (f.merchant as string) || (f.category as string) || "Purchase";
        return { type: "expense", amount, merchant };
    }

    if (response.type === "task" || response.type === "event") {
        const label = (f.action as string) || (f.title as string) || response.raw_text.slice(0, 60);
        const rawTime = (f.scheduled_at as string) || (f.deadline as string) || "";
        const time = rawTime ? formatTime(rawTime) : "Scheduled";
        return { type: "schedule", items: [{ label, time }] };
    }

    if (response.type === "health") {
        // Backend has no steps/sleep fields — parse them from raw_text
        const raw = response.raw_text.toLowerCase();
        const stepsMatch = raw.match(/(\d[\d,]*)\s*steps?/);
        const sleepMatch = raw.match(/(\d+(?:\.\d+)?)\s*h(?:ours?)?(?:\s+(?:of\s+)?sleep)?/) ||
            raw.match(/slept\s+(\d+(?:\.\d+)?)\s*h/);
        return {
            type: "health",
            steps: stepsMatch ? stepsMatch[1].replace(/,/g, "") : undefined,
            sleep: sleepMatch ? `${sleepMatch[1]}h` : undefined,
            mood: (f.mood as string) || undefined,
            body: (f.notes as string) || (f.symptom as string) || undefined,
        };
    }

    if (response.type === "journal") {
        const tags = Array.isArray(response.tags) ? response.tags : [];
        // Prefer structured highlights; fall back to notes/topic; never dump raw_text
        const highlights = Array.isArray(f.highlights) && f.highlights.length > 0
            ? (f.highlights as string[]).join(" · ")
            : undefined;
        const body = highlights || (f.notes as string) || (f.topic as string) || undefined;
        return {
            type: "journal",
            body,
            mood: (f.mood as string) || undefined,
            tags,
        };
    }

    if (response.type === "note" || response.type === "general") {
        const tags = Array.isArray(response.tags) ? response.tags : [];
        return {
            type: "note",
            body: response.raw_text.slice(0, 120),
            person: (f.person as string) || undefined,
            tags,
        };
    }

    return undefined;
}

function ingestToCategory(response: IngestResponse): string {
    const map: Record<string, string> = {
        finance: "EXPENSE", task: "TASK", event: "EVENT",
        journal: "JOURNAL", health: "HEALTH", note: "NOTE", general: "NOTE",
    };
    return map[response.type] || "NOTE";
}

function ingestToReply(response: IngestResponse): string {
    const f = response.extracted_fields as Record<string, unknown>;
    if (response.type === "finance") {
        const amount = f.amount != null ? `$${Number(f.amount).toFixed(2)}` : "";
        return `Got it. ${amount} tracked.`;
    }
    if (response.type === "task") return "Task noted.";
    if (response.type === "event") return "Event logged.";
    if (response.type === "journal") return "Journal entry saved.";
    if (response.type === "health") return "Health note saved.";
    return "Noted.";
}

function queryToRichData(response: QueryResponse): RichData | undefined {
    if (response.finance_total != null && response.finance_total > 0) {
        const stats = response.sources
            .filter((s) => (s.extracted_fields as Record<string, unknown>)?.amount != null)
            .slice(0, 5)
            .map((s) => {
                const ef = s.extracted_fields as Record<string, unknown>;
                return {
                    label: (ef.merchant as string) || (ef.category as string) || "Purchase",
                    value: `$${Number(ef.amount).toFixed(2)}`,
                };
            });
        return {
            type: "summary",
            totalAmount: `$${response.finance_total.toFixed(2)}`,
            count: response.sources.length,
            stats,
        };
    }
    return undefined;
}

const CATEGORY_COLORS: Record<string, string> = {
    EXPENSE: "#ff6b6b", TASK: "#4ecdc4", EVENT: "#a66cff",
    JOURNAL: "#f59e0b", HEALTH: "#10b981", NOTE: "#95a5a6", QUERY: "#3b82f6",
};

/* ─── Rich Components ────────────────────────────────────────────────────── */

function ExpenseCard({ data }: { data: RichData }) {
    return (
        <div className="w-full bg-white border border-[#e5e5e5]/50 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-[#faf9f6] text-[#ff6b6b]">
                    <CreditCard size={16} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#737373]/40">Finance</span>
            </div>
            <div className="flex justify-between items-end">
                <div className="flex flex-col gap-0.5">
                    <span className="text-[13px] text-[#737373]">You paid</span>
                    <span className="text-3xl font-light text-[#1a1a1a] tracking-tight">{data.amount}</span>
                </div>
                <div className="text-right">
                    <span className="text-[11px] text-[#737373]/50 block mb-1">at</span>
                    <span className="text-base font-medium text-[#1a1a1a]">{data.merchant}</span>
                </div>
            </div>
            <div className="flex items-center gap-2 pt-1 border-t border-[#e5e5e5]/30">
                <div className="w-1.5 h-1.5 rounded-full bg-[#ff6b6b]" />
                <span className="text-[10px] text-[#737373]/50 font-medium uppercase tracking-widest">Tracked in expenses</span>
            </div>
        </div>
    );
}

function SummaryCard({ data }: { data: RichData }) {
    return (
        <div className="w-full bg-[#1a1a1a] text-white rounded-3xl p-5 shadow-xl space-y-4">
            <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-white/10">
                    <CreditCard size={16} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">Finance</span>
            </div>
            <div className="flex justify-between items-end">
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] mb-1">Total Spent</span>
                    <span className="text-3xl font-light">{data.totalAmount}</span>
                </div>
                <span className="text-[10px] font-medium text-white/40 mb-1">{data.count} entries</span>
            </div>
            {data.stats && data.stats.length > 0 && (
                <div className="space-y-2.5 pt-2 border-t border-white/10">
                    {data.stats.map((stat, i) => (
                        <div key={i} className="flex flex-col gap-1.5">
                            <div className="flex justify-between text-[11px] font-medium">
                                <span className="text-white/50">{stat.label}</span>
                                <span className="text-white/80">{stat.value}</span>
                            </div>
                            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: "65%" }}
                                    transition={{ delay: 0.3 + i * 0.1, duration: 0.8 }}
                                    className="h-full rounded-full"
                                    style={{ backgroundColor: stat.color || "#3b82f6" }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function ScheduleCard({ data }: { data: RichData }) {
    return (
        <div className="w-full bg-white border border-[#e5e5e5]/50 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-[#faf9f6] text-[#4ecdc4]">
                    <CheckCircle2 size={16} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#737373]/40">Commitment</span>
            </div>
            <div className="space-y-3">
                {data.items?.map((item, i) => (
                    <div key={i} className="p-3 rounded-2xl bg-[#4ecdc4]/5 border border-[#4ecdc4]/10">
                        <span className="text-[10px] font-bold text-[#4ecdc4] uppercase block mb-1">Scheduled</span>
                        <div className="flex items-center gap-2">
                            <Clock size={12} className="text-[#4ecdc4]" />
                            <span className="text-[13px] font-medium text-[#1a1a1a]">{item.label}</span>
                        </div>
                        <span className="text-[11px] text-[#737373]/60 mt-1 block pl-5">{item.time}</span>
                    </div>
                ))}
                {!data.items?.length && (
                    <div className="py-3 text-[12px] text-[#737373]/40 italic text-center">Nothing scheduled</div>
                )}
            </div>
        </div>
    );
}

function HealthCard({ data }: { data: RichData }) {
    return (
        <div className="w-full bg-white border border-[#e5e5e5]/50 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-[#faf9f6] text-[#ff6b6b]">
                    <HeartPulse size={16} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#737373]/40">Wellness</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
                {data.steps && (
                    <div className="p-3 rounded-2xl border border-[#e5e5e5]/50 bg-[#faf9f6]/50">
                        <span className="text-[10px] font-bold text-[#737373]/50 uppercase block mb-1">Steps</span>
                        <span className="text-xl font-medium text-[#1a1a1a]">{data.steps}</span>
                    </div>
                )}
                {data.sleep && (
                    <div className="p-3 rounded-2xl border border-[#e5e5e5]/50 bg-[#faf9f6]/50">
                        <span className="text-[10px] font-bold text-[#737373]/50 uppercase block mb-1">Sleep</span>
                        <span className="text-xl font-medium text-[#1a1a1a]">{data.sleep}</span>
                    </div>
                )}
            </div>
            {data.mood && (
                <div className="p-3 rounded-2xl bg-[#ff6b6b]/5 border border-[#ff6b6b]/10 flex items-center justify-between">
                    <span className="text-[12px] font-medium text-[#1a1a1a]">Feeling</span>
                    <span className="text-[12px] font-bold text-[#ff6b6b] capitalize">{data.mood}</span>
                </div>
            )}
            {!data.steps && !data.sleep && !data.mood && (
                <div className="p-3 rounded-2xl bg-[#ff6b6b]/5 border border-[#ff6b6b]/10">
                    <span className="text-[12px] text-[#737373]">Health note saved.</span>
                </div>
            )}
        </div>
    );
}

function NoteCard({ data }: { data: RichData }) {
    return (
        <div className="w-full bg-white border border-[#e5e5e5]/50 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-[#faf9f6] text-[#737373]">
                    <FileText size={16} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#737373]/40">Notes</span>
            </div>
            {data.person && (
                <div className="flex items-center gap-2">
                    <Briefcase size={12} className="text-[#a66cff]" />
                    <span className="text-[12px] font-medium text-[#a66cff]">{data.person}</span>
                </div>
            )}
            {data.body && (
                <p className="text-[13px] text-[#1a1a1a] leading-relaxed line-clamp-3">{data.body}</p>
            )}
            {data.tags && data.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1 border-t border-[#e5e5e5]/30">
                    {data.tags.map((tag) => (
                        <span key={tag} className="px-2.5 py-1 rounded-full bg-[#faf9f6] border border-[#e5e5e5] text-[10px] font-medium text-[#737373]">
                            {tag}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}

const MOOD_EMOJI: Record<string, string> = {
    positive: "😊", negative: "😔", neutral: "😐",
};

function JournalCard({ data }: { data: RichData }) {
    return (
        <div className="w-full bg-white border border-[#e5e5e5]/50 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-[#faf9f6] text-[#a66cff]">
                        <Sparkles size={16} />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#737373]/40">Journal</span>
                </div>
                {data.mood && (
                    <span className="text-xl" title={data.mood}>{MOOD_EMOJI[data.mood] ?? "📝"}</span>
                )}
            </div>

            {data.body ? (
                <div className="p-4 rounded-2xl bg-[#faf9f6] border-l-4 border-l-[#a66cff]">
                    <p className="text-[13px] text-[#1a1a1a]/80 leading-relaxed italic">{data.body}</p>
                </div>
            ) : (
                <p className="text-[13px] text-[#737373] italic px-1">Saved to journal.</p>
            )}

            {data.tags && data.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1 border-t border-[#e5e5e5]/30">
                    {data.tags.map((tag) => (
                        <span key={tag} className="px-2.5 py-1 rounded-full bg-[#a66cff]/10 text-[10px] font-medium text-[#a66cff]">
                            {tag}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}

/* ─── Constants ──────────────────────────────────────────────────────────── */

const SILENCE_THRESHOLD = 0.01;  // RMS below this = silence
const SILENCE_TIMEOUT_MS = 2500; // auto-stop after 2.5s of silence
const BAR_COUNT = 8;

/* ─── Component ──────────────────────────────────────────────────────────── */

export default function ZenModePage() {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState("");
    const [processing, setProcessing] = useState(false);
    const [isListening, setIsListening] = useState(false);
    // Live bar heights driven by mic volume (px, 4–24)
    const [barHeights, setBarHeights] = useState<number[]>(Array(BAR_COUNT).fill(4));
    const scrollRef = useRef<HTMLDivElement>(null);

    // Recording refs — no state, avoids stale closure issues
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);
    const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const rafRef = useRef<number | null>(null);

    /* ── Auto-scroll ────────────────────────────────────────────────────── */
    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, [messages, isListening, processing]);

    /* ── Cleanup on unmount ─────────────────────────────────────────────── */
    useEffect(() => {
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            streamRef.current?.getTracks().forEach((t) => t.stop());
            audioCtxRef.current?.close();
        };
    }, []);

    /* ── Add poco message ───────────────────────────────────────────────── */
    const addPocoMessage = useCallback((text: string, category?: string, richData?: RichData, error?: boolean) => {
        setMessages((prev) => [
            ...prev,
            { id: crypto.randomUUID(), text, sender: "poco", category, richData, timestamp: new Date(), error },
        ]);
    }, []);

    /* ── Route text to ingest or query ──────────────────────────────────── */
    const processText = useCallback(async (text: string) => {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        setProcessing(true);
        try {
            if (isQuery(text)) {
                const result = await queryEntries({ question: text, user_timezone: timezone });
                addPocoMessage(result.answer, "QUERY", queryToRichData(result));
            } else {
                const result = await ingestEntry({ rawText: text, timezone });
                addPocoMessage(ingestToReply(result), ingestToCategory(result), ingestToRichData(result));
            }
        } catch (err) {
            addPocoMessage(err instanceof Error ? err.message : "Something went wrong.", undefined, undefined, true);
        } finally {
            setProcessing(false);
        }
    }, [addPocoMessage]);

    /* ── Stop recording, transcribe, route ──────────────────────────────── */
    const stopAndProcess = useCallback(() => {
        if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
        if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
        audioCtxRef.current?.close().catch(() => {});
        audioCtxRef.current = null;

        const recorder = mediaRecorderRef.current;
        if (!recorder || recorder.state !== "recording") return;

        recorder.onstop = async () => {
            const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
            streamRef.current?.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
            mediaRecorderRef.current = null;
            chunksRef.current = [];

            setIsListening(false);
            setBarHeights(Array(BAR_COUNT).fill(4));
            setProcessing(true);

            const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            try {
                const { transcript } = await transcribeAudio(blob);
                // Show transcribed text immediately as user bubble
                setMessages((prev) => [
                    ...prev,
                    { id: crypto.randomUUID(), text: transcript, sender: "user", timestamp: new Date() },
                ]);
                // Route the transcript
                if (isQuery(transcript)) {
                    const result = await queryEntries({ question: transcript, user_timezone: timezone });
                    addPocoMessage(result.answer, "QUERY", queryToRichData(result));
                } else {
                    const result = await ingestEntry({ rawText: transcript, timezone });
                    addPocoMessage(ingestToReply(result), ingestToCategory(result), ingestToRichData(result));
                }
            } catch (err) {
                addPocoMessage(err instanceof Error ? err.message : "Voice processing failed.", undefined, undefined, true);
            } finally {
                setProcessing(false);
            }
        };

        recorder.stop();
    }, [addPocoMessage]);

    /* ── Start recording + silence detector ─────────────────────────────── */
    const startListening = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
                ? "audio/webm;codecs=opus" : "audio/webm";
            const recorder = new MediaRecorder(stream, { mimeType });
            mediaRecorderRef.current = recorder;
            chunksRef.current = [];
            recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
            recorder.start(100);
            setIsListening(true);

            // AudioContext for volume analysis + silence detection
            const audioCtx = new AudioContext();
            audioCtxRef.current = audioCtx;
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 512;
            audioCtx.createMediaStreamSource(stream).connect(analyser);
            const data = new Float32Array(analyser.fftSize);

            const tick = () => {
                analyser.getFloatTimeDomainData(data);
                const rms = Math.sqrt(data.reduce((s, v) => s + v * v, 0) / data.length);

                // Drive bar heights from volume (4px quiet → 24px loud)
                setBarHeights(
                    Array.from({ length: BAR_COUNT }, () =>
                        Math.max(4, Math.min(24, 4 + rms * 800 * (0.5 + Math.random() * 0.5)))
                    )
                );

                // Silence detection
                if (rms < SILENCE_THRESHOLD) {
                    if (!silenceTimerRef.current) {
                        silenceTimerRef.current = setTimeout(stopAndProcess, SILENCE_TIMEOUT_MS);
                    }
                } else {
                    if (silenceTimerRef.current) {
                        clearTimeout(silenceTimerRef.current);
                        silenceTimerRef.current = null;
                    }
                }

                rafRef.current = requestAnimationFrame(tick);
            };
            rafRef.current = requestAnimationFrame(tick);
        } catch {
            addPocoMessage("Microphone access denied.", undefined, undefined, true);
        }
    }, [stopAndProcess, addPocoMessage]);

    const toggleListening = useCallback(async () => {
        if (processing) return;
        if (isListening) stopAndProcess();
        else await startListening();
    }, [isListening, processing, startListening, stopAndProcess]);

    /* ── Text send ──────────────────────────────────────────────────────── */
    const handleSendText = useCallback(async (text: string) => {
        if (!text.trim() || processing) return;
        setInputText("");
        setMessages((prev) => [
            ...prev,
            { id: crypto.randomUUID(), text, sender: "user", timestamp: new Date() },
        ]);
        await processText(text);
    }, [processing, processText]);

    /* ── Render ─────────────────────────────────────────────────────────── */
    return (
        <div className="flex items-center justify-center min-h-screen bg-zinc-100">
            <div
                className="relative flex flex-col w-full max-w-md bg-[#faf9f6] shadow-2xl overflow-hidden font-sans"
                style={{ height: "100dvh", maxHeight: "100dvh" }}
            >
                {/* Background tint while listening */}
                <div className={`absolute inset-0 pointer-events-none transition-colors duration-1000 ${isListening ? "bg-[#2d2d2d]/5" : "bg-transparent"}`} />

                {/* ── Chat Area ───────────────────────────────────────────── */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 relative z-0 scroll-smooth no-scrollbar" ref={scrollRef}>
                    {messages.length === 0 && !isListening && (
                        <div className="flex flex-col items-center justify-center h-full space-y-6">
                            <div className="w-16 h-16 rounded-full bg-[#f4f4f5]/50 flex items-center justify-center">
                                <Sparkles size={24} className="opacity-20" />
                            </div>
                            <p className="text-lg font-light tracking-tight text-center max-w-[200px] text-[#737373]/50">
                                Speak naturally. <br /> I&apos;ll handle the rest.
                            </p>
                        </div>
                    )}

                    {messages.map((msg) => (
                        <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
                        >
                            {msg.sender === "poco" && (
                                <span className="text-[9px] font-bold text-[#737373]/50 mb-1.5 ml-1 uppercase tracking-[0.15em]">Poco</span>
                            )}

                            {msg.richData ? (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.98, y: 10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    className="w-full max-w-[90%]"
                                >
                                    {msg.richData.type === "expense"  && <ExpenseCard  data={msg.richData} />}
                                    {msg.richData.type === "summary"  && <SummaryCard  data={msg.richData} />}
                                    {msg.richData.type === "schedule" && <ScheduleCard data={msg.richData} />}
                                    {msg.richData.type === "health"   && <HealthCard   data={msg.richData} />}
                                    {msg.richData.type === "note"     && <NoteCard     data={msg.richData} />}
                                    {msg.richData.type === "journal"  && <JournalCard  data={msg.richData} />}
                                </motion.div>
                            ) : (
                                <div className={`max-w-[85%] px-5 py-3.5 text-[15px] leading-relaxed font-light shadow-sm ${
                                    msg.sender === "user"
                                        ? "bg-[#2d2d2d] text-white rounded-2xl rounded-br-sm"
                                        : msg.error
                                            ? "bg-[#ff6b6b]/10 border border-[#ff6b6b]/20 text-[#ff6b6b] rounded-2xl rounded-bl-sm"
                                            : "bg-white border border-[#e5e5e5]/50 text-[#1a1a1a] rounded-2xl rounded-bl-sm"
                                }`}>
                                    {msg.text}
                                </div>
                            )}

                            {msg.category && (
                                <div className="flex items-center gap-1.5 mt-1.5 ml-1">
                                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[msg.category] || CATEGORY_COLORS.NOTE }} />
                                    <span className="text-[9px] font-bold tracking-[0.12em] uppercase" style={{ color: CATEGORY_COLORS[msg.category] || CATEGORY_COLORS.NOTE }}>
                                        {msg.category}
                                    </span>
                                </div>
                            )}
                        </motion.div>
                    ))}

                    {/* Poco typing dots */}
                    {processing && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-start">
                            <span className="text-[9px] font-bold text-[#737373]/50 mb-1.5 ml-1 uppercase tracking-[0.15em]">Poco</span>
                            <div className="bg-white border border-[#e5e5e5]/50 px-6 py-4 rounded-2xl rounded-bl-sm shadow-sm flex items-center gap-1.5">
                                {[0, 0.2, 0.4].map((delay) => (
                                    <motion.div
                                        key={delay}
                                        className="w-1.5 h-1.5 bg-[#1a1a1a]/30 rounded-full"
                                        animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                                        transition={{ repeat: Infinity, duration: 1, delay }}
                                    />
                                ))}
                            </div>
                        </motion.div>
                    )}
                </div>

                {/* ── Input Area ──────────────────────────────────────────── */}
                <div className="relative z-20 px-6 pb-8 pt-4 bg-[#faf9f6]/80 backdrop-blur-lg border-t border-[#e5e5e5]/20">
                    <div className="absolute top-0 left-0 right-0 h-16 -translate-y-full bg-gradient-to-t from-[#faf9f6] to-transparent pointer-events-none" />

                    <div className="flex flex-col items-center gap-5">
                        {/* Live volume bars — visible while listening */}
                        <AnimatePresence>
                            {isListening && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    className="flex flex-col items-center space-y-3 mb-2"
                                >
                                    <div className="flex items-end gap-1 h-6">
                                        {barHeights.map((h, i) => (
                                            <motion.div
                                                key={i}
                                                className="w-1 bg-[#2d2d2d] rounded-full"
                                                animate={{ height: h }}
                                                transition={{ duration: 0.1, ease: "easeOut" }}
                                            />
                                        ))}
                                    </div>
                                    <span className="text-[10px] font-bold text-[#737373]/60 tracking-[0.2em] uppercase">
                                        Listening...
                                    </span>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Mic button */}
                        <div className="relative">
                            <div className={`absolute inset-0 rounded-full bg-[#2d2d2d]/10 blur-xl transition-all duration-1000 ${isListening ? "scale-150 opacity-100" : "scale-75 opacity-0"}`} />
                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={toggleListening}
                                disabled={processing}
                                className={`relative w-[72px] h-[72px] rounded-full flex items-center justify-center shadow-2xl transition-all duration-500 z-10 ${
                                    isListening
                                        ? "bg-[#ef4444] text-white scale-110"
                                        : processing
                                            ? "bg-[#e5e5e5] text-[#737373] cursor-not-allowed"
                                            : "bg-[#1a1a1a] text-white hover:scale-105"
                                }`}
                            >
                                <AnimatePresence mode="wait">
                                    {isListening ? (
                                        <motion.div key="stop" initial={{ opacity: 0, rotate: -90 }} animate={{ opacity: 1, rotate: 0 }} exit={{ opacity: 0, rotate: 90 }}>
                                            <Pause size={28} fill="currentColor" />
                                        </motion.div>
                                    ) : (
                                        <motion.div key="mic" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                            <Mic size={28} strokeWidth={1.5} />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.button>
                        </div>

                        {/* Text input */}
                        <div className={`w-full transition-all duration-500 ${isListening ? "opacity-0 translate-y-10 pointer-events-none" : "opacity-100 translate-y-0"}`}>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleSendText(inputText)}
                                    placeholder="Or type here..."
                                    disabled={isListening || processing}
                                    className="w-full pl-5 pr-12 py-4 bg-[#f4f4f5]/50 border border-transparent rounded-2xl text-base font-light text-[#1a1a1a] focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#2d2d2d]/20 focus:border-[#e5e5e5] transition-all placeholder:text-[#737373]/60 shadow-inner"
                                />
                                <button
                                    onClick={() => handleSendText(inputText)}
                                    disabled={!inputText.trim() || processing}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-[#737373] hover:text-[#2d2d2d] disabled:opacity-30 transition-colors"
                                >
                                    <Send size={18} strokeWidth={2} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

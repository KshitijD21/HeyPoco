"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Send, Pause, Sparkles } from "lucide-react";

/* ─── Types ──────────────────────────────────────────────────────────────── */

interface RichData {
    type: "expense" | "summary" | "schedule";
    amount?: string;
    merchant?: string;
    totalAmount?: string;
    count?: number;
    items?: Array<{ label: string; time: string }>;
    stats?: Array<{ label: string; value: string; color?: string }>;
}

interface ChatMessage {
    id: string;
    text: string;
    sender: "user" | "poco";
    category?: string;
    timestamp: Date;
    richData?: RichData;
}

/* ─── Mock AI responses ──────────────────────────────────────────────────── */

const MOCK_VOICE_LOGS = [
    {
        text: "I spent $12 on coffee at Starbucks.",
        reply: "Got it. $12.00 tracked.",
        category: "EXPENSE",
        richData: { type: "expense" as const, amount: "$12.00", merchant: "Starbucks" }
    },
    {
        text: "Remind me to call Mom tomorrow at 5pm.",
        reply: "Commitment noted.",
        category: "COMMITMENT",
        richData: { type: "schedule" as const, items: [{ label: "Call Mom", time: "Tomorrow, 5:00 PM" }] }
    },
    {
        text: "How much did I spend today?",
        reply: "You've spent $147.00 so far today across 3 entries.",
        category: "QUERY",
        richData: {
            type: "summary" as const,
            totalAmount: "$147.00",
            count: 3,
            stats: [
                { label: "Food & Drinks", value: "$62.00", color: "#ff6b6b" },
                { label: "Transport", value: "$45.00", color: "#4ecdc4" },
                { label: "Others", value: "$40.00", color: "#95a5a6" }
            ]
        }
    },
    { text: "Met Sarah for lunch, we talked about the project.", reply: "Event logged.", category: "EVENT" },
    {
        text: "What do I have tomorrow?",
        reply: "You have 2 commitments tomorrow.",
        category: "QUERY",
        richData: {
            type: "schedule" as const,
            items: [
                { label: "Call Mom", time: "5:00 PM" },
                { label: "Gym Session", time: "6:00 PM" }
            ]
        }
    },
    { text: "Paid $50 for dinner, shared with John and Mike.", reply: "Got it. $50.00 tracked.", category: "EXPENSE", richData: { type: "expense" as const, amount: "$50.00", merchant: "Dinner" } },
    {
        text: "Summary of my coffee expenses?",
        reply: "You've visited Starbucks twice this week.",
        category: "QUERY",
        richData: {
            type: "summary" as const,
            totalAmount: "$24.00",
            count: 2,
            stats: [{ label: "Starbucks", value: "$24.00", color: "#3b82f6" }]
        }
    },
    { text: "Going to the gym at 6pm today.", reply: "Commitment noted.", category: "COMMITMENT", richData: { type: "schedule" as const, items: [{ label: "Gym Session", time: "Today, 6:00 PM" }] } },
    { text: "Bought groceries for $85.", reply: "Got it. $85.00 tracked.", category: "EXPENSE", richData: { type: "expense" as const, amount: "$85.00", merchant: "Groceries" } },
    {
        text: "How much did I spend this month?",
        reply: "You've spent $1,240.00 this month.",
        category: "QUERY",
        richData: {
            type: "summary" as const,
            totalAmount: "$1,240.00",
            count: 42,
            stats: [
                { label: "Rent & Utilities", value: "$850.00", color: "#3b82f6" },
                { label: "Food & Dining", value: "$280.00", color: "#ff6b6b" },
                { label: "Transport", value: "$65.00", color: "#4ecdc4" },
                { label: "Entertainment", value: "$45.00", color: "#a66cff" }
            ]
        }
    },
    { text: "Applied to the product manager role at Stripe.", reply: "Career entry saved.", category: "NOTE" },
];

const TEXT_REPLIES: Record<string, { reply: string; category: string }> = {
    default: { reply: "Noted.", category: "NOTE" },
};

function getTextReply(text: string): { reply: string; category: string; richData?: RichData } {
    const lower = text.toLowerCase();

    // Check for questions/queries
    if (lower.includes("how much") || lower.includes("what") || lower.includes("summary") || lower.includes("list") || lower.includes("show me")) {
        if (lower.includes("spend") || lower.includes("spent") || lower.includes("expensive") || lower.includes("price") || lower.includes("cost")) {
            if (lower.includes("month")) {
                return {
                    reply: "You've spent $1,240.00 this month.",
                    category: "QUERY",
                    richData: {
                        type: "summary" as const,
                        totalAmount: "$1,240.00",
                        count: 42,
                        stats: [
                            { label: "Rent & Utilities", value: "$850.00", color: "#3b82f6" },
                            { label: "Food & Dining", value: "$280.00", color: "#ff6b6b" },
                            { label: "Transport", value: "$65.00", color: "#4ecdc4" },
                            { label: "Entertainment", value: "$45.00", color: "#a66cff" }
                        ]
                    }
                };
            }
            return {
                reply: "You've spent $147.00 so far today across 3 entries.",
                category: "QUERY",
                richData: {
                    type: "summary" as const,
                    totalAmount: "$147.00",
                    count: 3,
                    stats: [
                        { label: "Food & Drinks", value: "$62.00", color: "#ff6b6b" },
                        { label: "Transport", value: "$45.00", color: "#4ecdc4" },
                        { label: "Others", value: "$40.00", color: "#95a5a6" }
                    ]
                }
            };
        }
        if (lower.includes("tomorrow") || lower.includes("next") || lower.includes("schedule") || lower.includes("todo")) {
            return {
                reply: "You have 2 commitments tomorrow.",
                category: "QUERY",
                richData: {
                    type: "schedule" as const,
                    items: [
                        { label: "Call Mom", time: "5:00 PM" },
                        { label: "Gym Session", time: "6:00 PM" }
                    ]
                }
            };
        }
        if (lower.includes("coffee") || lower.includes("starbucks")) {
            return {
                reply: "You've visited Starbucks twice this week.",
                category: "QUERY",
                richData: {
                    type: "summary" as const,
                    totalAmount: "$24.00",
                    count: 2,
                    stats: [{ label: "Starbucks", value: "$24.00", color: "#3b82f6" }]
                }
            };
        }
        return { reply: "I've pulled up your recent logs for you.", category: "QUERY" };
    }

    if (lower.includes("$") || lower.includes("spent") || lower.includes("paid") || lower.includes("bought")) {
        const match = text.match(/\$?(\d+(?:\.\d{2})?)/);
        const amount = match ? `$${parseFloat(match[1]).toFixed(2)}` : "";
        const merchantMatch = text.match(/at\s+([A-Za-z\s]+)(?:[.!]|$)/);
        const merchant = merchantMatch ? merchantMatch[1].trim() : "Purchase";
        return {
            reply: `Got it. ${amount} tracked.`,
            category: "EXPENSE",
            richData: { type: "expense" as const, amount, merchant }
        };
    }
    if (lower.includes("remind") || lower.includes("meeting") || lower.includes("gym") || lower.includes("call")) {
        const items = [{ label: text.length > 30 ? text.substring(0, 30) + "..." : text, time: "Scheduled" }];
        return { reply: "Commitment noted.", category: "COMMITMENT", richData: { type: "schedule" as const, items } };
    }
    if (lower.includes("met") || lower.includes("went") || lower.includes("visited") || lower.includes("lunch") || lower.includes("dinner")) {
        return { reply: "Event logged.", category: "EVENT" };
    }
    return TEXT_REPLIES.default;
}

const CATEGORY_COLORS: Record<string, string> = {
    EXPENSE: "#ff6b6b",
    COMMITMENT: "#4ecdc4",
    EVENT: "#a66cff",
    NOTE: "#95a5a6",
    QUERY: "#3b82f6", // Blue for queries
};

/* ─── Rich Components ────────────────────────────────────────────────────── */

function ExpenseCard({ data }: { data: RichData }) {
    return (
        <div className="w-full bg-white border border-[#e5e5e5]/50 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex justify-between items-start">
                <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-[#737373]/50 uppercase tracking-wider">Merchant</span>
                    <span className="text-lg font-medium text-[#1a1a1a]">{data.merchant}</span>
                </div>
                <div className="bg-[#ff6b6b]/10 px-3 py-1 rounded-full">
                    <span className="text-[#ff6b6b] font-bold text-sm">{data.amount}</span>
                </div>
            </div>
            <div className="h-[1px] bg-[#e5e5e5]/30 w-full" />
            <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#ff6b6b]" />
                <span className="text-[10px] text-[#737373]/60 font-medium uppercase tracking-tight">Tracked in Expenses</span>
            </div>
        </div>
    );
}

function SummaryCard({ data }: { data: RichData }) {
    return (
        <div className="w-full bg-[#1a1a1a] text-white rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex justify-between items-end">
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] mb-1">Total Spent</span>
                    <span className="text-3xl font-light">{data.totalAmount}</span>
                </div>
                <span className="text-[10px] font-medium text-white/60 mb-1">{data.count} entries</span>
            </div>
            <div className="space-y-2.5">
                {data.stats?.map((stat, i) => (
                    <div key={i} className="flex flex-col gap-1.5">
                        <div className="flex justify-between text-[11px] font-medium tracking-tight">
                            <span className="text-white/60">{stat.label}</span>
                            <span>{stat.value}</span>
                        </div>
                        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: "65%" }}
                                transition={{ delay: 0.5 + i * 0.1, duration: 1 }}
                                className="h-full rounded-full"
                                style={{ backgroundColor: stat.color }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function ScheduleCard({ data }: { data: RichData }) {
    return (
        <div className="w-full bg-white border border-[#e5e5e5]/50 rounded-2xl p-4 shadow-sm space-y-4">
            <div className="flex items-center gap-2 mb-1">
                <Sparkles size={14} className="text-[#4ecdc4]" />
                <span className="text-[11px] font-bold text-[#737373]/50 uppercase tracking-wider">Upcoming</span>
            </div>
            <div className="space-y-3">
                {data.items?.map((item, i) => (
                    <div key={i} className="flex items-start gap-3 group">
                        <div className="w-0.5 h-10 bg-[#4ecdc4]/20 rounded-full group-hover:bg-[#4ecdc4] transition-colors" />
                        <div className="flex flex-col justify-center h-10">
                            <span className="text-sm font-medium text-[#1a1a1a]">{item.label}</span>
                            <span className="text-[11px] text-[#737373]/60">{item.time}</span>
                        </div>
                    </div>
                ))}
                {!data.items?.length && (
                    <div className="py-2 text-[12px] text-[#737373]/40 italic text-center">No items scheduled</div>
                )}
            </div>
        </div>
    );
}

/* ─── Component ──────────────────────────────────────────────────────────── */

export default function ZenModePage() {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState("");
    const [isListening, setIsListening] = useState(false);
    const [processing, setProcessing] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const mockIdx = useRef(0);

    /* ── Auto-scroll ────────────────────────────────────────────────────── */
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
        }
    }, [messages, isListening, processing]);

    /* ── Auto-stop listening after 3.5s (simulated) ─────────────────────── */
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (isListening) {
            timer = setTimeout(() => stopListeningAndProcess(), 3500);
        }
        return () => clearTimeout(timer);
    }, [isListening]);

    /* ── Voice flow ─────────────────────────────────────────────────────── */
    const stopListeningAndProcess = useCallback(() => {
        setIsListening(false);

        const mock = MOCK_VOICE_LOGS[mockIdx.current % MOCK_VOICE_LOGS.length];
        mockIdx.current += 1;

        // User message immediately
        setMessages((prev) => [
            ...prev,
            { id: crypto.randomUUID(), text: mock.text, sender: "user", timestamp: new Date() },
        ]);

        // Poco reply after delay
        setProcessing(true);
        setTimeout(() => {
            setMessages((prev) => [
                ...prev,
                {
                    id: crypto.randomUUID(),
                    text: mock.reply,
                    sender: "poco",
                    category: mock.category,
                    richData: mock.richData,
                    timestamp: new Date(),
                },
            ]);
            setProcessing(false);
        }, 1200);
    }, []);

    const toggleListening = useCallback(() => {
        if (processing) return;
        if (isListening) {
            stopListeningAndProcess();
        } else {
            setIsListening(true);
        }
    }, [isListening, processing, stopListeningAndProcess]);

    /* ── Text flow ──────────────────────────────────────────────────────── */
    const handleSendText = useCallback(
        (text: string) => {
            if (!text.trim() || processing) return;
            setInputText("");

            // User message
            setMessages((prev) => [
                ...prev,
                { id: crypto.randomUUID(), text, sender: "user", timestamp: new Date() },
            ]);

            const { reply, category, richData } = getTextReply(text);

            setProcessing(true);
            setTimeout(() => {
                setMessages((prev) => [
                    ...prev,
                    { id: crypto.randomUUID(), text: reply, sender: "poco", category, richData, timestamp: new Date() },
                ]);
                setProcessing(false);
            }, 800);
        },
        [processing]
    );

    /* ── Render ─────────────────────────────────────────────────────────── */
    return (
        <div className="flex items-center justify-center min-h-screen bg-zinc-100">
            {/* Phone-like app shell */}
            <div
                className="relative flex flex-col w-full max-w-md bg-[#faf9f6] shadow-2xl overflow-hidden font-sans"
                style={{ height: "100dvh", maxHeight: "100dvh" }}
            >
                {/* Dynamic background tint */}
                <div
                    className={`absolute inset-0 pointer-events-none transition-colors duration-1000 ${isListening ? "bg-[#2d2d2d]/5" : "bg-transparent"
                        }`}
                />

                {/* ── Chat Area ───────────────────────────────────────────────── */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 relative z-0 scroll-smooth no-scrollbar" ref={scrollRef}>
                    {/* Empty state */}
                    {messages.length === 0 && !isListening && (
                        <div className="flex flex-col items-center justify-center h-full text-[#737373]/30 space-y-6">
                            <div className="w-16 h-16 rounded-full bg-[#f4f4f5]/50 flex items-center justify-center">
                                <Sparkles size={24} className="opacity-20" />
                            </div>
                            <p className="text-lg font-light tracking-tight text-center max-w-[200px] text-[#737373]/50">
                                Speak naturally. <br /> I&apos;ll handle the rest.
                            </p>
                        </div>
                    )}

                    {/* Messages */}
                    {messages.map((msg) => (
                        <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
                        >
                            {msg.sender === "poco" && (
                                <span className="text-[9px] font-bold text-[#737373]/50 mb-1.5 ml-1 uppercase tracking-[0.15em]">
                                    Poco
                                </span>
                            )}

                            {msg.richData ? (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.98, y: 10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    className="w-full max-w-[90%]"
                                >
                                    {msg.richData.type === "expense" && <ExpenseCard data={msg.richData} />}
                                    {msg.richData.type === "summary" && <SummaryCard data={msg.richData} />}
                                    {msg.richData.type === "schedule" && <ScheduleCard data={msg.richData} />}
                                </motion.div>
                            ) : (
                                <div
                                    className={`max-w-[85%] px-5 py-3.5 text-[15px] leading-relaxed font-light shadow-sm ${msg.sender === "user"
                                        ? "bg-[#2d2d2d] text-white rounded-2xl rounded-br-sm"
                                        : "bg-white border border-[#e5e5e5]/50 text-[#1a1a1a] rounded-2xl rounded-bl-sm"
                                        }`}
                                >
                                    {msg.text}
                                </div>
                            )}

                            {/* Category pill */}
                            {msg.category && (
                                <div className="flex items-center gap-1.5 mt-1.5 ml-1">
                                    <div
                                        className="w-1.5 h-1.5 rounded-full"
                                        style={{ backgroundColor: CATEGORY_COLORS[msg.category] || CATEGORY_COLORS.NOTE }}
                                    />
                                    <span
                                        className="text-[9px] font-bold tracking-[0.12em] uppercase"
                                        style={{ color: CATEGORY_COLORS[msg.category] || CATEGORY_COLORS.NOTE }}
                                    >
                                        {msg.category}
                                    </span>
                                </div>
                            )}
                        </motion.div>
                    ))}


                    {/* Processing typing dots */}
                    {processing && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-start">
                            <span className="text-[9px] font-bold text-[#737373]/50 mb-1.5 ml-1 uppercase tracking-[0.15em]">
                                Poco
                            </span>
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

                {/* ── Input Area ──────────────────────────────────────────────── */}
                <div className="relative z-20 px-6 pb-8 pt-4 bg-[#faf9f6]/80 backdrop-blur-lg border-t border-[#e5e5e5]/20">
                    {/* Mic side fade gradient (Bottom of chat) - more compact and lower */}
                    <div className="absolute top-0 left-0 right-0 h-16 -translate-y-full bg-gradient-to-t from-[#faf9f6] to-transparent pointer-events-none" />

                    <div className="flex flex-col items-center gap-5">
                        {/* Listening visualization — waveform bars positioned ABOVE mic */}
                        <AnimatePresence>
                            {isListening && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    className="flex flex-col items-center space-y-3 mb-2"
                                >
                                    <div className="flex items-center gap-1 h-6">
                                        {[1, 2, 3, 4, 5, 4, 3, 2].map((i, index) => (
                                            <motion.div
                                                key={index}
                                                className="w-1 bg-[#2d2d2d] rounded-full"
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
                                    <span className="text-[10px] font-bold text-[#737373]/60 tracking-[0.2em] uppercase">
                                        Listening...
                                    </span>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Mic Button */}
                        <div className="relative">
                            {/* Pulse glow */}
                            <div
                                className={`absolute inset-0 rounded-full bg-[#2d2d2d]/10 blur-xl transition-all duration-1000 ${isListening ? "scale-150 opacity-100" : "scale-75 opacity-0"
                                    }`}
                            />

                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={toggleListening}
                                disabled={processing}
                                className={`relative w-[72px] h-[72px] rounded-full flex items-center justify-center shadow-2xl transition-all duration-500 z-10 ${isListening
                                    ? "bg-[#ef4444] text-white scale-110"
                                    : processing
                                        ? "bg-[#e5e5e5] text-[#737373] cursor-not-allowed"
                                        : "bg-[#1a1a1a] text-white hover:scale-105"
                                    }`}
                            >
                                <AnimatePresence mode="wait">
                                    {isListening ? (
                                        <motion.div
                                            key="stop"
                                            initial={{ opacity: 0, rotate: -90 }}
                                            animate={{ opacity: 1, rotate: 0 }}
                                            exit={{ opacity: 0, rotate: 90 }}
                                        >
                                            <Pause size={28} fill="currentColor" />
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="mic"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                        >
                                            <Mic size={28} strokeWidth={1.5} />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.button>
                        </div>

                        {/* Text Input (always visible when not listening) */}
                        <div
                            className={`w-full transition-all duration-500 ${isListening ? "opacity-0 translate-y-10 pointer-events-none" : "opacity-100 translate-y-0"
                                }`}
                        >
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

"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Send, Pause, Sparkles } from "lucide-react";

/* ─── Types ──────────────────────────────────────────────────────────────── */

interface ChatMessage {
    id: string;
    text: string;
    sender: "user" | "poco";
    category?: string;
    timestamp: Date;
}

/* ─── Mock AI responses ──────────────────────────────────────────────────── */

const MOCK_VOICE_LOGS = [
    { text: "I spent $12 on coffee at Starbucks.", reply: "Got it. $12.00 tracked.", category: "EXPENSE" },
    { text: "Remind me to call Mom tomorrow at 5pm.", reply: "Commitment noted.", category: "COMMITMENT" },
    { text: "How much did I spend today?", reply: "You've spent $147.00 so far today across 3 entries.", category: "QUERY" },
    { text: "Met Sarah for lunch, we talked about the project.", reply: "Event logged.", category: "EVENT" },
    { text: "What do I have tomorrow?", reply: "You have 2 commitments tomorrow: Call Mom at 5pm and Go to the gym at 6pm.", category: "QUERY" },
    { text: "Paid $50 for dinner, shared with John and Mike.", reply: "Got it. $50.00 tracked.", category: "EXPENSE" },
    { text: "Summary of my coffee expenses?", reply: "You've visited Starbucks twice this week, spending a total of $24.00.", category: "QUERY" },
    { text: "Going to the gym at 6pm today.", reply: "Commitment noted.", category: "COMMITMENT" },
    { text: "Bought groceries for $85.", reply: "Got it. $85.00 tracked.", category: "EXPENSE" },
    { text: "Applied to the product manager role at Stripe.", reply: "Career entry saved.", category: "NOTE" },
];

const TEXT_REPLIES: Record<string, { reply: string; category: string }> = {
    default: { reply: "Noted.", category: "NOTE" },
};

function getTextReply(text: string): { reply: string; category: string } {
    const lower = text.toLowerCase();

    // Check for questions/queries
    if (lower.includes("how much") || lower.includes("what") || lower.includes("summary") || lower.includes("list") || lower.includes("show me")) {
        if (lower.includes("spend") || lower.includes("spent") || lower.includes("expensive") || lower.includes("price") || lower.includes("cost")) {
            return { reply: "You've spent $147.00 so far today across 3 entries.", category: "QUERY" };
        }
        if (lower.includes("tomorrow") || lower.includes("next") || lower.includes("schedule") || lower.includes("todo")) {
            return { reply: "You have 2 commitments tomorrow: Call Mom at 5pm and Go to the gym at 6pm.", category: "QUERY" };
        }
        if (lower.includes("coffee") || lower.includes("starbucks")) {
            return { reply: "You've visited Starbucks twice this week, spending a total of $24.00.", category: "QUERY" };
        }
        return { reply: "I've pulled up your recent logs for you.", category: "QUERY" };
    }

    if (lower.includes("$") || lower.includes("spent") || lower.includes("paid") || lower.includes("bought")) {
        const match = text.match(/\$?(\d+(?:\.\d{2})?)/);
        const amount = match ? `$${parseFloat(match[1]).toFixed(2)}` : "";
        return { reply: `Got it. ${amount} tracked.`, category: "EXPENSE" };
    }
    if (lower.includes("remind") || lower.includes("meeting") || lower.includes("gym") || lower.includes("call")) {
        return { reply: "Commitment noted.", category: "COMMITMENT" };
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

            const { reply, category } = getTextReply(text);

            setProcessing(true);
            setTimeout(() => {
                setMessages((prev) => [
                    ...prev,
                    { id: crypto.randomUUID(), text: reply, sender: "poco", category, timestamp: new Date() },
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

                {/* ── Header ──────────────────────────────────────────────────── */}
                <div className="relative z-10 flex justify-between items-center px-6 py-5">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[#2d2d2d]" />
                        <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#1a1a1a]/40">
                            HeyPoco
                        </span>
                    </div>
                </div>

                {/* ── Chat Area ───────────────────────────────────────────────── */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 relative z-0" ref={scrollRef}>
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
                            <div
                                className={`max-w-[85%] px-5 py-3.5 text-[15px] leading-relaxed font-light shadow-sm ${msg.sender === "user"
                                    ? "bg-[#2d2d2d] text-white rounded-2xl rounded-br-sm"
                                    : "bg-white border border-[#e5e5e5]/50 text-[#1a1a1a] rounded-2xl rounded-bl-sm"
                                    }`}
                            >
                                {msg.text}
                            </div>

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

                    {/* Listening visualization — waveform bars */}
                    <AnimatePresence>
                        {isListening && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="flex flex-col items-center justify-center py-10 space-y-4"
                            >
                                <div className="flex items-center gap-1.5 h-12">
                                    {[1, 2, 3, 4, 5, 4, 3, 2].map((i, index) => (
                                        <motion.div
                                            key={index}
                                            className="w-1.5 bg-[#2d2d2d] rounded-full"
                                            animate={{
                                                height: [8, 32, 8],
                                                opacity: [0.3, 1, 0.3],
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
                                <span className="text-sm font-medium text-[#737373] tracking-[0.15em] uppercase animate-pulse">
                                    Listening...
                                </span>
                            </motion.div>
                        )}
                    </AnimatePresence>

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

                    {/* Bottom spacer */}
                    <div className="h-4" />
                </div>

                {/* ── Input Area ──────────────────────────────────────────────── */}
                <div className="relative z-20 px-6 pb-8 pt-4 bg-gradient-to-t from-[#faf9f6] via-[#faf9f6] to-transparent">
                    <div className="flex flex-col items-center gap-5">
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

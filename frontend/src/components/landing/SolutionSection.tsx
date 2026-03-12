"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic } from "lucide-react";

export default function SolutionSection() {
    const [isRecording, setIsRecording] = useState(false);

    useEffect(() => {
        const interval = setInterval(() => {
            setIsRecording(prev => !prev);
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    return (
        <section className="relative py-32 bg-white overflow-hidden">
            <div className="relative z-10 max-w-7xl mx-auto px-10">
                <div className="grid lg:grid-cols-2 gap-20 items-center">
                    <div className="order-2 lg:order-1 relative aspect-video bg-[#0a0b0e] rounded-[40px] shadow-2xl overflow-hidden flex flex-col items-center justify-center p-10">
                        {/* Interactive Voice Reveal */}
                        <motion.div
                            animate={{
                                scale: isRecording ? [1, 1.1, 1] : 1,
                            }}
                            transition={{ duration: 1, repeat: Infinity }}
                            className={`w-24 h-24 rounded-full border flex items-center justify-center mb-8 transition-colors duration-500 ${isRecording ? "border-[#22d3ee] bg-[#22d3ee]/10" : "border-white/10"}`}
                        >
                            <Mic size={32} className={isRecording ? "text-[#22d3ee]" : "text-white/20"} />
                        </motion.div>

                        <div className="h-20 flex flex-col items-center justify-center text-center">
                            <AnimatePresence mode="wait">
                                {isRecording ? (
                                    <motion.p
                                        key="listening"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="text-lg text-[#22d3ee] font-medium tracking-wide"
                                    >
                                        &quot;Paid $40 for lunch with Sarah...&quot;
                                    </motion.p>
                                ) : (
                                    <motion.p
                                        key="processing"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="text-sm text-white/40 uppercase tracking-[0.3em] font-bold"
                                    >
                                        Memory Structured
                                    </motion.p>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Visual Wave */}
                        <div className="flex gap-1 h-8 mt-4">
                            {[...Array(6)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    animate={isRecording ? { height: [12, 32, 12] } : { height: 12 }}
                                    transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1 }}
                                    className="w-1 bg-[#22d3ee]/40 rounded-full"
                                />
                            ))}
                        </div>
                    </div>

                    <div className="order-1 lg:order-2">
                        <motion.span
                            initial={{ opacity: 0, x: 20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="text-[10px] font-bold uppercase tracking-[0.5em] text-[#0a0b0e] mb-6 block"
                        >
                            The Clarity
                        </motion.span>
                        <motion.h2
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8 }}
                            className="text-5xl md:text-7xl font-bold tracking-tighter text-[#0a0b0e] leading-[0.95] mb-10"
                        >
                            One tap. <br />
                            <span className="opacity-30 italic font-light">Speak naturally. Done.</span>
                        </motion.h2>
                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                            className="text-xl text-[#0a0b0e]/60 max-w-lg leading-relaxed"
                        >
                            HeyPoco identifies what matters — expenses, events, commitments —
                            and links them into structured memory. Ask questions.
                            Get honest summaries. Know your life.
                        </motion.p>
                    </div>
                </div>
            </div>
        </section>
    );
}

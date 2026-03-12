"use client";

import React, { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Search, Database, Fingerprint, RefreshCcw } from "lucide-react";

export default function StorytellingSection() {
    const containerRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start end", "end start"],
    });

    const pathLength = useTransform(scrollYProgress, [0.2, 0.8], [0, 1]);
    const yOffset = useTransform(scrollYProgress, [0, 1], [100, -100]);

    return (
        <section
            id="story"
            ref={containerRef}
            className="relative py-32 bg-white overflow-hidden"
        >
            <div className="max-w-6xl mx-auto px-6">
                <div className="mb-20 text-center max-w-3xl mx-auto">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-4xl md:text-5xl font-bold tracking-tight text-[#1a1a1a] mb-6"
                    >
                        The problem isn't storing information. <br />
                        <span className="text-[#a66cff]">It's retrieving context.</span>
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-lg text-[#737373] leading-relaxed"
                    >
                        Traditional note apps demand organization: folders, tags, hierarchies.
                        When you're busy living, you just want to throw info into a bucket.
                        HeyPoco's memO engine does the heavy lifting, identifying if an entry is finance, an event, or a general note. The magic is in what disappears, not what appears.
                    </motion.p>
                </div>

                <div className="relative grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
                    {/* Left Side: Animated Diagram */}
                    <div className="relative h-[500px] flex justify-center items-center">
                        {/* SVG Connection Path */}
                        <svg
                            className="absolute inset-0 w-full h-full pointer-events-none"
                            style={{ zIndex: 0 }}
                        >
                            <motion.path
                                d="M 150 100 Q 250 250 150 400"
                                fill="transparent"
                                strokeWidth="2"
                                stroke="url(#gradient)"
                                style={{ pathLength }}
                                className="opacity-40"
                            />
                            <motion.path
                                d="M 300 150 Q 200 300 300 450"
                                fill="transparent"
                                strokeWidth="2"
                                stroke="url(#gradient)"
                                style={{ pathLength }}
                                className="opacity-40"
                            />
                            <defs>
                                <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                    <stop offset="0%" stopColor="#a66cff" />
                                    <stop offset="100%" stopColor="#3b82f6" />
                                </linearGradient>
                            </defs>
                        </svg>

                        {/* Floating Nodes */}
                        <motion.div style={{ y: yOffset }} className="relative z-10 w-full h-full">
                            <motion.div
                                animate={{ y: [0, -10, 0] }}
                                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                className="absolute top-[10%] left-[20%] p-5 bg-white rounded-2xl shadow-xl border border-[#e5e5e5] w-48"
                            >
                                <div className="flex items-center gap-3 mb-3 text-[#f59e0b]">
                                    <Database size={20} />
                                    <span className="font-bold text-sm text-[#1a1a1a]">Raw Data</span>
                                </div>
                                <div className="space-y-2">
                                    <div className="h-1.5 w-full bg-[#faf9f6] rounded-full" />
                                    <div className="h-1.5 w-3/4 bg-[#faf9f6] rounded-full" />
                                </div>
                            </motion.div>

                            <motion.div
                                animate={{ y: [0, 10, 0] }}
                                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                                className="absolute top-[40%] right-[10%] p-5 bg-[#1a1a1a] text-white rounded-2xl shadow-xl w-52"
                            >
                                <div className="flex items-center gap-3 mb-3 text-[#4ecdc4]">
                                    <RefreshCcw size={20} className="animate-spin-slow" />
                                    <span className="font-bold text-sm">memO Engine</span>
                                </div>
                                <div className="text-xs opacity-60">Synthesizing latent connections...</div>
                            </motion.div>

                            <motion.div
                                animate={{ y: [0, -15, 0] }}
                                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                                className="absolute bottom-[10%] left-[30%] p-5 bg-white rounded-2xl shadow-xl border border-[#e5e5e5] w-56"
                            >
                                <div className="flex items-center gap-3 mb-3 text-[#3b82f6]">
                                    <Fingerprint size={20} />
                                    <span className="font-bold text-sm text-[#1a1a1a]">Unique Insight</span>
                                </div>
                                <div className="text-xs text-[#737373] italic">
                                    "Connected your $50 Starbucks spend with Ahmed."
                                </div>
                            </motion.div>
                        </motion.div>
                    </div>

                    {/* Right Side: Features List */}
                    <div className="space-y-12">
                        {[
                            {
                                icon: <Search className="text-[#a66cff]" size={24} />,
                                title: "Semantic Retrieval",
                                desc: "Retrieves meaning, not just keywords, through a single natural command.",
                            },
                            {
                                icon: <Database className="text-[#3b82f6]" size={24} />,
                                title: "Multimodal Capture",
                                desc: "Instead of another text box, it captures native audio, real-time vision, and documents, linking them into structured memory.",
                            },
                            {
                                icon: <Fingerprint className="text-[#ff6b6b]" size={24} />,
                                title: "Total Privacy via RLS",
                                desc: "Biometric app lock. Data stored securely with PostgreSQL Row-Level Security. Permanent isolation.",
                            },
                        ].map((feature, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, x: 50 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: idx * 0.2, duration: 0.6 }}
                                className="flex gap-5"
                            >
                                <div className="w-12 h-12 rounded-2xl bg-[#faf9f6] border border-[#e5e5e5] flex items-center justify-center shrink-0">
                                    {feature.icon}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-[#1a1a1a] mb-2">
                                        {feature.title}
                                    </h3>
                                    <p className="text-[#737373] leading-relaxed">
                                        {feature.desc}
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}

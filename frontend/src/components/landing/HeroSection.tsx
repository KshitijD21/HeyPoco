"use client";

import React, { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Mic, Sparkles } from "lucide-react";
import Link from "next/link";

const transition = { duration: 1.4, ease: [0.6, 0.01, 0.05, 0.9] };

export default function HeroSection() {
    const containerRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end start"],
    });

    const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
    const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.8]);
    const y = useTransform(scrollYProgress, [0, 0.5], [0, -100]);

    return (
        <section
            ref={containerRef}
            className="relative h-screen flex items-center justify-center overflow-hidden bg-[#0a0b0e] selection:bg-[#22d3ee] selection:text-black"
        >
            {/* Tech Background: Grid & Glow */}
            <div className="absolute inset-0 z-0">
                <div
                    className="absolute inset-0 opacity-[0.15]"
                    style={{
                        backgroundImage: `radial-gradient(#22d3ee 0.5px, transparent 0.5px)`,
                        backgroundSize: '40px 40px'
                    }}
                />
                <motion.div
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.1, 0.2, 0.1],
                    }}
                    transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,_rgba(34,211,238,0.1)_0%,_transparent_60%)]"
                />
            </div>

            <motion.div
                style={{ opacity, scale, y }}
                className="relative z-10 w-full max-w-7xl px-10 flex flex-col items-center"
            >
                {/* Visual Hook: The AI Pulse (Cyan/Tech) */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ ...transition, delay: 0.2 }}
                    className="relative mb-24"
                >
                    {/* Tech Rings */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        {[1, 2, 3].map((i) => (
                            <motion.div
                                key={i}
                                animate={{
                                    scale: [1, 1.5 + i * 0.2, 1],
                                    opacity: [0.3 / i, 0, 0.3 / i],
                                }}
                                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: i * 0.5 }}
                                className="absolute border border-[#22d3ee]/20 rounded-full"
                                style={{
                                    width: `${100 + i * 40}%`,
                                    height: `${100 + i * 40}%`
                                }}
                            />
                        ))}
                    </div>

                    <motion.div
                        animate={{
                            scale: [1, 1.2, 1],
                            opacity: [0.5, 0.8, 0.5],
                        }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute inset-0 bg-[#22d3ee] rounded-full blur-[60px] opacity-20"
                    />

                    <div className="relative w-28 h-28 rounded-full border border-white/10 flex items-center justify-center backdrop-blur-2xl bg-white/5 shadow-[0_0_40px_-10px_rgba(34,211,238,0.3)]">
                        <Mic size={32} className="text-[#22d3ee] drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]" />
                    </div>

                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                        className="absolute -top-4 -right-4 w-10 h-10 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl flex items-center justify-center shadow-2xl"
                    >
                        <Sparkles size={16} className="text-[#22d3ee]" />
                    </motion.div>
                </motion.div>

                {/* Kinetic Typography Headline */}
                <div className="overflow-hidden mb-16">
                    <motion.h1
                        initial={{ y: 200 }}
                        animate={{ y: 0 }}
                        transition={{ ...transition, delay: 0.4 }}
                        className="text-7xl md:text-[140px] font-bold tracking-tighter text-white leading-[0.85] text-center"
                    >
                        Speak it.<br />
                        <span className="text-[#22d3ee] drop-shadow-[0_0_30px_rgba(34,211,238,0.3)]">Saved.</span>
                    </motion.h1>
                </div>

                {/* Cyber-Minimal CTA */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...transition, delay: 0.8 }}
                    className="flex flex-col items-center gap-10"
                >
                    <Link href="/login">
                        <motion.button
                            whileHover={{ scale: 1.05, boxShadow: "0 0 30px rgba(34,211,238,0.4)" }}
                            whileTap={{ scale: 0.95 }}
                            className="group relative px-14 py-6 bg-white text-black font-bold text-xl rounded-2xl overflow-hidden transition-all duration-300"
                        >
                            <span className="relative z-10">Start Logging Free</span>
                            <div className="absolute inset-0 bg-gradient-to-r from-[#22d3ee] to-[#0ea5e9] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <span className="absolute inset-0 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity duration-500 font-bold z-20">
                                Start Logging Free
                            </span>
                        </motion.button>
                    </Link>

                    <div className="flex items-center gap-3 opacity-40">
                        <div className="w-8 h-[1px] bg-[#22d3ee]" />
                        <span className="text-[10px] uppercase tracking-[0.5em] text-white font-bold">The AI Sidekick for your life</span>
                        <div className="w-8 h-[1px] bg-[#22d3ee]" />
                    </div>
                </motion.div>
            </motion.div>

            {/* Tech Scroll Indicator */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.4 }}
                transition={{ delay: 2, duration: 1 }}
                className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4"
            >
                <div className="relative w-6 h-10 border-2 border-white/20 rounded-full">
                    <motion.div
                        animate={{ y: [0, 16, 0] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute top-2 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-[#22d3ee] rounded-full shadow-[0_0_10px_#22d3ee]"
                    />
                </div>
            </motion.div>
        </section>
    );
}

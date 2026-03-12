"use client";

import React from "react";
import { motion } from "framer-motion";

export default function ProblemSection() {
    return (
        <section className="relative py-32 bg-[#0a0b0e] overflow-hidden">
            {/* Background Chaos Visuals */}
            <div className="absolute inset-0 z-0">
                <motion.div
                    animate={{
                        rotate: [0, 360],
                        scale: [1, 1.2, 1],
                    }}
                    transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                    className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] bg-[radial-gradient(circle_at_center,_rgba(34,211,238,0.03)_0%,_transparent_70%)] blur-[100px]"
                />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-10">
                <div className="grid lg:grid-cols-2 gap-20 items-center">
                    <div>
                        <motion.span
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="text-[10px] font-bold uppercase tracking-[0.5em] text-[#22d3ee] mb-6 block"
                        >
                            The Friction
                        </motion.span>
                        <motion.h2
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8 }}
                            className="text-5xl md:text-7xl font-bold tracking-tighter text-white leading-[0.95] mb-10"
                        >
                            Your life flows in <br />
                            <span className="opacity-30 italic font-light">one continuous stream.</span>
                        </motion.h2>
                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                            className="text-xl text-white/50 max-w-lg leading-relaxed italic"
                        >
                            But you record it across five different apps — or not at all.
                            The moment you have to decide where something belongs,
                            most things never get logged.
                        </motion.p>
                    </div>

                    <div className="relative aspect-square border border-white/5 rounded-[40px] bg-white/[0.02] backdrop-blur-3xl overflow-hidden flex items-center justify-center">
                        {/* Chaos Graphic Placeholder / Abstract Mesh */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            {[...Array(12)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    animate={{
                                        x: [0, Math.random() * 40 - 20, 0],
                                        y: [0, Math.random() * 40 - 20, 0],
                                        opacity: [0.1, 0.3, 0.1],
                                    }}
                                    transition={{ duration: 4 + i, repeat: Infinity, ease: "easeInOut" }}
                                    className="absolute w-24 h-24 border border-white/10 rounded-2xl"
                                    style={{ rotate: i * 30 }}
                                />
                            ))}
                        </div>
                        <span className="relative z-10 text-[10px] uppercase tracking-[0.4em] text-white/20 font-bold">Fragmented Reality</span>
                    </div>
                </div>
            </div>
        </section>
    );
}

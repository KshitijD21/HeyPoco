"use client";

import React from "react";
import { motion } from "framer-motion";

export default function PhilosophySection() {
    return (
        <section className="relative py-32 bg-white overflow-hidden">
            <div className="max-w-7xl mx-auto px-10">
                <div className="grid lg:grid-cols-2 gap-20 items-center">
                    <div>
                        <motion.span
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="text-[10px] font-bold uppercase tracking-[0.5em] text-[#0a0b0e] mb-6 block"
                        >
                            The Mirror
                        </motion.span>
                        <motion.h2
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8 }}
                            className="text-5xl md:text-7xl font-bold tracking-tighter text-[#0a0b0e] leading-[0.95] mb-10"
                        >
                            An honest mirror, <br />
                            <span className="opacity-30 italic font-light">not an optimistic coach.</span>
                        </motion.h2>
                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                            className="text-xl text-[#0a0b0e]/60 max-w-lg leading-relaxed mb-8"
                        >
                            Every Sunday, receive a plain-language summary of your week—where your money and time went,
                            and whether you followed through on commitments. No charts, no gamification, just truth.
                        </motion.p>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 1 }}
                        className="relative p-10 rounded-[48px] bg-[#0a0b0e] text-white shadow-2xl overflow-hidden"
                    >
                        {/* Sunday Mirror Graphic Placeholder */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/[0.05] rounded-full blur-[100px]" />
                        <div className="relative z-10 space-y-8">
                            <div className="flex items-center gap-3 opacity-40">
                                <div className="w-8 h-[1px] bg-white" />
                                <span className="text-[10px] uppercase tracking-[0.4em] font-bold">A Look Back</span>
                            </div>
                            <div className="space-y-4">
                                <p className="text-3xl font-light leading-snug">
                                    &quot;You spent <span className="text-[#22d3ee]">$384</span> this week, mostly on dining.
                                    You kept <span className="text-[#22d3ee]">4 of 5</span> promises.&quot;
                                </p>
                            </div>
                            <div className="pt-8 border-t border-white/10 italic text-white/40">
                                Reflection completed.
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}

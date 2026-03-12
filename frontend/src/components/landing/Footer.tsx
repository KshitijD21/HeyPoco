"use client";

import React from "react";
import { motion } from "framer-motion";
import { Shield, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function Footer() {
    return (
        <footer className="bg-[#0a0b0e] py-32 selection:bg-white selection:text-black">
            <div className="max-w-7xl mx-auto px-10">
                {/* Final CTA Area */}
                <div className="text-center mb-40">
                    <motion.h2
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-5xl md:text-8xl font-bold tracking-tighter text-white leading-[0.85] mb-12"
                    >
                        Stop deciding. <br />
                        <span className="text-[#22d3ee]">Start logging.</span>
                    </motion.h2>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="flex flex-col items-center gap-8"
                    >
                        <Link href="/login">
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="px-14 py-6 bg-white text-black font-bold text-xl rounded-full shadow-[0_20px_50px_-12px_rgba(255,255,255,0.2)]"
                            >
                                Get Early Access
                            </motion.button>
                        </Link>
                        <p className="text-white/40 text-[10px] uppercase tracking-[0.4em] font-bold">Free during early access. No credit card.</p>
                    </motion.div>
                </div>

                {/* Privacy Block */}
                <div className="grid md:grid-cols-2 gap-20 items-center pt-20 border-t border-white/5">
                    <div>
                        <div className="flex items-center gap-3 mb-6">
                            <Shield className="text-[#22d3ee]" size={20} />
                            <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-white">Privacy Promise</span>
                        </div>
                        <h3 className="text-3xl font-bold text-white mb-6">Your data is yours. Period.</h3>
                        <p className="text-lg text-white/50 leading-relaxed italic">
                            End-to-end encryption. Biometric lock. No bank sync.
                            Your life stays private, exactly where it belongs.
                        </p>
                    </div>

                    <div className="flex flex-col gap-6 md:items-end">
                        <div className="flex items-center gap-2 group cursor-pointer">
                            <span className="text-white/80 group-hover:text-[#22d3ee] transition-colors">Speak your life once, access it anytime.</span>
                        </div>
                        <div className="mt-10 flex gap-10 opacity-40 text-xs text-white">
                            <span className="hover:text-white cursor-pointer transition-colors">Privacy</span>
                            <span className="hover:text-white cursor-pointer transition-colors">Twitter (X)</span>
                            <span className="hover:text-white cursor-pointer transition-colors">GitHub</span>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}

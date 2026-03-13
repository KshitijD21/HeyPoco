"use client";

import { motion } from "framer-motion";
import { Home } from "lucide-react";
import Link from "next/link";

/* ─── Voice Wave Animation ────────────────────────────────────────────────── */
function VoiceWave({ isActive }: { isActive: boolean }) {
    return (
        <div className="flex items-center gap-[3px] h-8">
            {[...Array(5)].map((_, i) => (
                <motion.div
                    key={i}
                    className="w-[3px] bg-white rounded-full"
                    animate={isActive ? { height: [8, 24 + i * 4, 8] } : { height: 8 }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.08, ease: "easeInOut" }}
                />
            ))}
        </div>
    );
}

export default function NotFound() {
    return (
        <main className="min-h-screen bg-[#faf9f6] flex items-center justify-center px-6 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 -left-32 w-64 h-64 bg-[#6366f1]/5 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 -right-32 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl" />
            </div>

            <div className="max-w-md w-full text-center relative z-10">
                {/* Animated Voice Wave */}
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    className="mb-10 flex justify-center"
                >
                    <div className="w-32 h-32 rounded-full bg-[#1a1a1a] flex items-center justify-center shadow-2xl shadow-[#1a1a1a]/20">
                        <VoiceWave isActive={true} />
                    </div>
                </motion.div>

                {/* Message */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    className="mb-10"
                >
                    <h2 className="text-2xl font-medium text-[#1a1a1a] mb-3">
                        Page not found
                    </h2>
                    <p className="text-[#737373] text-lg leading-relaxed max-w-sm mx-auto">
                        This memory seems to have faded. Let&apos;s find you something that exists.
                    </p>
                </motion.div>

                {/* Back Home Button */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    className="flex justify-center"
                >
                    <Link
                        href="/"
                        className="group inline-flex items-center justify-center gap-2.5 px-7 py-3.5 bg-[#1a1a1a] text-white rounded-full font-medium hover:bg-black transition-all shadow-lg shadow-[#1a1a1a]/20 hover:shadow-xl hover:shadow-[#1a1a1a]/30 hover:-translate-y-0.5"
                    >
                        <Home size={18} />
                        Back Home
                    </Link>
                </motion.div>
            </div>
        </main>
    );
}

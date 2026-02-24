"use client";

import React from "react";
import { motion } from "framer-motion";
import {
    Briefcase,
    HeartPulse,
    ShieldCheck,
    Inbox,
    ChevronRight,
    CheckCircle2,
    BriefcaseIcon,
    Folder
} from "lucide-react";

/* ─── Simplified Dashboard Components for Onboarding ─── */

export function InboxPreview() {
    return (
        <motion.div
            animate={{
                y: [0, -8, 0],
                rotate: [0, -1, 0]
            }}
            transition={{
                duration: 5,
                repeat: Infinity,
                ease: "easeInOut"
            }}
            className="w-[300px] p-6 rounded-[32px] bg-white/60 backdrop-blur-3xl border border-white/40 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] space-y-5"
        >
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-violet-600 text-white shadow-lg shadow-violet-500/20">
                        <Inbox size={18} />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-600">Triage</span>
                        <span className="text-[9px] font-bold text-zinc-400">Current Stream</span>
                    </div>
                </div>
                <div className="flex gap-1.5 pt-2">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="w-1.5 h-4 bg-violet-600/10 rounded-full animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
                    ))}
                </div>
            </div>
            <p className="text-base font-semibold text-zinc-900 leading-snug">
                "Remember to check those vintage stores in Berlin when we move..."
            </p>
            <div className="h-12 w-full bg-zinc-950 rounded-[20px] flex items-center justify-center gap-2 text-white text-sm font-bold shadow-xl shadow-black/20 transition-transform active:scale-95">
                Sweep to Journal <ChevronRight size={16} />
            </div>
        </motion.div>
    );
}

export function IntelligencePreview() {
    return (
        <div className="relative w-[300px] h-[220px]">
            <motion.div
                initial={{ x: -20, y: 0, rotate: -4, opacity: 0 }}
                animate={{ x: 0, y: 0, rotate: -4, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.8 }}
                className="absolute inset-x-0 top-0 p-5 rounded-[32px] bg-white/40 backdrop-blur-2xl border border-white/40 shadow-xl space-y-4"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-blue-500 text-white shadow-lg shadow-blue-500/20">
                        <Briefcase size={16} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">Career</span>
                </div>
                <h4 className="text-lg font-bold text-zinc-900">Senior PM @ Stripe</h4>
                <div className="flex flex-wrap gap-1.5">
                    <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold">Verified</span>
                    <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold">Architecture</span>
                </div>
            </motion.div>

            <motion.div
                initial={{ x: 20, y: 50, rotate: 2, opacity: 0 }}
                animate={{ x: 15, y: 40, rotate: 2, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.8 }}
                className="absolute inset-x-0 top-12 p-5 rounded-[32px] bg-white border border-white/60 shadow-2xl space-y-4"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20">
                        <HeartPulse size={16} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">Wellness</span>
                </div>
                <div className="space-y-1">
                    <h4 className="text-lg font-bold text-zinc-900">Health Core</h4>
                    <div className="flex justify-between items-center bg-zinc-50 p-2 rounded-xl">
                        <span className="text-xs font-bold text-zinc-400">DAILY STEPS</span>
                        <span className="text-lg font-black text-emerald-600 tracking-tight">12,430</span>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

export function VaultPreview() {
    return (
        <motion.div
            animate={{
                y: [0, -10, 0],
                rotate: [0, 1, 0]
            }}
            transition={{
                duration: 6,
                repeat: Infinity,
                ease: "easeInOut"
            }}
            className="w-full max-w-[280px] p-5 rounded-[32px] bg-zinc-950 text-white shadow-2xl space-y-6"
        >
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-white/10 text-white">
                        <ShieldCheck size={18} />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40">Secure Vault</span>
                </div>
                <div className="p-2 rounded-full bg-white/5">
                    <Folder size={16} className="text-white/40" />
                </div>
            </div>

            <div className="space-y-2">
                {[
                    { name: "Pitch.pdf", type: "PDF" },
                    { name: "Budget_V2", type: "XLS" }
                ].map((file, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/10">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded bg-white/10 flex items-center justify-center text-[8px] font-bold">
                                {file.type}
                            </div>
                            <span className="text-xs font-medium truncate">{file.name}</span>
                        </div>
                        <CheckCircle2 size={12} className="text-emerald-500" />
                    </div>
                ))}
            </div>

            <div className="text-[10px] text-white/40 font-medium text-center italic">
                Encrypted with your private key
            </div>
        </motion.div>
    );
}

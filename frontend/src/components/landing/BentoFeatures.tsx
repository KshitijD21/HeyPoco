"use client";

import React from "react";
import { motion } from "framer-motion";
import {
    Briefcase,
    CreditCard,
    HeartPulse,
    CheckCircle2,
    Plane,
    Lightbulb
} from "lucide-react";

const outcomes = [
    {
        id: "finance",
        icon: CreditCard,
        title: "Finance Trace",
        desc: "Lunch at Zigle's. Split tracked. $21.25 recovered.",
        color: "#22d3ee",
        large: true
    },
    {
        id: "career",
        icon: Briefcase,
        title: "Career Log",
        desc: "Review employment contract for Senior PM role.",
        color: "#ffffff"
    },
    {
        id: "health",
        icon: HeartPulse,
        title: "Daily Vitals",
        desc: "12,430 steps today. 7h 45m quality rest.",
        color: "#ffffff"
    },
    {
        id: "commit",
        icon: CheckCircle2,
        title: "Promises Kept",
        desc: "Called Mom Thursday, 7 PM as promised.",
        color: "#ffffff",
        large: true
    },
    {
        id: "travel",
        icon: Plane,
        title: "Travel Clarity",
        desc: "Flight JL001 to Tokyo confirmed for Mar 15.",
        color: "#ffffff"
    },
    {
        id: "idea",
        icon: Lightbulb,
        title: "Idea Capture",
        desc: "Harmonic resonance thought at 2:14 AM.",
        color: "#ffffff"
    }
];

export default function BentoFeatures() {
    return (
        <section className="py-32 bg-[#0a0b0e] selection:bg-white selection:text-black">
            <div className="max-w-7xl mx-auto px-10">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="mb-20 text-center"
                >
                    <span className="text-[10px] font-bold uppercase tracking-[0.5em] text-[#22d3ee] mb-6 block">Capabilities</span>
                    <h2 className="text-5xl md:text-7xl font-bold tracking-tighter text-white leading-[0.95] mb-8">
                        Every facet of your life,<br />
                        <span className="opacity-30 italic font-light">beautifully organized.</span>
                    </h2>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {outcomes.map((outcome, i) => (
                        <motion.div
                            key={outcome.id}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1 }}
                            className={`group relative p-8 rounded-[40px] border border-white/5 bg-white/[0.03] backdrop-blur-3xl overflow-hidden hover:bg-white/[0.05] transition-colors ${outcome.large ? "md:col-span-2" : "md:col-span-1"}`}
                        >
                            <div className="relative z-10">
                                <div className="mb-6 p-3 rounded-2xl bg-white/5 w-fit border border-white/10 group-hover:scale-110 transition-transform duration-500">
                                    <outcome.icon size={24} className={outcome.id === "finance" ? "text-[#22d3ee]" : "text-white/40"} />
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">{outcome.title}</h3>
                                <p className="text-white/50 text-lg leading-relaxed max-w-[280px]">{outcome.desc}</p>
                            </div>

                            {/* Abstract Element */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/[0.05] to-transparent blur-3xl group-hover:bg-white/[0.1] transition-all" />
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}

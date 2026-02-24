"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, CheckCircle2, ChevronRight } from "lucide-react";
import { InboxPreview, IntelligencePreview, VaultPreview } from "./rich-previews";

interface Step {
    title: string;
    description: string;
    visual: React.ReactNode;
    color: string;
}

const STEPS: Step[] = [
    {
        title: "Poco Discovery",
        description: "Your ambient intelligence partner that learns and grows with you.",
        visual: <InboxPreview />,
        color: "from-violet-500 to-indigo-500",
    },
    {
        title: "Automated Insights",
        description: "Speak naturally. Poco extracts the substance and categorizes everything automatically.",
        visual: <IntelligencePreview />,
        color: "from-emerald-500 to-teal-500",
    },
    {
        title: "Secure & Private",
        description: "All your extracted data is encrypted and locked in your private vault.",
        visual: <VaultPreview />,
        color: "from-blue-500 to-cyan-500",
    },
];

export function Onboarding({ onComplete }: { onComplete: () => void }) {
    const [currentStep, setCurrentStep] = useState(0);

    const handleNext = () => {
        if (currentStep < STEPS.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            onComplete();
        }
    };

    return (
        <div className="absolute inset-0 z-[100] flex flex-col bg-[#faf9f6] overflow-hidden">
            {/* Background Synapse Pulse / Ornament */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
                <motion.div
                    animate={{
                        scale: [1, 1.3, 1],
                        opacity: [0.1, 0.2, 0.1],
                    }}
                    transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                    className="w-[800px] h-[800px] rounded-full bg-indigo-100 blur-[130px]"
                />
            </div>

            {/* AI State Indicators (Top) */}
            <div className="relative z-10 flex flex-col items-center gap-3 pt-12">
                <div className="flex gap-2.5">
                    {STEPS.map((_, i) => (
                        <motion.div
                            key={i}
                            animate={{
                                scale: i === currentStep ? 1 : 0.7,
                                opacity: i === currentStep ? 1 : 0.1,
                                width: i === currentStep ? 24 : 8
                            }}
                            className={`h-2 rounded-full bg-indigo-600 transition-all duration-500`}
                        />
                    ))}
                </div>
                <div className="h-6 flex items-center">
                    <AnimatePresence mode="wait">
                        <motion.span
                            key={currentStep}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-400"
                        >
                            {currentStep === 0 ? "Initial Capture" : currentStep === 1 ? "Neural Synthesis" : "Secure Archival"}
                        </motion.span>
                    </AnimatePresence>
                </div>
            </div>

            {/* Content / Morphing Canvas */}
            <div className="flex-1 relative flex flex-col items-center justify-center p-8">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentStep}
                        initial={{ opacity: 0, scale: 0.95, filter: "blur(20px)" }}
                        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                        exit={{ opacity: 0, scale: 1.05, filter: "blur(20px)" }}
                        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                        className="w-full flex flex-col items-center gap-16"
                    >
                        {/* Immersive Visual Component */}
                        <div className="relative w-full max-w-[320px] min-h-[240px] flex items-center justify-center">
                            <motion.div
                                layoutId="preview-container"
                                className="relative z-20 flex justify-center w-full"
                            >
                                {STEPS[currentStep].visual}
                            </motion.div>

                            {/* Decorative Synapses - More complex for 2026 look */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="absolute inset-0 flex items-center justify-center pointer-events-none scale-150"
                            >
                                <svg width="100%" height="100%" viewBox="0 0 300 300" className="opacity-[0.06] text-zinc-950">
                                    <motion.path
                                        animate={{ d: ["M150 150 Q200 100 250 150", "M150 150 Q220 80 250 150", "M150 150 Q200 100 250 150"] }}
                                        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                                        fill="none" stroke="currentColor" strokeWidth="0.5"
                                    />
                                    <motion.path
                                        animate={{ d: ["M150 150 Q100 200 50 150", "M150 150 Q80 220 50 150", "M150 150 Q100 200 50 150"] }}
                                        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
                                        fill="none" stroke="currentColor" strokeWidth="0.5"
                                    />
                                    <circle cx="150" cy="150" r="2" fill="currentColor" className="opacity-20" />
                                </svg>
                            </motion.div>
                        </div>

                        <div className="space-y-6 text-center">
                            <motion.h2
                                layoutId="step-title"
                                className="text-5xl font-black text-zinc-950 tracking-tight leading-[0.9] px-4"
                            >
                                {STEPS[currentStep].title.split(' ').map((word, i) => (
                                    <span key={i} className={i === 1 ? "text-zinc-300" : ""}>{word} </span>
                                ))}
                            </motion.h2>
                            <motion.p
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                                className="text-zinc-500 text-lg font-medium leading-relaxed max-w-[280px] mx-auto px-2"
                            >
                                {STEPS[currentStep].description}
                            </motion.p>
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Bottom Action */}
            <div className="p-10 pt-0 relative z-50">
                <button
                    onClick={handleNext}
                    className="w-full group relative flex items-center justify-center bg-zinc-950 text-white rounded-[32px] py-5 font-black transition-all active:scale-[0.98] overflow-hidden shadow-2xl shadow-black/20"
                >
                    <span className="relative z-10 flex items-center gap-3 text-lg tracking-tight">
                        {currentStep === STEPS.length - 1 ? (
                            <>
                                Start Exploring
                                <Sparkles className="w-5 h-5 text-indigo-200" />
                            </>
                        ) : (
                            <>
                                Continue
                                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform opacity-50" />
                            </>
                        )}
                    </span>
                    {/* Shimmer effect */}
                    <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full"
                        animate={{ translateX: ["100%", "-100%"] }}
                        transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                    />
                </button>
            </div>
        </div>
    );
}

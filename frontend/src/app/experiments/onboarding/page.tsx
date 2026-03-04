"use client";

import React, { useState } from "react";
import { Onboarding } from "@/components/onboarding";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function OnboardingExperimentPage() {
    const router = useRouter();
    const [showOnboarding, setShowOnboarding] = useState(true);

    const handleComplete = () => {
        router.push("/experiments/zen");
    };

    return (
        <div className="min-h-screen bg-zinc-100 flex items-center justify-center font-sans">
            {/* Background Zen Pattern */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-violet-500 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500 rounded-full blur-[120px]" />
            </div>

            {/* Content Area */}
            <div
                className="relative flex flex-col w-full max-w-md bg-[#faf9f6] shadow-2xl overflow-hidden"
                style={{ height: "100dvh", maxHeight: "100dvh" }}
            >
                <AnimatePresence>
                    {showOnboarding && (
                        <Onboarding onComplete={handleComplete} />
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

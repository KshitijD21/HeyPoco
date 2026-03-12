"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export default function Header() {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <motion.header
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            transition={{ duration: 1.2, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-700 ${scrolled
                ? "bg-[#faf9f6]/40 backdrop-blur-xl border-b border-[#1a1a1a]/5 py-4"
                : "bg-transparent py-10"
                }`}
        >
            <div className="max-w-7xl mx-auto px-10 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-4 group">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center text-white font-bold text-xl group-hover:scale-105 transition-all duration-500 shadow-2xl shadow-indigo-500/20">
                        h
                    </div>
                    <span className="text-2xl font-bold tracking-tighter text-[#1a1a1a]">
                        HeyPoco
                    </span>
                </Link>

                <div className="flex items-center gap-8">
                    <Link href="/login">
                        <motion.button
                            whileHover={{ scale: 1.02, backgroundColor: "#000" }}
                            whileTap={{ scale: 0.98 }}
                            className="px-8 py-3 bg-[#1a1a1a] text-white rounded-full text-sm font-semibold flex items-center gap-2 transition-all duration-300 shadow-2xl shadow-black/10"
                        >
                            Start Logging
                            <ArrowRight size={16} />
                        </motion.button>
                    </Link>
                </div>
            </div>
        </motion.header>
    );
}

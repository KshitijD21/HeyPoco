"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

export default function SignupPage() {
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const res = await fetch(`${apiBase}/api/waitlist`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, message }),
        });

        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            setError(data.error || "Something went wrong. Please try again.");
            setLoading(false);
            return;
        }

        setSubmitted(true);
        setLoading(false);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-12"
        >
            {/* Logo & Branding */}
            <div className="flex flex-col items-center space-y-6">
                <div className="flex items-center gap-3.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#1a1a1a]" />
                    <span className="text-[11px] font-bold tracking-[0.4em] uppercase text-[#1a1a1a] opacity-60">
                        HeyPoco
                    </span>
                </div>
                <h1 className="text-[40px] font-medium text-[#1a1a1a] tracking-tight text-center leading-[1.1]">
                    Request access.
                </h1>
                <p className="text-[14px] text-[#1a1a1a]/40 text-center max-w-[260px] leading-relaxed">
                    HeyPoco is in private beta. Leave your email and we&apos;ll reach out.
                </p>
            </div>

            <AnimatePresence mode="wait">
                {submitted ? (
                    <motion.div
                        key="success"
                        initial={{ opacity: 0, scale: 0.97 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center gap-5 py-8"
                    >
                        <div className="w-14 h-14 rounded-full bg-[#1a1a1a] flex items-center justify-center">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                        </div>
                        <div className="text-center space-y-1">
                            <p className="text-[16px] font-medium text-[#1a1a1a]">You&apos;re on the list.</p>
                            <p className="text-[13px] text-[#737373]">We&apos;ll be in touch at <span className="font-medium text-[#1a1a1a]">{email}</span></p>
                        </div>
                    </motion.div>
                ) : (
                    <motion.form
                        key="form"
                        onSubmit={handleSubmit}
                        className="space-y-8"
                    >
                        <div className="space-y-5">
                            <div className="space-y-2">
                                <label htmlFor="email" className="text-[10px] font-bold text-[#1a1a1a]/40 uppercase tracking-[0.15em] ml-1">
                                    Email address
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="w-full h-14 rounded-2xl border border-[#e5e5e5] bg-white px-5 text-[15px] text-[#1a1a1a] placeholder:text-[#1a1a1a]/15 focus:outline-none focus:ring-1 focus:ring-[#1a1a1a] transition-all"
                                    placeholder="name@example.com"
                                />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="message" className="text-[10px] font-bold text-[#1a1a1a]/40 uppercase tracking-[0.15em] ml-1">
                                    Why do you want access? <span className="normal-case font-normal opacity-60">(optional)</span>
                                </label>
                                <textarea
                                    id="message"
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    rows={3}
                                    className="w-full rounded-2xl border border-[#e5e5e5] bg-white px-5 py-4 text-[15px] text-[#1a1a1a] placeholder:text-[#1a1a1a]/15 focus:outline-none focus:ring-1 focus:ring-[#1a1a1a] transition-all resize-none"
                                    placeholder="I want to use HeyPoco to..."
                                />
                            </div>
                        </div>

                        {error && (
                            <motion.p
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-xs text-red-500 font-medium text-center"
                            >
                                {error}
                            </motion.p>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full h-14 rounded-2xl bg-[#1a1a1a] text-[15px] font-bold text-white hover:bg-black disabled:opacity-50 transition-all shadow-xl shadow-black/10 active:scale-[0.98]"
                        >
                            {loading ? "Sending..." : "Request access"}
                        </button>
                    </motion.form>
                )}
            </AnimatePresence>

            <div className="flex flex-col items-center space-y-5 pt-8 border-t border-[#e5e5e5]/40">
                <p className="text-[14px] text-[#1a1a1a]/40 tracking-tight">
                    Already have an account?{" "}
                    <Link href="/login" className="text-[#1a1a1a] font-bold hover:underline underline-offset-4">
                        Sign in
                    </Link>
                </p>
            </div>
        </motion.div>
    );
}

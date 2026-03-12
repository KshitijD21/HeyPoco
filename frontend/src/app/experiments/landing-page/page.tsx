"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
    Mic, 
    Sparkles, 
    Shield, 
    Calendar, 
    Wallet, 
    Search,
    ArrowRight,
    ChevronDown,
    Briefcase,
    HeartPulse,
    Lightbulb,
    CheckCircle2,
    CreditCard,
    Plane,
    Clock,
    TrendingDown,
    TrendingUp,
    Users,
    Zap,
    Github,
    Image as ImageIcon
} from "lucide-react";
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

/* ─── Card Shell ──────────────────────────────────────────────────────────── */
function CardShell({ 
    children, 
    icon: Icon, 
    category, 
    color,
    className = ""
}: { 
    children: React.ReactNode;
    icon: React.ElementType;
    category: string;
    color: string;
    className?: string;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className={`group relative bg-white border border-[#e5e5e5]/50 rounded-[32px] p-6 shadow-[0_2px_20px_-8px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_-12px_rgba(0,0,0,0.08)] transition-all flex flex-col ${className}`}
        >
            <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-xl ring-1 ring-inset ring-[#e5e5e5]/50 bg-[#faf9f6]" style={{ color }}>
                    <Icon size={18} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40">{category}</span>
            </div>
            {children}
        </motion.div>
    );
}

/* ─── Demo Cards ──────────────────────────────────────────────────────────── */
function DemoExpenseCard() {
    return (
        <CardShell icon={CreditCard} category="Finance" color="#1a1a1a">
            <h3 className="text-lg font-medium text-[#1a1a1a] tracking-tight mb-1">Lunch at Zigle&apos;s</h3>
            <p className="text-[13px] text-[#737373] mb-4">With Sarah · Split bill tracked</p>
            <div className="p-4 bg-[#1a1a1a] rounded-2xl text-white">
                <div className="flex justify-between items-end">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40 block mb-1">You paid</span>
                        <span className="text-2xl font-light">$42.50</span>
                    </div>
                    <div className="text-right">
                        <span className="text-[10px] opacity-60 block">Sarah owes you</span>
                        <span className="text-sm font-medium text-emerald-400">$21.25</span>
                    </div>
                </div>
            </div>
        </CardShell>
    );
}

function DemoCareerCard() {
    return (
        <CardShell icon={Briefcase} category="Career" color="#3b82f6">
            <h3 className="text-lg font-medium text-[#1a1a1a] tracking-tight mb-4">Senior PM @ Stripe</h3>
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#3b82f6]/5 border border-[#3b82f6]/10">
                <div className="w-1 h-8 bg-[#3b82f6] rounded-full" />
                <div className="flex flex-col">
                    <span className="text-xs font-bold text-[#3b82f6]">Pending</span>
                    <span className="text-[13px] text-[#1a1a1a]">Review employment contract</span>
                </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
                {["Offer", "March 15"].map(tag => (
                    <span key={tag} className="px-2.5 py-1 rounded-full bg-[#faf9f6] border border-[#e5e5e5] text-[10px] font-medium text-[#737373]">{tag}</span>
                ))}
            </div>
        </CardShell>
    );
}

function DemoHealthCard() {
    return (
        <CardShell icon={HeartPulse} category="Wellness" color="#ff6b6b">
            <h3 className="text-lg font-medium text-[#1a1a1a] tracking-tight mb-4">Daily Health</h3>
            <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl border border-[#e5e5e5]/50 bg-[#faf9f6]/30">
                    <span className="text-[10px] font-bold text-[#737373]/50 uppercase block mb-1">Steps</span>
                    <span className="text-xl font-medium">12,430</span>
                </div>
                <div className="p-4 rounded-2xl border border-[#e5e5e5]/50 bg-[#faf9f6]/30">
                    <span className="text-[10px] font-bold text-[#737373]/50 uppercase block mb-1">Sleep</span>
                    <span className="text-xl font-medium">7h 45m</span>
                </div>
            </div>
        </CardShell>
    );
}

function DemoCommitmentCard() {
    return (
        <CardShell icon={CheckCircle2} category="Commitment" color="#4ecdc4">
            <h3 className="text-lg font-medium text-[#1a1a1a] tracking-tight mb-2">Call Mom</h3>
            <p className="text-[13px] text-[#737373] mb-4">Promised to call Thursday evening</p>
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#4ecdc4]/5 border border-[#4ecdc4]/10">
                <Clock size={16} className="text-[#4ecdc4]" />
                <span className="text-[13px] text-[#1a1a1a]">Thursday, 7:00 PM</span>
            </div>
        </CardShell>
    );
}

function DemoTravelCard() {
    return (
        <CardShell icon={Plane} category="Travel" color="#ec4899">
            <h3 className="text-lg font-medium text-[#1a1a1a] tracking-tight mb-4">Flight to Tokyo</h3>
            <div className="flex justify-between items-center">
                <div className="text-center">
                    <span className="text-2xl font-medium">SFO</span>
                    <span className="text-[10px] text-[#737373] block uppercase font-bold">12:45 PM</span>
                </div>
                <div className="flex-1 px-4 flex flex-col items-center">
                    <div className="h-[1px] w-full bg-[#e5e5e5] relative">
                        <Plane size={12} className="absolute inset-0 m-auto text-[#ec4899]" />
                    </div>
                    <span className="text-[9px] text-[#737373]/50 mt-1">11h 15m</span>
                </div>
                <div className="text-center">
                    <span className="text-2xl font-medium">HND</span>
                    <span className="text-[10px] text-[#737373] block uppercase font-bold">4:00 PM</span>
                </div>
            </div>
        </CardShell>
    );
}

function DemoMemoryCard() {
    return (
        <CardShell icon={ImageIcon} category="Memory" color="#a66cff">
            <h3 className="text-lg font-medium text-[#1a1a1a] tracking-tight mb-2">Golden Hour</h3>
            <p className="text-[13px] text-[#737373] mb-4">The light hit the Chrysler Building today was unreal.</p>
            <div className="aspect-video rounded-2xl bg-[#faf9f6] border border-[#e5e5e5] flex items-center justify-center relative overflow-hidden">
                <span className="text-[11px] font-medium text-[#737373]/40 flex items-center gap-2">
                    <ImageIcon size={14} /> [Photo Attached]
                </span>
            </div>
            <div className="mt-3 flex items-center gap-2 text-[#a66cff]">
                <span className="text-[11px] font-semibold">Manhattan, NY</span>
            </div>
        </CardShell>
    );
}

/* ─── Phone Mockup ────────────────────────────────────────────────────────── */
function PhoneMockup() {
    const [isRecording, setIsRecording] = useState(false);

    useEffect(() => {
        const interval = setInterval(() => setIsRecording(prev => !prev), 3500);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="relative">
            <div className="relative bg-[#1a1a1a] rounded-[48px] p-3 shadow-2xl">
                <div className="relative bg-[#faf9f6] rounded-[40px] overflow-hidden w-[280px] h-[580px]">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-[#1a1a1a] rounded-b-2xl z-20" />
                    
                    <div className="pt-12 pb-4 px-5 bg-white border-b border-[#e5e5e5]/50">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-2 h-2 rounded-full bg-[#1a1a1a]" />
                            <span className="text-[10px] font-bold tracking-[0.2em] uppercase opacity-40">HeyPoco</span>
                        </div>
                        <h2 className="text-xl font-medium text-[#1a1a1a] tracking-tight">Today</h2>
                    </div>

                    <div className="px-3 py-4 space-y-3 overflow-hidden">
                        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }} className="p-4 rounded-2xl bg-white border border-[#e5e5e5]/50 shadow-sm">
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-xl bg-[#3b82f6]/10 flex items-center justify-center flex-shrink-0">
                                    <Briefcase size={14} className="text-[#3b82f6]" />
                                </div>
                                <div>
                                    <p className="text-[13px] text-[#1a1a1a] font-medium">Senior PM @ Stripe</p>
                                    <p className="text-[11px] text-[#737373] mt-0.5">Landed the dream role</p>
                                </div>
                            </div>
                        </motion.div>

                        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.7 }} className="p-4 rounded-2xl bg-white border border-[#e5e5e5]/50 shadow-sm">
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-xl bg-[#1a1a1a]/5 flex items-center justify-center flex-shrink-0">
                                    <CreditCard size={14} className="text-[#1a1a1a]" />
                                </div>
                                <div>
                                    <p className="text-[13px] text-[#1a1a1a] font-medium">Lunch at Zigle&apos;s</p>
                                    <p className="text-[11px] text-emerald-600 font-medium mt-0.5">$42.50 · Split with Sarah</p>
                                </div>
                            </div>
                        </motion.div>

                        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.9 }} className="p-4 rounded-2xl bg-white border border-[#e5e5e5]/50 shadow-sm">
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-xl bg-[#ec4899]/10 flex items-center justify-center flex-shrink-0">
                                    <Plane size={14} className="text-[#ec4899]" />
                                </div>
                                <div>
                                    <p className="text-[13px] text-[#1a1a1a] font-medium">Flight to Tokyo</p>
                                    <p className="text-[11px] text-[#737373] mt-0.5">JL001 · Mar 15</p>
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    <div className="absolute bottom-6 left-0 right-0 px-6">
                        <motion.button animate={{ scale: isRecording ? [1, 1.02, 1] : 1 }} transition={{ duration: 0.3 }} className="w-full py-4 rounded-2xl flex items-center justify-center gap-3 bg-[#1a1a1a]">
                            {isRecording ? (
                                <><VoiceWave isActive={true} /><span className="text-white text-sm font-medium">Listening...</span></>
                            ) : (
                                <><Mic size={20} className="text-white" /><span className="text-white text-sm font-medium">Tap to speak</span></>
                            )}
                        </motion.button>
                    </div>
                </div>
            </div>
            <div className="absolute -inset-8 bg-gradient-to-b from-[#1a1a1a]/5 to-transparent rounded-[80px] blur-3xl -z-10" />
        </div>
    );
}

/* ─── Navigation with Background ──────────────────────────────────────────── */
function Navigation() {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50);
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <motion.nav
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className={`fixed top-0 left-0 right-0 z-50 px-6 py-4 transition-all duration-300 ${scrolled ? "bg-[#faf9f6]/90 backdrop-blur-md border-b border-[#e5e5e5]/50" : ""}`}
        >
            <div className="max-w-6xl mx-auto flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-[#1a1a1a] flex items-center justify-center">
                        <Mic size={16} className="text-white" />
                    </div>
                    <span className="text-lg font-medium text-[#1a1a1a] tracking-tight">HeyPoco</span>
                </Link>
                
                <div className="hidden md:flex items-center gap-8">
                    <a href="#features" className="text-sm text-[#737373] hover:text-[#1a1a1a] transition-colors">Features</a>
                    <a href="#how-it-works" className="text-sm text-[#737373] hover:text-[#1a1a1a] transition-colors">How it works</a>
                    <a href="#privacy" className="text-sm text-[#737373] hover:text-[#1a1a1a] transition-colors">Privacy</a>
                </div>

                <div className="flex items-center gap-3">
                    <a href="https://github.com/anirudh3699/HeyPoco" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white border border-[#e5e5e5] flex items-center justify-center text-[#737373] hover:text-[#1a1a1a] hover:border-[#1a1a1a]/20 transition-all">
                        <Github size={18} />
                    </a>
                    <button className="px-5 py-2.5 bg-[#1a1a1a] text-white rounded-full text-sm font-medium hover:bg-black transition-colors">
                        Get Early Access
                    </button>
                </div>
            </div>
        </motion.nav>
    );
}

/* ─── Hero Section ────────────────────────────────────────────────────────── */
function HeroSection() {
    return (
        <section className="relative min-h-screen flex items-center pt-24 pb-16 overflow-hidden">
            <div className="max-w-6xl mx-auto px-6 w-full">
                <div className="grid lg:grid-cols-2 gap-16 items-center">
                    <div className="max-w-xl">
                        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }}>
                            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-[#e5e5e5] text-[11px] font-bold uppercase tracking-[0.15em] text-[#737373] mb-8">
                                <Sparkles size={14} className="text-[#6366f1]" />
                                Now in early access
                            </span>
                        </motion.div>

                        <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.4 }} className="text-5xl md:text-7xl font-medium text-[#1a1a1a] leading-[1.05] tracking-tight mb-6">
                            Speak your life.
                            <br />
                            <span className="text-[#737373]">Access it anytime.</span>
                        </motion.h1>

                        <motion.p initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.6 }} className="text-lg text-[#737373] leading-relaxed mb-10">
                            A voice-first personal life logger. One tap, speak naturally — HeyPoco understands, remembers, and reflects your life back to you.
                        </motion.p>

                        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.8 }} className="flex flex-col sm:flex-row gap-4">
                            <button className="group px-8 py-4 bg-[#1a1a1a] text-white rounded-full font-medium flex items-center justify-center gap-2 hover:bg-black transition-all">
                                Start Logging Free
                                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </button>
                            <button className="px-8 py-4 bg-white border border-[#e5e5e5] text-[#1a1a1a] rounded-full font-medium hover:border-[#1a1a1a]/20 transition-all">
                                Watch Demo
                            </button>
                        </motion.div>
                    </div>

                    <motion.div initial={{ opacity: 0, scale: 0.9, y: 40 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 1, delay: 0.5, ease: [0.16, 1, 0.3, 1] }} className="flex justify-center lg:justify-end">
                        <PhoneMockup />
                    </motion.div>
                </div>
            </div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }} className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-[#737373]">
                <span className="text-[10px] font-bold uppercase tracking-[0.3em]">Scroll</span>
                <motion.div animate={{ y: [0, 6, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
                    <ChevronDown size={18} />
                </motion.div>
            </motion.div>
        </section>
    );
}

/* ─── Cards Grid Section ──────────────────────────────────────────────────── */
function CardsGridSection() {
    return (
        <section id="features" className="py-32 bg-white">
            <div className="max-w-6xl mx-auto px-6">
                <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }} className="mb-16">
                    <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#737373] block mb-4">Features</span>
                    <h2 className="text-4xl md:text-5xl font-medium text-[#1a1a1a] tracking-tight">
                        Every facet of your life,
                        <br />
                        <span className="text-[#737373]">beautifully organized.</span>
                    </h2>
                </motion.div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <DemoExpenseCard />
                    <DemoCareerCard />
                    <DemoHealthCard />
                    <DemoCommitmentCard />
                    <DemoTravelCard />
                    <DemoMemoryCard />
                </div>
            </div>
        </section>
    );
}

/* ─── NEW: How It Works (Visual Timeline) ─────────────────────────────────── */
function HowItWorksSection() {
    return (
        <section id="how-it-works" className="py-32 bg-white overflow-hidden">
            <div className="max-w-6xl mx-auto px-6">
                <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }} className="text-center mb-20">
                    <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#737373] block mb-4">How it works</span>
                    <h2 className="text-4xl md:text-5xl font-medium text-[#1a1a1a] tracking-tight">
                        From voice to clarity.
                    </h2>
                </motion.div>

                <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
                    {/* Step 1 */}
                    <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }} className="relative">
                        <div className="bg-[#faf9f6] rounded-[32px] p-8 border border-[#e5e5e5]/50 h-full">
                            <div className="w-16 h-16 rounded-2xl bg-[#1a1a1a] flex items-center justify-center mb-6 mx-auto">
                                <Mic size={28} className="text-white" />
                            </div>
                            <div className="text-center">
                                <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#737373]/50 block mb-2">Step 1</span>
                                <h3 className="text-2xl font-medium text-[#1a1a1a] mb-3">Just speak</h3>
                                <p className="text-[#737373] leading-relaxed">
                                    Tap and talk naturally. No forms, no categories, no friction. 
                                    &quot;Coffee with Alex, $5.50&quot; — that&apos;s it.
                                </p>
                            </div>
                        </div>
                    </motion.div>

                    {/* Step 2 */}
                    <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.15 }} className="relative">
                        <div className="bg-[#faf9f6] rounded-[32px] p-8 border border-[#e5e5e5]/50 h-full">
                            <div className="w-16 h-16 rounded-2xl bg-[#6366f1] flex items-center justify-center mb-6 mx-auto">
                                <Sparkles size={28} className="text-white" />
                            </div>
                            <div className="text-center">
                                <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#737373]/50 block mb-2">Step 2</span>
                                <h3 className="text-2xl font-medium text-[#1a1a1a] mb-3">AI understands</h3>
                                <p className="text-[#737373] leading-relaxed">
                                    HeyPoco identifies what matters — expenses, events, commitments — 
                                    and organizes everything automatically.
                                </p>
                            </div>
                        </div>
                    </motion.div>

                    {/* Step 3 */}
                    <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.3 }} className="relative">
                        <div className="bg-[#faf9f6] rounded-[32px] p-8 border border-[#e5e5e5]/50 h-full">
                            <div className="w-16 h-16 rounded-2xl bg-emerald-500 flex items-center justify-center mb-6 mx-auto">
                                <Zap size={28} className="text-white" />
                            </div>
                            <div className="text-center">
                                <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#737373]/50 block mb-2">Step 3</span>
                                <h3 className="text-2xl font-medium text-[#1a1a1a] mb-3">Know your life</h3>
                                <p className="text-[#737373] leading-relaxed">
                                    Ask anything. Get honest weekly summaries. 
                                    Finally see where your time and money actually go.
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}

/* ─── NEW: Rich Weekly Summary with Visuals ───────────────────────────────── */
function WeeklySummarySection() {
    return (
        <section className="py-32 overflow-hidden">
            <div className="max-w-6xl mx-auto px-6">
                <div className="grid lg:grid-cols-2 gap-16 items-center">
                    {/* Left: Text */}
                    <motion.div initial={{ opacity: 0, x: -40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}>
                        <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#737373] block mb-4">Weekly Summary</span>
                        <h2 className="text-4xl md:text-5xl font-medium text-[#1a1a1a] tracking-tight mb-6">
                            An honest mirror,
                            <br />
                            not an optimistic coach.
                        </h2>
                        <p className="text-lg text-[#737373] leading-relaxed mb-8">
                            Every Sunday, receive a plain-language summary of your week. 
                            Where your money went. Where your time went. What you committed to 
                            and whether you followed through.
                        </p>
                        <p className="text-[#737373]/60">No charts. No gamification. Just truth.</p>
                    </motion.div>

                    {/* Right: Rich Visual Card */}
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.2 }}>
                        <div className="relative bg-white border border-[#e5e5e5]/50 rounded-[32px] p-8 shadow-[0_2px_20px_-8px_rgba(0,0,0,0.05)]">
                            <div className="absolute -top-3 left-8 px-4 py-1.5 bg-[#1a1a1a] rounded-full text-white text-[10px] font-bold uppercase tracking-widest">
                                Your Week in Review
                            </div>
                            
                            {/* Spending Section with Visual */}
                            <div className="pt-4 pb-6 border-b border-[#e5e5e5]">
                                <div className="flex items-center gap-2 mb-3">
                                    <Wallet size={14} className="text-[#737373]" />
                                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#737373]/50">Spending</span>
                                </div>
                                <p className="text-[#1a1a1a] leading-relaxed mb-4">
                                    You spent <span className="font-medium">$384</span> this week, mostly on food and transport.
                                    That&apos;s $42 less than last week.
                                </p>
                                {/* Mini bar chart */}
                                <div className="flex items-end gap-2 h-16">
                                    {[40, 65, 45, 80, 55, 38, 42].map((h, i) => (
                                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                            <motion.div 
                                                initial={{ height: 0 }} 
                                                whileInView={{ height: `${h}%` }} 
                                                viewport={{ once: true }}
                                                transition={{ duration: 0.5, delay: i * 0.05 }}
                                                className={`w-full rounded-t-sm ${i === 3 ? 'bg-[#1a1a1a]' : 'bg-[#e5e5e5]'}`}
                                            />
                                        </div>
                                    ))}
                                </div>
                                <div className="flex justify-between mt-2">
                                    <span className="text-[10px] text-[#737373]/50">Mon</span>
                                    <span className="text-[10px] text-[#737373]/50">Sun</span>
                                </div>
                            </div>
                            
                            {/* Time Section */}
                            <div className="py-6 border-b border-[#e5e5e5]">
                                <div className="flex items-center gap-2 mb-3">
                                    <Clock size={14} className="text-[#737373]" />
                                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#737373]/50">Time</span>
                                </div>
                                <p className="text-[#1a1a1a] leading-relaxed mb-4">
                                    Three social events, two deep work sessions, and you called 
                                    your mom like you promised.
                                </p>
                                {/* Visual pills */}
                                <div className="flex flex-wrap gap-2">
                                    <span className="px-3 py-1.5 rounded-full bg-[#3b82f6]/10 text-[#3b82f6] text-[11px] font-medium">3 Social</span>
                                    <span className="px-3 py-1.5 rounded-full bg-[#4ecdc4]/10 text-[#4ecdc4] text-[11px] font-medium">2 Deep Work</span>
                                    <span className="px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[11px] font-medium">✓ Mom</span>
                                </div>
                            </div>
                            
                            {/* Commitments Section */}
                            <div className="pt-6">
                                <div className="flex items-center gap-2 mb-3">
                                    <CheckCircle2 size={14} className="text-[#737373]" />
                                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#737373]/50">Commitments</span>
                                </div>
                                <p className="text-[#1a1a1a] leading-relaxed mb-4">
                                    You followed through on <span className="font-medium">4 of 5</span> things you committed to.
                                    The proposal is still pending.
                                </p>
                                {/* Progress dots */}
                                <div className="flex gap-2">
                                    {[1, 2, 3, 4].map(i => (
                                        <div key={i} className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center">
                                            <CheckCircle2 size={16} className="text-white" />
                                        </div>
                                    ))}
                                    <div className="w-8 h-8 rounded-full bg-[#e5e5e5] flex items-center justify-center">
                                        <Clock size={14} className="text-[#737373]" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}

/* ─── Privacy Section ─────────────────────────────────────────────────────── */
function PrivacySection() {
    return (
        <section id="privacy" className="py-32 bg-[#1a1a1a] text-white">
            <div className="max-w-4xl mx-auto px-6 text-center">
                <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}>
                    <div className="w-16 h-16 mx-auto mb-8 rounded-2xl bg-white/10 flex items-center justify-center">
                        <Shield size={28} className="text-white" />
                    </div>
                    <h2 className="text-4xl md:text-5xl font-medium mb-6 tracking-tight">
                        Your data is yours.
                        <br />
                        <span className="text-white/40">Period.</span>
                    </h2>
                    <p className="text-lg text-white/60 leading-relaxed max-w-2xl mx-auto mb-12">
                        End-to-end encryption. Biometric lock. No third-party integrations. 
                        No data sharing. No &quot;growth hacks.&quot; Your life stays private.
                    </p>
                    <div className="flex flex-wrap justify-center gap-3">
                        {["Encrypted at rest", "Biometric lock", "No bank sync", "No social features"].map(item => (
                            <span key={item} className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white/60 text-[11px] font-medium">{item}</span>
                        ))}
                    </div>
                </motion.div>
            </div>
        </section>
    );
}

/* ─── CTA Section ─────────────────────────────────────────────────────────── */
function CTASection() {
    return (
        <section className="py-32">
            <div className="max-w-4xl mx-auto px-6 text-center">
                <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}>
                    <h2 className="text-5xl md:text-7xl font-medium text-[#1a1a1a] mb-4 tracking-tight">
                        Stop deciding.
                    </h2>
                    <h2 className="text-5xl md:text-7xl font-medium text-[#737373] tracking-tight mb-10">
                        Start logging.
                    </h2>
                    <button className="px-10 py-5 bg-[#1a1a1a] text-white rounded-full font-medium hover:bg-black transition-all mx-auto">
                        Get Early Access
                    </button>
                    <p className="text-[#737373]/50 text-sm mt-8 uppercase tracking-[0.2em]">Free during early access. No credit card.</p>
                </motion.div>
            </div>
        </section>
    );
}

/* ─── Footer ──────────────────────────────────────────────────────────────── */
function Footer() {
    return (
        <footer className="py-12 border-t border-[#e5e5e5]">
            <div className="max-w-6xl mx-auto px-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-[#1a1a1a] flex items-center justify-center">
                            <Mic size={16} className="text-white" />
                        </div>
                        <span className="text-lg font-medium text-[#1a1a1a] tracking-tight">HeyPoco</span>
                    </div>
                    <p className="text-[#737373]/60 text-sm">Speak your life once, access it anytime.</p>
                    <p className="text-[#737373]/40 text-sm">© 2025 HeyPoco</p>
                </div>
            </div>
        </footer>
    );
}

/* ─── Main Page ───────────────────────────────────────────────────────────── */
export default function LandingPage() {
    return (
        <main className="min-h-screen bg-[#faf9f6] text-[#1a1a1a] antialiased selection:bg-[#1a1a1a] selection:text-white">
            <Navigation />
            <HeroSection />
            <CardsGridSection />
            <HowItWorksSection />
            <WeeklySummarySection />
            <PrivacySection />
            <CTASection />
            <Footer />
        </main>
    );
}

"use client";

import React from "react";
import { motion } from "framer-motion";
import {
    Briefcase,
    HeartPulse,
    Image as ImageIcon,
    Lightbulb,
    Users,
    Trophy,
    CreditCard,
    Calendar,
    LayoutDashboard,
    ArrowUpRight,
    MapPin,
    Clock,
    Sparkles,
    ChevronRight,
    Search,
    Plane,
    Home,
    RotateCcw,
    CheckCircle2,
    ListTodo
} from "lucide-react";

/* ─── Shared Types ────────────────────────────────────────────────────────── */

type CardProps = {
    title: string;
    description?: string;
    children: React.ReactNode;
    icon: React.ReactNode;
    category: string;
    color: string;
};

/* ─── Base Card Shell ─────────────────────────────────────────────────────── */

function CardShell({ title, description, children, icon, category, color }: CardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className="group relative bg-white border border-[#e5e5e5]/50 rounded-[32px] p-6 shadow-[0_2px_20px_-8px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_-12px_rgba(0,0,0,0.08)] transition-all flex flex-col h-full"
        >
            <div className="flex justify-between items-start mb-6">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="p-2 rounded-xl ring-1 ring-inset ring-[#e5e5e5]/50 bg-[#faf9f6]" style={{ color }}>
                            {icon}
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40">{category}</span>
                    </div>
                    <h3 className="text-xl font-medium text-[#1a1a1a] tracking-tight">{title}</h3>
                    {description && <p className="text-[13px] text-[#737373] leading-relaxed line-clamp-2">{description}</p>}
                </div>
            </div>

            <div className="flex-1">
                {children}
            </div>

            <div className="mt-8 pt-6 border-t border-[#e5e5e5]/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-[10px] text-[#1a1a1a]/40 font-bold uppercase tracking-widest">Active Component</span>
                </div>
                <button className="p-2 rounded-full hover:bg-[#faf9f6] transition-colors text-[#1a1a1a]/20 hover:text-[#1a1a1a]">
                    <ArrowUpRight size={18} />
                </button>
            </div>
        </motion.div>
    );
}

/* ─── 1. Professional Note (Career) ────────────────────────────────────────── */

function ProfessionalNote() {
    return (
        <CardShell
            title="Senior PM @ Stripe"
            description="Landed the dream role. Start date confirmed for March 15th."
            category="Career"
            color="#3b82f6"
            icon={<Briefcase size={18} />}
        >
            <div className="space-y-3 mt-2">
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#3b82f6]/5 border border-[#3b82f6]/10">
                    <div className="w-1 h-8 bg-[#3b82f6] rounded-full" />
                    <div className="flex flex-col">
                        <span className="text-xs font-bold text-[#3b82f6]">Pending Actions</span>
                        <span className="text-[13px] text-[#1a1a1a]">Review employment contract</span>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    {["Interview Pass", "Hired", "Strategy"].map(tag => (
                        <span key={tag} className="px-2.5 py-1 rounded-full bg-[#faf9f6] border border-[#e5e5e5] text-[10px] font-medium text-[#737373]">
                            {tag}
                        </span>
                    ))}
                </div>
            </div>
        </CardShell>
    );
}

/* ─── 2. Wellness Card (Health) ────────────────────────────────────────────── */

function WellnessCard() {
    return (
        <CardShell
            title="Daily Health"
            category="Wellness"
            color="#ff6b6b"
            icon={<HeartPulse size={18} />}
        >
            <div className="grid grid-cols-2 gap-3 mt-2">
                <div className="p-4 rounded-2xl border border-[#e5e5e5]/50 bg-[#faf9f6]/30">
                    <span className="text-[10px] font-bold text-[#737373]/50 uppercase block mb-1">Total Steps</span>
                    <span className="text-xl font-medium">12,430</span>
                </div>
                <div className="p-4 rounded-2xl border border-[#e5e5e5]/50 bg-[#faf9f6]/30">
                    <span className="text-[10px] font-bold text-[#737373]/50 uppercase block mb-1">Restful Sleep</span>
                    <span className="text-xl font-medium">7h 45m</span>
                </div>
            </div>
            <div className="mt-4 p-4 rounded-2xl bg-[#ff6b6b]/5 border border-[#ff6b6b]/10 flex items-center justify-between">
                <span className="text-xs font-medium text-[#1a1a1a]">Workout Consistency</span>
                <span className="text-xs font-bold text-[#ff6b6b]">92%</span>
            </div>
        </CardShell>
    );
}

/* ─── 3. Memory Card (Journaling) ──────────────────────────────────────────── */

function MemoryCard() {
    return (
        <CardShell
            title="Golden Hour Reflection"
            description="The way the light hit the Chrysler Building today was unreal. Feeling grateful."
            category="Journal"
            color="#a66cff"
            icon={<ImageIcon size={18} />}
        >
            <div className="mt-2 aspect-video rounded-2xl bg-[#faf9f6] border border-[#e5e5e5] flex items-center justify-center relative overflow-hidden group/img">
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity" />
                <span className="text-[11px] font-medium text-[#737373]/40 group-hover/img:text-white transition-colors z-10 flex items-center gap-2">
                    <ImageIcon size={14} /> [Photo Attached]
                </span>
            </div>
            <div className="mt-3 flex items-center gap-2 text-[#a66cff]">
                <MapPin size={12} />
                <span className="text-[11px] font-semibold tracking-tight">Manhattan, NY</span>
            </div>
        </CardShell>
    );
}

/* ─── 4. Idea Card (Knowledge) ─────────────────────────────────────────────── */

function IdeaCard() {
    return (
        <CardShell
            title="Anti-Gravity Propulsion"
            category="Knowledge"
            color="#4ecdc4"
            icon={<Lightbulb size={18} />}
        >
            <div className="mt-2 p-4 rounded-2xl bg-[#faf9f6] border-l-4 border-l-[#4ecdc4] italic">
                <p className="text-[13px] text-[#1a1a1a]/70 leading-relaxed">
                    "What if we used harmonic resonance to manipulate local curvature?"
                </p>
            </div>
            <div className="mt-4 flex items-center gap-2 px-1">
                <Clock size={12} className="text-[#4ecdc4]" />
                <span className="text-[10px] font-bold text-[#1a1a1a]/30 uppercase tracking-widest">Thought at 2:14 AM</span>
            </div>
        </CardShell>
    );
}

/* ─── 5. Relationship Card (Social) ───────────────────────────────────────── */

function RelationshipCard() {
    return (
        <CardShell
            title="Gift Ideas: Sarah"
            category="Social"
            color="#f59e0b"
            icon={<Users size={18} />}
        >
            <div className="mt-2 space-y-2">
                {[
                    { item: "Vintage Typewriter", status: "Done" },
                    { item: "Linen Journal", status: "Pending" }
                ].map((gift, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-[#e5e5e5]/50 hover:bg-[#faf9f6] transition-colors">
                        <span className="text-[13px] text-[#1a1a1a]">{gift.item}</span>
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${gift.status === 'Done' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                            {gift.status}
                        </span>
                    </div>
                ))}
            </div>
        </CardShell>
    );
}

/* ─── 6. Milestone Card (Events) ──────────────────────────────────────────── */

function MilestoneCard() {
    return (
        <CardShell
            title="Moving to Berlin"
            category="Milestone"
            color="#1a1a1a"
            icon={<Trophy size={18} />}
        >
            <div className="mt-2 overflow-hidden rounded-2xl relative">
                <div className="p-5 bg-[#1a1a1a] text-white">
                    <span className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-40 mb-2 block">New Chapter</span>
                    <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-light tracking-tighter italic">2026</span>
                        <span className="text-lg opacity-60">Spring</span>
                    </div>
                </div>
                <div className="absolute top-0 right-0 p-4">
                    <Sparkles className="text-white/20" size={32} />
                </div>
            </div>
            <div className="mt-4 flex justify-between items-center text-[11px] font-medium text-[#1a1a1a]/40">
                <span>Visa status: Approved</span>
                <ChevronRight size={14} />
            </div>
        </CardShell>
    );
}

/* ─── 7. Expense Card (Finance) ────────────────────────────────────────────── */

function ExpenseSummaryCard() {
    return (
        <CardShell
            title="Monthly Spending"
            category="Finance"
            color="#1a1a1a"
            icon={<CreditCard size={18} />}
        >
            <div className="mt-2 p-5 bg-[#1a1a1a] rounded-2xl text-white">
                <div className="flex justify-between items-end mb-6">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40 block mb-1">Total</span>
                        <span className="text-3xl font-light">$2,840</span>
                    </div>
                    <div className="text-right">
                        <span className="text-[10px] font-medium opacity-60 block">Daily Avg</span>
                        <span className="text-sm">$95</span>
                    </div>
                </div>
                <div className="space-y-3">
                    {[
                        { label: "Rent", percent: 65, color: "#3b82f6" },
                        { label: "Food", percent: 20, color: "#ff6b6b" },
                        { label: "Other", percent: 15, color: "#95a5a6" }
                    ].map(bar => (
                        <div key={bar.label} className="space-y-1">
                            <div className="flex justify-between text-[10px] font-medium opacity-60">
                                <span>{bar.label}</span>
                                <span>{bar.percent}%</span>
                            </div>
                            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${bar.percent}%`, backgroundColor: bar.color }} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </CardShell>
    );
}

/* ─── 8. Itinerary Card (Travel) ────────────────────────────────────────────── */

function ItineraryCard() {
    return (
        <CardShell
            title="Flight to Tokyo"
            description="JL001 · SFO → HND · Non-stop"
            category="Travel"
            color="#ec4899"
            icon={<Plane size={18} />}
        >
            <div className="mt-2 p-4 rounded-2xl border border-[#e5e5e5]/50 bg-white">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex flex-col">
                        <span className="text-2xl font-medium">SFO</span>
                        <span className="text-[10px] text-[#737373] uppercase font-bold">12:45 PM</span>
                    </div>
                    <div className="flex-1 px-4 flex flex-col items-center gap-1">
                        <div className="h-[1px] w-full bg-[#e5e5e5] relative">
                            <Plane size={10} className="absolute inset-0 m-auto text-[#ec4899]" />
                        </div>
                        <span className="text-[9px] text-[#737373]/50 font-medium">11h 15m</span>
                    </div>
                    <div className="flex flex-col text-right">
                        <span className="text-2xl font-medium">HND</span>
                        <span className="text-[10px] text-[#737373] uppercase font-bold">4:00 PM (+1)</span>
                    </div>
                </div>
                <div className="flex justify-between pt-3 border-t border-[#e5e5e5]/30">
                    <div className="flex flex-col">
                        <span className="text-[9px] text-[#737373] uppercase font-bold">Terminal</span>
                        <span className="text-xs font-medium">Intl G</span>
                    </div>
                    <div className="flex flex-col text-right">
                        <span className="text-[9px] text-[#737373] uppercase font-bold">Gate</span>
                        <span className="text-xs font-medium">A12</span>
                    </div>
                </div>
            </div>
        </CardShell>
    );
}

/* ─── 9. Household Card (Home) ─────────────────────────────────────────────── */

function HouseholdCard() {
    return (
        <CardShell
            title="Home Maintenance"
            category="Household"
            color="#10b981"
            icon={<Home size={18} />}
        >
            <div className="mt-2 space-y-3">
                <div className="p-3 rounded-2xl bg-[#10b981]/5 border border-[#10b981]/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-[#10b981]">
                            <CheckCircle2 size={16} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[13px] font-medium text-[#1a1a1a]">Watered Plants</span>
                            <span className="text-[10px] text-[#737373]">Living Room, Balcony</span>
                        </div>
                    </div>
                    <span className="text-[10px] text-[#737373] font-medium">Today</span>
                </div>
                <div className="p-3 rounded-2xl bg-white border border-[#e5e5e5]/50 flex items-center justify-between">
                    <div className="flex items-center gap-3 opacity-50">
                        <div className="w-8 h-8 rounded-xl bg-[#faf9f6] flex items-center justify-center text-[#737373]">
                            <Clock size={16} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[13px] font-medium text-[#1a1a1a]">Check AC Filter</span>
                            <span className="text-[10px] text-[#737373]">Upcoming task</span>
                        </div>
                    </div>
                </div>
            </div>
        </CardShell>
    );
}

/* ─── 10. Subscription Card (Finance) ──────────────────────────────────────── */

function SubscriptionCard() {
    return (
        <CardShell
            title="Active Subscriptions"
            category="Finance"
            color="#6366f1"
            icon={<RotateCcw size={18} />}
        >
            <div className="mt-2 space-y-2">
                {[
                    { name: "Netflix", price: "$15.99", date: "Mar 12" },
                    { name: "Spotify", price: "$9.99", date: "Mar 15" },
                    { name: "SaaS Tool", price: "$29.00", date: "Mar 18" }
                ].map((sub, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-[#e5e5e5]/50 hover:bg-[#faf9f6] transition-colors">
                        <div className="flex flex-col">
                            <span className="text-[13px] font-medium text-[#1a1a1a]">{sub.name}</span>
                            <span className="text-[10px] text-[#737373]">Due: {sub.date}</span>
                        </div>
                        <span className="text-xs font-bold text-[#1a1a1a]">{sub.price}</span>
                    </div>
                ))}
            </div>
        </CardShell>
    );
}

/* ─── 11. Task Card (Time Management) ─────────────────────────────────────── */

function TaskCard() {
    return (
        <CardShell
            title="Priority Tasks"
            category="Tasks"
            color="#f43f5e"
            icon={<ListTodo size={18} />}
        >
            <div className="mt-2 space-y-2">
                {[
                    { task: "Finish Presentation", priority: "High" },
                    { task: "Buy Groceries", priority: "Medium" }
                ].map((task, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-[#e5e5e5]/50">
                        <div className={`w-2 h-2 rounded-full ${task.priority === 'High' ? 'bg-[#f43f5e]' : 'bg-yellow-500'}`} />
                        <span className="text-[13px] text-[#1a1a1a] flex-1">{task.task}</span>
                        <ChevronRight size={14} className="text-[#e5e5e5]" />
                    </div>
                ))}
            </div>
        </CardShell>
    );
}

/* ─── Main Page ───────────────────────────────────────────────────────────── */

export default function ComponentsShowcase() {
    return (
        <div className="min-h-screen bg-[#faf9f6] text-[#1a1a1a] selection:bg-[#1a1a1a] selection:text-white px-6 py-20 antialiased font-sans">
            <div className="max-w-6xl mx-auto space-y-20">

                {/* Header */}
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                    <div className="space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="w-2.5 h-2.5 rounded-full bg-[#1a1a1a]" />
                            <span className="text-xs font-bold tracking-[0.4em] uppercase opacity-40">Experiment v2</span>
                        </div>
                        <h1 className="text-6xl md:text-8xl font-medium tracking-tight leading-[0.9]">
                            Visual <br /> Language.
                        </h1>
                        <p className="text-xl md:text-2xl text-[#1a1a1a]/40 max-w-xl font-medium tracking-tight">
                            A master collection of rich components designed for every facet of your life log.
                        </p>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex h-14 items-center bg-white border border-[#e5e5e5] rounded-2xl px-6 gap-3 shadow-sm min-w-[320px]">
                            <Search size={18} className="text-[#1a1a1a]/20" />
                            <input
                                type="text"
                                placeholder="Search components..."
                                className="bg-transparent text-sm focus:outline-none w-full placeholder:text-[#1a1a1a]/20"
                            />
                        </div>
                        <button className="h-14 w-14 flex items-center justify-center bg-[#1a1a1a] text-white rounded-2xl shadow-xl hover:bg-black transition-all">
                            <LayoutDashboard size={22} />
                        </button>
                    </div>
                </header>

                {/* Grid */}
                <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <ProfessionalNote />
                    <WellnessCard />
                    <MemoryCard />
                    <IdeaCard />
                    <RelationshipCard />
                    <MilestoneCard />
                    <ExpenseSummaryCard />
                    <ItineraryCard />
                    <HouseholdCard />
                    <SubscriptionCard />
                    <TaskCard />

                    {/* Placeholder for more */}
                    <div className="border-2 border-dashed border-[#e5e5e5] rounded-[32px] flex flex-col items-center justify-center p-12 text-center space-y-4 group hover:border-[#1a1a1a]/20 transition-colors cursor-pointer">
                        <div className="w-12 h-12 rounded-full bg-[#faf9f6] flex items-center justify-center text-[#1a1a1a]/20 group-hover:text-[#1a1a1a] transition-colors">
                            <Calendar size={24} />
                        </div>
                        <div>
                            <span className="text-sm font-bold text-[#1a1a1a]/40 block">Add New Template</span>
                            <span className="text-[12px] text-[#1a1a1a]/20">Define a new use-case category</span>
                        </div>
                    </div>
                </section>

                {/* Footer */}
                <footer className="pt-20 border-t border-[#e5e5e5] flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-[#1a1a1a]" />
                        <span className="font-bold tracking-[0.3em] uppercase text-[11px]">HeyPoco Systems</span>
                    </div>
                    <div className="flex gap-12 text-[11px] font-bold uppercase tracking-widest opacity-40">
                        <a href="#" className="hover:opacity-100 transition-opacity">Design Guide</a>
                        <a href="#" className="hover:opacity-100 transition-opacity">Interaction</a>
                        <a href="#" className="hover:opacity-100 transition-opacity">Assets</a>
                    </div>
                </footer>
            </div>
        </div>
    );
}

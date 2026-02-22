"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LogOut, Sparkles } from "lucide-react";
import Link from "next/link";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();

    const handleLogout = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push("/login");
        router.refresh();
    };

    return (
        <div className="min-h-screen bg-zinc-950 flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-50 border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-lg">
                <div className="mx-auto max-w-2xl flex items-center justify-between px-4 py-3">
                    <Link href="/dashboard" className="flex items-center gap-2">
                        <h1 className="text-lg font-bold bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
                            HeyPoco
                        </h1>
                    </Link>

                    <div className="flex items-center gap-3">
                        <Link
                            href="/dashboard/query"
                            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-violet-400 transition-colors"
                        >
                            <Sparkles className="h-3.5 w-3.5" />
                            Ask
                        </Link>
                        <button
                            onClick={handleLogout}
                            className="text-zinc-500 hover:text-zinc-300 transition-colors"
                            aria-label="Sign out"
                        >
                            <LogOut className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="flex-1 mx-auto w-full max-w-2xl px-4 py-6">
                {children}
            </main>
        </div>
    );
}

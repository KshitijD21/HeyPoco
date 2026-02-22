"use client";

import { useState, useCallback } from "react";
import { Search, Loader2, Sparkles } from "lucide-react";
import { useQuery_ } from "@/hooks/use-query";
import { EntryCard } from "@/components/entry-card";

export function QueryBar() {
    const [question, setQuestion] = useState("");
    const { ask, response, isLoading, error, reset } = useQuery_();

    const handleSubmit = useCallback(
        (e: React.FormEvent) => {
            e.preventDefault();
            if (!question.trim() || isLoading) return;
            ask(question.trim());
        },
        [question, isLoading, ask],
    );

    return (
        <div className="w-full space-y-4">
            {/* Search form */}
            <form onSubmit={handleSubmit} className="relative">
                <div className="flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-3 focus-within:ring-2 focus-within:ring-violet-500/50 focus-within:border-violet-500/50 transition-all">
                    <Sparkles className="h-4 w-4 text-violet-400 shrink-0" />
                    <input
                        type="text"
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        placeholder="Ask your data... &quot;How much did I spend this week?&quot;"
                        className="flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        disabled={!question.trim() || isLoading}
                        className="shrink-0 text-zinc-400 hover:text-violet-400 disabled:opacity-30 transition-colors"
                    >
                        {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Search className="h-4 w-4" />
                        )}
                    </button>
                </div>
            </form>

            {/* Response */}
            {response && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-4">
                    <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-4">
                        <div className="flex items-start gap-2 mb-2">
                            <Sparkles className="h-4 w-4 text-violet-400 mt-0.5 shrink-0" />
                            <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap">
                                {response.answer}
                            </p>
                        </div>
                        {!response.has_data && (
                            <p className="text-xs text-zinc-500 mt-2">
                                Keep logging and I&apos;ll have more to tell you.
                            </p>
                        )}
                    </div>

                    {/* Source entries */}
                    {response.sources.length > 0 && (
                        <div>
                            <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
                                Based on {response.sources.length} entries
                            </h4>
                            <div className="space-y-2">
                                {response.sources.slice(0, 5).map((entry) => (
                                    <EntryCard key={entry.id} entry={entry} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Clear */}
                    <button
                        onClick={() => {
                            reset();
                            setQuestion("");
                        }}
                        className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                        Clear results
                    </button>
                </div>
            )}

            {/* Error */}
            {error && (
                <p className="text-sm text-red-400 text-center">
                    {error instanceof Error ? error.message : "Query failed"}
                </p>
            )}
        </div>
    );
}

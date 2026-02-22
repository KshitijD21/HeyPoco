import { QueryBar } from "@/components/query-bar";

export default function QueryPage() {
    return (
        <div className="space-y-6">
            <div className="text-center space-y-1">
                <h2 className="text-lg font-semibold text-zinc-200">Ask your data</h2>
                <p className="text-sm text-zinc-500">
                    Ask anything about what you&apos;ve logged. I&apos;ll answer honestly.
                </p>
            </div>

            <QueryBar />
        </div>
    );
}

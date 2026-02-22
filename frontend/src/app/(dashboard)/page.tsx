"use client";

import { VoiceCapture } from "@/components/voice-capture";
import { ConfirmationCard } from "@/components/confirmation-card";
import { EntryFeed } from "@/components/entry-feed";
import { CategoryFilter } from "@/components/category-filter";
import { useEntryStore } from "@/stores/entry-store";

export default function DashboardPage() {
    const { pendingEntry } = useEntryStore();

    return (
        <div className="space-y-8">
            {/* Voice capture */}
            <section className="flex flex-col items-center gap-6 pt-4">
                <VoiceCapture />
                {pendingEntry && <ConfirmationCard />}
            </section>

            {/* Filters */}
            <section>
                <CategoryFilter />
            </section>

            {/* Timeline */}
            <section>
                <EntryFeed />
            </section>
        </div>
    );
}

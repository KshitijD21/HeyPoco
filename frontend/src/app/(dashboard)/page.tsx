"use client";

import { VoiceCapture } from "@/components/voice-capture";
import { ConfirmationCard } from "@/components/confirmation-card";
import { EntryFeed } from "@/components/entry-feed";
import { CategoryFilter } from "@/components/category-filter";
import { useEntryStore } from "@/stores/entry-store";
import { Onboarding } from "@/components/onboarding";
import { useState, useEffect } from "react";

export default function DashboardPage() {
    const { pendingEntry } = useEntryStore();
    const [showOnboarding, setShowOnboarding] = useState(false);

    useEffect(() => {
        const hasSeenOnboarding = localStorage.getItem("poco_onboarding_seen");
        if (!hasSeenOnboarding) {
            setShowOnboarding(true);
        }
    }, []);

    const handleOnboardingComplete = () => {
        localStorage.setItem("poco_onboarding_seen", "true");
        setShowOnboarding(false);
    };

    return (
        <div className="space-y-8">
            {showOnboarding && <Onboarding onComplete={handleOnboardingComplete} />}
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

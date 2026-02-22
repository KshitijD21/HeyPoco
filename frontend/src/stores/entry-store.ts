import { create } from "zustand";
import type { EntryType, PendingEntry, RecordingState } from "@/types";

interface EntryStore {
    // Recording state
    recordingState: RecordingState;
    setRecordingState: (state: RecordingState) => void;

    // Pending entry (confirmation card)
    pendingEntry: PendingEntry | null;
    setPendingEntry: (entry: PendingEntry | null) => void;
    clearPendingEntry: () => void;

    // Active filters
    activeFilter: EntryType | null;
    setActiveFilter: (filter: EntryType | null) => void;

    // Text input fallback
    textInput: string;
    setTextInput: (text: string) => void;
    clearTextInput: () => void;
}

export const useEntryStore = create<EntryStore>((set) => ({
    // Recording
    recordingState: "idle",
    setRecordingState: (recordingState) => set({ recordingState }),

    // Pending entry
    pendingEntry: null,
    setPendingEntry: (pendingEntry) => set({ pendingEntry }),
    clearPendingEntry: () => set({ pendingEntry: null }),

    // Filters
    activeFilter: null,
    setActiveFilter: (activeFilter) => set({ activeFilter }),

    // Text input
    textInput: "",
    setTextInput: (textInput) => set({ textInput }),
    clearTextInput: () => set({ textInput: "" }),
}));

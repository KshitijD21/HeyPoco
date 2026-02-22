"use client";

import { useState, useRef, useCallback } from "react";
import type { RecordingState } from "@/types";

interface UseVoiceRecorderReturn {
    state: RecordingState;
    startRecording: () => Promise<void>;
    stopRecording: () => Promise<Blob | null>;
    cancelRecording: () => void;
    duration: number;
}

export function useVoiceRecorder(): UseVoiceRecorderReturn {
    const [state, setState] = useState<RecordingState>("idle");
    const [duration, setDuration] = useState(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const cleanup = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
        mediaRecorderRef.current = null;
        chunksRef.current = [];
        setDuration(0);
    }, []);

    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100,
                },
            });

            streamRef.current = stream;

            const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
                ? "audio/webm;codecs=opus"
                : "audio/webm";

            const recorder = new MediaRecorder(stream, { mimeType });
            mediaRecorderRef.current = recorder;
            chunksRef.current = [];

            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunksRef.current.push(event.data);
                }
            };

            recorder.start(100); // Collect data every 100ms
            setState("recording");

            // Duration timer
            const startTime = Date.now();
            timerRef.current = setInterval(() => {
                setDuration(Math.floor((Date.now() - startTime) / 1000));
            }, 1000);
        } catch (error) {
            console.error("Failed to start recording:", error);
            setState("error");
            cleanup();
        }
    }, [cleanup]);

    const stopRecording = useCallback(async (): Promise<Blob | null> => {
        const recorder = mediaRecorderRef.current;

        if (!recorder || recorder.state !== "recording") {
            return null;
        }

        return new Promise((resolve) => {
            recorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
                cleanup();
                setState("processing");
                resolve(blob);
            };

            recorder.stop();
        });
    }, [cleanup]);

    const cancelRecording = useCallback(() => {
        const recorder = mediaRecorderRef.current;

        if (recorder && recorder.state === "recording") {
            recorder.stop();
        }

        cleanup();
        setState("idle");
    }, [cleanup]);

    return {
        state,
        startRecording,
        stopRecording,
        cancelRecording,
        duration,
    };
}

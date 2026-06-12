"use client";

import { useState, useRef, useEffect } from "react";

interface RecordButtonProps {
  onTranscription: (transcript: string, detectedNames: string[], intent: string, queryName: string | null, queryGroup: string | null) => void;
  disabled?: boolean;
  contactCount?: number;
  groupCount?: number;
}

const PROMPTS = [
  "I met Alice today, she teaches in the philosophy department at cal",
  "Remind me what Marcus is up to, I'm going to see him soon",
  "Tell me about everyone from the conference...",
  "Met a new guy named Derek at the gym...",
  "What do I know about Jamie?",
  "Tell me what I've recorded about my doctor..",
];

export default function RecordButton({ onTranscription, disabled, contactCount = 0, groupCount = 0 }: RecordButtonProps) {
  const showPrompts = !(contactCount >= 10 && groupCount >= 5);
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [promptIndex, setPromptIndex] = useState(0);
  const [fade, setFade] = useState(true);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Rotate prompts
  useEffect(() => {
    if (recording || processing) return;
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setPromptIndex((i) => (i + 1) % PROMPTS.length);
        setFade(true);
      }, 400);
    }, 3000);
    return () => clearInterval(interval);
  }, [recording, processing]);

  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;
    chunksRef.current = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    mediaRecorder.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      await sendToAPI(blob);
    };

    mediaRecorder.start();
    setRecording(true);
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
    setProcessing(true);
  }

  async function sendToAPI(blob: Blob) {
    try {
      const formData = new FormData();
      formData.append("file", blob, "memo.webm");

      const res = await fetch("/api/transcribe", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Transcription failed");

      onTranscription(data.transcript, data.detected_names ?? [], data.intent ?? "dictation", data.query_name ?? null, data.query_group ?? null);
    } catch (err) {
      console.error(err);
      alert("Recording failed. Please try again.");
    } finally {
      setProcessing(false);
    }
  }

  function handleClick() {
    if (recording) stopRecording();
    else startRecording();
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Prompt text */}
      {showPrompts && (
        <p
          className={`text-sm text-[#b9b9b9] italic text-center px-6 max-w-[min(20rem,80vw)] transition-opacity duration-400 min-h-[2.5rem] flex items-end justify-center ${
            recording ? "opacity-0" : processing ? "opacity-0" : fade ? "opacity-100" : "opacity-0"
          }`}
        >
          "{PROMPTS[promptIndex]}"
        </p>
      )}

      {/* Mic button */}
      <button
        onClick={handleClick}
        disabled={disabled || processing}
        className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all
          ${recording
            ? "bg-red-500 scale-110 shadow-red-200 shadow-xl"
            : processing
            ? "bg-gray-300 cursor-not-allowed"
            : "bg-black hover:bg-gray-900 hover:scale-105 active:scale-95"
          }
          disabled:opacity-50`}
      >
        {recording ? (
          // Stop square
          <span className="w-6 h-6 bg-white rounded-sm" />
        ) : processing ? (
          // Spinner
          <span className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          // Mic icon
          <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 1a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm0 2a2 2 0 0 0-2 2v6a2 2 0 0 0 4 0V5a2 2 0 0 0-2-2zm-7 8a1 1 0 0 1 1 1 6 6 0 0 0 12 0 1 1 0 0 1 2 0 8 8 0 0 1-7 7.93V21h2a1 1 0 0 1 0 2H9a1 1 0 0 1 0-2h2v-1.07A8 8 0 0 1 4 12a1 1 0 0 1 1-1z"/>
          </svg>
        )}
      </button>

      {/* State label */}
      <p className="text-xs text-[#b9b9b9] h-4">
        {recording ? "Tap to stop" : processing ? "Thinking…" : ""}
      </p>
    </div>
  );
}

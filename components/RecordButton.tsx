"use client";

import { useState, useRef } from "react";

interface RecordButtonProps {
  onTranscription: (transcript: string, detectedNames: string[]) => void;
  disabled?: boolean;
}

export default function RecordButton({ onTranscription, disabled }: RecordButtonProps) {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

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

      onTranscription(data.transcript, data.detected_names ?? []);
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
    <button
      onClick={handleClick}
      disabled={disabled || processing}
      className={`flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-white transition-all shadow-md
        ${recording
          ? "bg-red-500 hover:bg-red-600 animate-pulse"
          : processing
          ? "bg-gray-400 cursor-not-allowed"
          : "bg-indigo-600 hover:bg-indigo-700"
        }
        disabled:opacity-50`}
    >
      {recording ? (
        <>
          <span className="w-3 h-3 bg-white rounded-sm inline-block" />
          Stop Recording
        </>
      ) : processing ? (
        <>
          <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
          Processing…
        </>
      ) : (
        <>
          <span className="w-3 h-3 bg-red-400 rounded-full inline-block" />
          Record
        </>
      )}
    </button>
  );
}

"use client";

import type { DictationWithContacts } from "@/lib/types";
import { deleteDictation } from "@/lib/queries";
import { useState } from "react";

interface DictationCardProps {
  dictation: DictationWithContacts;
  onDeleted: () => void;
  onContactClick: (contactName: string) => void;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function DictationCard({ dictation, onDeleted, onContactClick }: DictationCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function handleDelete() {
    await deleteDictation(dictation.id);
    onDeleted();
  }

  return (
    <div className="bg-white rounded-xl border border-[#b9b9b9] p-4 shadow-sm">
      <p className="text-black leading-relaxed mb-3">{dictation.text}</p>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex flex-wrap gap-1">
          {dictation.contacts.map((c) => (
            <button
              key={c.id}
              onClick={() => onContactClick(c.name)}
              className="px-2 py-0.5 bg-[#f0f0f0] text-black text-xs rounded-full font-medium hover:bg-[#f0f0f0] transition-colors"
            >
              {c.name}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#b9b9b9]">{formatDate(dictation.created_at)}</span>
          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <span className="text-xs text-[#b9b9b9]">Delete?</span>
              <button onClick={handleDelete} className="text-xs text-red-500 hover:underline">Yes</button>
              <button onClick={() => setConfirmDelete(false)} className="text-xs text-[#b9b9b9] hover:underline">No</button>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(true)} className="text-[#b9b9b9] hover:text-red-400 transition-colors text-lg leading-none" title="Delete dictation">×</button>
          )}
        </div>
      </div>
    </div>
  );
}

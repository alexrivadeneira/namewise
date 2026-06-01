"use client";

import { useState } from "react";
import type { Contact } from "@/lib/types";

interface TriageCardProps {
  detectedName: string;
  contacts: Contact[];
  onCreateNew: (name: string) => Promise<void>;
  onMerge: (contactId: string) => Promise<void>;
}

export default function TriageCard({
  detectedName,
  contacts,
  onCreateNew,
  onMerge,
}: TriageCardProps) {
  const [selectedContactId, setSelectedContactId] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function handleCreateNew() {
    setLoading(true);
    await onCreateNew(detectedName);
    setLoading(false);
  }

  async function handleMerge() {
    if (!selectedContactId) return;
    setLoading(true);
    await onMerge(selectedContactId);
    setLoading(false);
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 shadow-sm">
      <p className="text-sm text-amber-700 font-medium mb-1">New person detected</p>
      <p className="text-lg font-semibold text-gray-800 mb-4">
        You mentioned <span className="text-indigo-600">{detectedName}</span>. Is this a new
        contact or someone you already know?
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={handleCreateNew}
          disabled={loading}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          Create new contact
        </button>

        <div className="flex gap-2 flex-1">
          <select
            value={selectedContactId}
            onChange={(e) => setSelectedContactId(e.target.value)}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            <option value="">Match to existing contact…</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {selectedContactId && (
            <button
              onClick={handleMerge}
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              Merge
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

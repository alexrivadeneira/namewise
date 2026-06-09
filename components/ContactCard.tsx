"use client";

import { useEffect, useState } from "react";
import type { ContactWithDetails, Group } from "@/lib/types";
import { assignContactToGroup } from "@/lib/queries";

interface ContactCardProps {
  contact: ContactWithDetails;
  groups: Group[];
  onGroupChanged: () => void;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function ContactCard({ contact, groups, onGroupChanged }: ContactCardProps) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [assigningGroup, setAssigningGroup] = useState(false);

  useEffect(() => {
    if (contact.dictations.length === 0) return;
    setLoadingSummary(true);
    fetch("/api/contact-summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contactId: contact.id,
        contactName: contact.name,
        dictations: contact.dictations.map((d) => ({ text: d.text, created_at: d.created_at })),
      }),
    })
      .then((r) => r.json())
      .then((data) => setSummary(data.summary ?? null))
      .catch(() => setSummary(null))
      .finally(() => setLoadingSummary(false));
  }, [contact.id]);

  async function handleGroupChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    setAssigningGroup(true);
    await assignContactToGroup(contact.id, value === "" ? null : value);
    setAssigningGroup(false);
    onGroupChanged();
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-lg font-semibold text-gray-800">{contact.name}</h3>
        {contact.group && (
          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-600 text-xs rounded-full">
            {contact.group.name}
          </span>
        )}
      </div>

      {/* Group assignment */}
      <div className="mb-3">
        <select
          value={contact.group?.id ?? ""}
          onChange={handleGroupChange}
          disabled={assigningGroup}
          className="text-xs text-gray-500 border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-300"
        >
          <option value="">No group</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>
      </div>

      {contact.aliases.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {contact.aliases.map((a) => (
            <span
              key={a.id}
              className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full"
            >
              {a.name}
            </span>
          ))}
        </div>
      )}

      {(loadingSummary || summary) && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2 mb-3 text-sm text-indigo-800">
          {loadingSummary ? (
            <span className="text-indigo-400 italic">Summarizing relationship…</span>
          ) : (
            summary
          )}
        </div>
      )}

      {contact.dictations.length > 0 && (
        <div className="border-t border-gray-100 pt-3 mt-3 space-y-2">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
            Mentions ({contact.dictations.length})
          </p>
          {contact.dictations.map((d) => (
            <div key={d.id} className="text-sm text-gray-600">
              <span className="text-xs text-gray-400 mr-2">{formatDate(d.created_at)}</span>
              {d.text.length > 120 ? d.text.slice(0, 120) + "…" : d.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

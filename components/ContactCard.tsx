"use client";

import { useEffect, useState } from "react";
import type { ContactWithDetails, Group } from "@/lib/types";
import { assignContactToGroup, deleteContact, renameContact, deleteAlias, deleteDictation, addAlias } from "@/lib/queries";

interface ContactCardProps {
  contact: ContactWithDetails;
  groups: Group[];
  onGroupChanged: () => void;
  onDeleted: () => void;
  onRenamed: () => void;
  onAliasDeleted: () => void;
  onDictationDeleted: () => void;
}

function timeAgo(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return "Mentioned today";
  if (days === 1) return "Last mentioned yesterday";
  return `Last mentioned ${days} days ago`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function ContactCard({ contact, groups, onGroupChanged, onDeleted, onRenamed, onAliasDeleted, onDictationDeleted }: ContactCardProps) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [assigningGroup, setAssigningGroup] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(contact.name);
  const [keepAsAlias, setKeepAsAlias] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

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

  async function handleRename(e: React.FormEvent) {
    e.preventDefault();
    const name = editName.trim();
    if (!name || name === contact.name) { setIsEditing(false); return; }
    if (keepAsAlias) await addAlias(contact.id, contact.name);
    await renameContact(contact.id, name);
    setIsEditing(false);
    setKeepAsAlias(false);
    onRenamed();
  }

  async function handleDelete() {
    await deleteContact(contact.id);
    onDeleted();
  }

  async function handleDeleteAlias(aliasId: string) {
    await deleteAlias(aliasId);
    onAliasDeleted();
  }

  const lastDictation = contact.dictations[0];

  return (
    <div className="bg-white rounded-xl border border-[#b9b9b9] p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 mr-2">
          {isEditing ? (
            <form onSubmit={handleRename} className="space-y-1.5">
              <div className="flex gap-2">
                <input
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="text-lg font-semibold text-black border-b border-[#b9b9b9] focus:outline-none bg-transparent flex-1"
                />
                <button type="submit" className="text-xs text-black hover:underline">Save</button>
                <button type="button" onClick={() => { setIsEditing(false); setEditName(contact.name); setKeepAsAlias(false); }} className="text-xs text-[#b9b9b9] hover:underline">Cancel</button>
              </div>
              {editName.trim() && editName.trim() !== contact.name && (
                <label className="flex items-center gap-1.5 text-xs text-[#b9b9b9] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={keepAsAlias}
                    onChange={(e) => setKeepAsAlias(e.target.checked)}
                    className="accent-black"
                  />
                  Remember "{contact.name}" as an alias
                </label>
              )}
            </form>
          ) : (
            <h3
              className="text-lg font-semibold text-black cursor-pointer hover:text-black transition-colors"
              onClick={() => setIsEditing(true)}
              title="Click to rename"
            >
              {contact.name}
            </h3>
          )}
          {lastDictation && (
            <p className="text-xs text-[#b9b9b9] mt-0.5">{timeAgo(lastDictation.created_at)}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {contact.group && (
            <span className="px-2 py-0.5 bg-[#f0f0f0] text-black text-xs rounded-full">
              {contact.group.name}
            </span>
          )}
          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <span className="text-xs text-[#b9b9b9]">Delete?</span>
              <button onClick={handleDelete} className="text-xs text-red-500 hover:underline">Yes</button>
              <button onClick={() => setConfirmDelete(false)} className="text-xs text-[#b9b9b9] hover:underline">No</button>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(true)} className="text-[#b9b9b9] hover:text-red-400 transition-colors text-lg leading-none" title="Delete contact">×</button>
          )}
        </div>
      </div>

      {/* Group assignment */}
      <div className="mb-3">
        <select
          value={contact.group?.id ?? ""}
          onChange={handleGroupChange}
          disabled={assigningGroup}
          className="text-xs text-[#b9b9b9] border border-[#b9b9b9] rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-[#b9b9b9]"
        >
          <option value="">No group</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>
      </div>

      {/* Aliases */}
      {contact.aliases.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {contact.aliases.map((a) => (
            <span
              key={a.id}
              className="flex items-center gap-1 px-2 py-0.5 bg-[#f0f0f0] text-black text-xs rounded-full"
            >
              {a.name}
              <button
                onClick={() => handleDeleteAlias(a.id)}
                className="text-[#b9b9b9] hover:text-red-400 transition-colors leading-none"
                title="Remove alias"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Summary */}
      {(loadingSummary || summary) && (
        <div className="bg-white border border-[#b9b9b9] rounded-lg px-3 py-2 mb-3 text-sm text-black">
          {loadingSummary ? (
            <span className="text-[#b9b9b9] italic">Summarizing relationship…</span>
          ) : (
            summary
          )}
        </div>
      )}

      {/* Dictations */}
      {contact.dictations.length > 0 && (
        <div className="border-t border-[#b9b9b9] pt-3 mt-3 space-y-2">
          <p className="text-xs font-medium text-[#b9b9b9] uppercase tracking-wide">
            Mentions ({contact.dictations.length})
          </p>
          {contact.dictations.map((d) => (
            <div key={d.id} className="flex items-start justify-between gap-2">
              <div className="text-sm text-black flex-1">
                <span className="text-xs text-[#b9b9b9] mr-2">{formatDate(d.created_at)}</span>
                {d.text.length > 120 ? d.text.slice(0, 120) + "…" : d.text}
              </div>
              <button
                onClick={async () => { await deleteDictation(d.id); onDictationDeleted(); }}
                className="text-[#b9b9b9] hover:text-red-400 transition-colors text-lg leading-none shrink-0"
                title="Delete mention"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

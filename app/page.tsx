"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase-browser";
import {
  createDictation,
  getContactsWithDetails,
  getContactByName,
  getContactsByGroupName,
  createContactAndLink,
  linkContactToDictation,
  getGroups,
  createGroup,
  deleteGroup,
} from "@/lib/queries";
import type {
  DictationWithContacts,
  ContactWithDetails,
  Group,
  TriageItem,
} from "@/lib/types";

import RecordButton from "@/components/RecordButton";
import TriageCard from "@/components/TriageCard";
import DictationCard from "@/components/DictationCard";
import ContactCard from "@/components/ContactCard";
import BriefingCard from "@/components/BriefingCard";
import LoginModal from "@/components/LoginModal";

export default function HomePage() {
  const [contacts, setContacts] = useState<ContactWithDetails[]>([]);
  const [contactsWithDetails, setContactsWithDetails] = useState<ContactWithDetails[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [triageQueue, setTriageQueue] = useState<TriageItem[]>([]);
  const [showLogin, setShowLogin] = useState(false);
  const [loginMode, setLoginMode] = useState<"save" | "login">("save");
  const [isAnon, setIsAnon] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [briefing, setBriefing] = useState<{ title: string; contacts: { contactName: string; bullets: string[] }[] } | null>(null);

  // ── Transient dictation flash ──────────────────────────────────────────────
  const [flashDictation, setFlashDictation] = useState<DictationWithContacts | null>(null);
  const [flashVisible, setFlashVisible] = useState(false);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Search & filter state ──────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState("");

  const actionCountRef = useRef(0);

  // ── Auth ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    async function ensureSession() {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        await supabase.auth.signInAnonymously();
      } else {
        setIsAnon(session.user.is_anonymous ?? true);
        setHasSession(true);
      }
      supabase.auth.onAuthStateChange((_event, session) => {
        setIsAnon(session?.user?.is_anonymous ?? true);
        setHasSession(!!session);
      });
    }
    ensureSession();
  }, []);

  // ── Load data ──────────────────────────────────────────────────────────────
  const refresh = useCallback(async () => {
    const [ctctsDetail, grps] = await Promise.all([
      getContactsWithDetails(),
      getGroups(),
    ]);
    setContactsWithDetails(ctctsDetail);
    setContacts(ctctsDetail);
    setGroups(grps);
  }, []);

  useEffect(() => { refresh(); }, []);

  // ── Filtered contacts ──────────────────────────────────────────────────────
  const filteredContacts = contactsWithDetails.filter((c) => {
    const q = search.toLowerCase();
    const matchesSearch = q === "" ||
      c.name.toLowerCase().includes(q) ||
      (c.group?.name.toLowerCase().includes(q) ?? false);
    const matchesGroup = activeGroupId === null || c.group?.id === activeGroupId;
    return matchesSearch && matchesGroup;
  });

  // ── Flash a dictation briefly after recording ──────────────────────────────
  function showFlash(dictation: DictationWithContacts) {
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    setFlashDictation(dictation);
    setFlashVisible(true);
    flashTimerRef.current = setTimeout(() => {
      setFlashVisible(false);
      setTimeout(() => setFlashDictation(null), 500); // wait for fade out
    }, 4000);
  }

  // ── Create group ───────────────────────────────────────────────────────────
  async function handleCreateGroup(e: React.FormEvent) {
    e.preventDefault();
    const name = newGroupName.trim();
    if (!name) return;
    await createGroup(name);
    setNewGroupName("");
    await refresh();
  }

  // ── Deferred login ─────────────────────────────────────────────────────────
  function maybePromptLogin() {
    if (typeof window !== "undefined" && window.location.port === "3001") return;
    actionCountRef.current += 1;
    if (isAnon && actionCountRef.current === 1) {
      setLoginMode("save");
      setShowLogin(true);
    }
  }

  function openSave() { setLoginMode("save"); setShowLogin(true); }
  function openLogin() { setLoginMode("login"); setShowLogin(true); }

  // ── Recording complete ─────────────────────────────────────────────────────
  async function handleTranscription(
    transcript: string,
    detectedNames: string[],
    intent: string,
    queryName: string | null,
    queryGroup: string | null,
  ) {
    // ── Contact query ────────────────────────────────────────────────────────
    if (intent === "contact_query" && queryName) {
      const contact = await getContactByName(queryName);
      if (!contact || contact.dictations.length === 0) {
        setBriefing({ title: queryName, contacts: [{ contactName: queryName, bullets: [] }] });
        return;
      }
      const res = await fetch("/api/contact-briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactName: contact.name,
          dictations: contact.dictations.map((d) => ({ text: d.text, created_at: d.created_at })),
        }),
      });
      const data = await res.json();
      setBriefing({ title: contact.name, contacts: [{ contactName: contact.name, bullets: data.bullets ?? [] }] });
      return;
    }

    // ── Group query ──────────────────────────────────────────────────────────
    if (intent === "group_query" && queryGroup) {
      const groupContacts = await getContactsByGroupName(queryGroup);
      if (!groupContacts.length) {
        setBriefing({ title: queryGroup, contacts: [] });
        return;
      }
      const results = await Promise.all(
        groupContacts.map(async (contact) => {
          if (!contact.dictations.length) return { contactName: contact.name, bullets: [] };
          const res = await fetch("/api/contact-briefing", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contactName: contact.name,
              dictations: contact.dictations.map((d) => ({ text: d.text, created_at: d.created_at })),
            }),
          });
          const data = await res.json();
          return { contactName: contact.name, bullets: data.bullets ?? [] };
        })
      );
      setBriefing({ title: queryGroup, contacts: results });
      return;
    }

    // ── Dictation ────────────────────────────────────────────────────────────
    const dictation = await createDictation(transcript);

    if (detectedNames.length > 0) {
      const toTriage: string[] = [];

      await Promise.all(
        detectedNames.map(async (name) => {
          const nameLower = name.toLowerCase();
          const firstName = nameLower.split(" ")[0];

          let match = contacts.find((c) => c.name.toLowerCase() === nameLower);
          if (!match) {
            match = contacts.find((c) =>
              c.aliases.some((a) => a.name.toLowerCase() === nameLower)
            );
          }
          if (!match) {
            const firstNameMatches = contacts.filter(
              (c) => c.name.toLowerCase().split(" ")[0] === firstName ||
                c.aliases.some((a) => a.name.toLowerCase().split(" ")[0] === firstName)
            );
            if (firstNameMatches.length === 1) match = firstNameMatches[0];
          }

          if (match) {
            await linkContactToDictation({
              contactId: match.id,
              dictationId: dictation.id,
              detectedName: name,
            });
          } else {
            toTriage.push(name);
          }
        })
      );

      if (toTriage.length > 0) {
        setTriageQueue((prev) => [
          ...prev,
          ...toTriage.map((name) => ({ detectedName: name, dictationId: dictation.id })),
        ]);
      }
    }

    // Show transient flash of the new dictation
    const updatedContacts = await getContactsWithDetails();
    setContactsWithDetails(updatedContacts);
    setContacts(updatedContacts);

    const linkedContacts = updatedContacts.filter(c =>
      c.dictations.some(d => d.id === dictation.id)
    );
    showFlash({
      ...dictation,
      contacts: linkedContacts,
    });
  }

  // ── Triage ─────────────────────────────────────────────────────────────────
  async function handleCreateNew(name: string) {
    const current = triageQueue[0];
    if (!current) return;
    await createContactAndLink({ name, dictationId: current.dictationId });
    advanceTriage();
  }

  async function handleMerge(contactId: string) {
    const current = triageQueue[0];
    if (!current) return;
    await linkContactToDictation({
      contactId,
      dictationId: current.dictationId,
      detectedName: current.detectedName,
    });
    advanceTriage();
  }

  function advanceTriage() {
    setTriageQueue((prev) => prev.slice(1));
    refresh();
    maybePromptLogin();
  }

  const currentTriage = triageQueue[0] ?? null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <img src="/namewise-logo.png" alt="Namewise" className="h-28 w-auto" />
        {isAnon && (
          <div className="flex gap-4 items-center">
            <button onClick={openLogin} className="text-sm text-[#b9b9b9] hover:text-black transition-colors">
              Log in
            </button>
            <button onClick={openSave} className="text-sm text-black hover:underline">
              Save my notes
            </button>
          </div>
        )}
      </div>

      {/* Record button */}
      <div className="flex justify-center">
        <RecordButton
          onTranscription={handleTranscription}
          disabled={!!currentTriage}
        />
      </div>

      {/* Transient dictation flash */}
      {flashDictation && (
        <div className={`transition-opacity duration-500 ${flashVisible ? "opacity-100" : "opacity-0"}`}>
          <DictationCard
            dictation={flashDictation}
            onDeleted={() => { setFlashDictation(null); refresh(); }}
            onContactClick={(name) => setSearch(name)}
          />
        </div>
      )}

      {/* Briefing card */}
      {briefing && (
        <BriefingCard
          title={briefing.title}
          contacts={briefing.contacts}
          onDismiss={() => setBriefing(null)}
        />
      )}

      {/* Triage card */}
      {currentTriage && (
        <TriageCard
          key={currentTriage.detectedName + currentTriage.dictationId}
          detectedName={currentTriage.detectedName}
          contacts={contacts}
          onCreateNew={handleCreateNew}
          onMerge={handleMerge}
        />
      )}

      {/* Contacts */}
      <div className="space-y-4">
        {/* Search box */}
        <input
          type="text"
          placeholder="Search contacts or groups…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-[#b9b9b9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#b9b9b9]"
        />

        {/* Group filter chips */}
        {groups.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveGroupId(null)}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                activeGroupId === null
                  ? "bg-black text-white border-black"
                  : "bg-white text-black border-[#b9b9b9] hover:border-[#b9b9b9]"
              }`}
            >
              All
            </button>
            {groups.map((g) => (
              <div key={g.id} className="flex items-center gap-1">
                <button
                  onClick={() => setActiveGroupId(activeGroupId === g.id ? null : g.id)}
                  className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                    activeGroupId === g.id
                      ? "bg-black text-white border-black"
                      : "bg-white text-black border-[#b9b9b9] hover:border-[#b9b9b9]"
                  }`}
                >
                  {g.name}
                </button>
                <button
                  onClick={async () => {
                    if (activeGroupId === g.id) setActiveGroupId(null);
                    await deleteGroup(g.id);
                    refresh();
                  }}
                  className="text-[#b9b9b9] hover:text-red-400 transition-colors text-sm leading-none"
                  title="Delete group"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Create group */}
        <form onSubmit={handleCreateGroup} className="flex gap-2">
          <input
            type="text"
            placeholder="New group name…"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            className="flex-1 px-3 py-1.5 text-sm border border-[#b9b9b9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#b9b9b9]"
          />
          <button
            type="submit"
            disabled={!newGroupName.trim()}
            className="px-3 py-1.5 text-sm bg-black text-white rounded-lg disabled:opacity-40 hover:bg-gray-900 transition-colors"
          >
            Add group
          </button>
        </form>

        {/* Contact cards */}
        {contactsWithDetails.length === 0 ? (
          <p className="text-[#b9b9b9] text-sm text-center py-12">
            No contacts yet — start by recording a voice memo.
          </p>
        ) : filteredContacts.length === 0 ? (
          <p className="text-[#b9b9b9] text-sm text-center py-8">
            No contacts match your search.
          </p>
        ) : (
          filteredContacts.map((c) => (
            <ContactCard
              key={c.id}
              contact={c}
              groups={groups}
              onGroupChanged={refresh}
              onDeleted={refresh}
              onRenamed={refresh}
              onAliasDeleted={refresh}
              onDictationDeleted={refresh}
            />
          ))
        )}
      </div>

      {showLogin && <LoginModal mode={loginMode} onDismiss={() => setShowLogin(false)} />}
    </div>
  );
}

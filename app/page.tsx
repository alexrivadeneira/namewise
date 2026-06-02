"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase-browser";
import {
  createDictation,
  getDictationsWithContacts,
  getContactsWithDetails,
  getContactByName,
  createContactAndLink,
  linkContactToDictation,
} from "@/lib/queries";
import type {
  DictationWithContacts,
  ContactWithDetails,
  TriageItem,
} from "@/lib/types";

import RecordButton from "@/components/RecordButton";
import TriageCard from "@/components/TriageCard";
import DictationCard from "@/components/DictationCard";
import ContactCard from "@/components/ContactCard";
import BriefingCard from "@/components/BriefingCard";
import LoginModal from "@/components/LoginModal";

type Tab = "dictations" | "contacts";

export default function HomePage() {
  const [tab, setTab] = useState<Tab>("dictations");
  const [dictations, setDictations] = useState<DictationWithContacts[]>([]);
  const [contacts, setContacts] = useState<ContactWithDetails[]>([]);
  const [contactsWithDetails, setContactsWithDetails] = useState<ContactWithDetails[]>([]);
  const [triageQueue, setTriageQueue] = useState<TriageItem[]>([]);
  const [showLogin, setShowLogin] = useState(false);
  const [isAnon, setIsAnon] = useState(true);
  const [briefing, setBriefing] = useState<{ contactName: string; bullets: string[] } | null>(null);
  const actionCountRef = useRef(0);

  // ── Auth: ensure anonymous session exists ──────────────────────────────────
  useEffect(() => {
    async function ensureSession() {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        await supabase.auth.signInAnonymously();
      } else {
        setIsAnon(session.user.is_anonymous ?? true);
      }

      supabase.auth.onAuthStateChange((_event, session) => {
        setIsAnon(session?.user?.is_anonymous ?? true);
      });
    }
    ensureSession();
  }, []);

  // ── Load data ──────────────────────────────────────────────────────────────
  const refresh = useCallback(async (activeTab: Tab = tab) => {
    if (activeTab === "dictations") {
      const [dicts, ctctsDetail] = await Promise.all([
        getDictationsWithContacts(),
        getContactsWithDetails(),
      ]);
      setDictations(dicts);
      setContactsWithDetails(ctctsDetail);
      setContacts(ctctsDetail);
    } else {
      const ctctsDetail = await getContactsWithDetails();
      setContactsWithDetails(ctctsDetail);
      setContacts(ctctsDetail);
    }
  }, [tab]);

  useEffect(() => { refresh(tab); }, [tab]);

  // ── Deferred login: prompt after first completed triage ────────────────────
  function maybePromptLogin() {
    actionCountRef.current += 1;
    if (isAnon && actionCountRef.current === 1) {
      setShowLogin(true);
    }
  }

  // ── Recording complete ─────────────────────────────────────────────────────
  async function handleTranscription(
    transcript: string,
    detectedNames: string[],
    intent: string,
    queryName: string | null
  ) {
    // ── Query intent: show briefing, don't save ──────────────────────────────
    if (intent === "query" && queryName) {
      const contact = await getContactByName(queryName);
      if (!contact || contact.dictations.length === 0) {
        setBriefing({ contactName: queryName, bullets: [] });
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
      setBriefing({ contactName: contact.name, bullets: data.bullets ?? [] });
      return;
    }

    // ── Dictation intent: save and triage as before ──────────────────────────
    const dictation = await createDictation(transcript);
    await refresh("dictations");

    if (detectedNames.length > 0) {
      setTriageQueue((prev) => [
        ...prev,
        ...detectedNames.map((name) => ({ detectedName: name, dictationId: dictation.id })),
      ]);
    }
  }

  // ── Triage: create new contact ─────────────────────────────────────────────
  async function handleCreateNew(name: string) {
    const current = triageQueue[0];
    if (!current) return;
    await createContactAndLink({ name, dictationId: current.dictationId });
    advanceTriage();
  }

  // ── Triage: merge with existing contact ───────────────────────────────────
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
    refresh("dictations");
    maybePromptLogin();
  }

  // ──────────────────────────────────────────────────────────────────────────

  const currentTriage = triageQueue[0] ?? null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Namewise</h1>
        {isAnon && (
          <button
            onClick={() => setShowLogin(true)}
            className="text-sm text-indigo-600 hover:underline"
          >
            Save my notes
          </button>
        )}
      </div>

      {/* Record button */}
      <div className="flex justify-center">
        <RecordButton
          onTranscription={handleTranscription}
          disabled={!!currentTriage}
        />
      </div>

      {/* Briefing card */}
      {briefing && (
        <BriefingCard
          contactName={briefing.contactName}
          bullets={briefing.bullets}
          onDismiss={() => setBriefing(null)}
        />
      )}

      {/* Triage card (only shows the current item) */}
      {currentTriage && (
        <TriageCard
          key={currentTriage.detectedName + currentTriage.dictationId}
          detectedName={currentTriage.detectedName}
          contacts={contacts}
          onCreateNew={handleCreateNew}
          onMerge={handleMerge}
        />
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {(["dictations", "contacts"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2.5 text-sm font-medium capitalize border-b-2 transition-colors -mb-px
              ${tab === t
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "dictations" ? (
        <div className="space-y-3">
          {dictations.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">
              No dictations yet. Hit record to start.
            </p>
          ) : (
            dictations.map((d) => <DictationCard key={d.id} dictation={d} />)
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {contactsWithDetails.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">
              No contacts yet. They'll appear after you mention someone in a dictation.
            </p>
          ) : (
            contactsWithDetails.map((c) => <ContactCard key={c.id} contact={c} />)
          )}
        </div>
      )}

      {/* Deferred login modal */}
      {showLogin && <LoginModal onDismiss={() => setShowLogin(false)} />}
    </div>
  );
}

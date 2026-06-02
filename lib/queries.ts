import { createClient } from "./supabase-browser";
import type {
  Contact,
  Alias,
  Dictation,
  DictationWithContacts,
  ContactWithDetails,
} from "./types";

// ─── Dictations ───────────────────────────────────────────────────────────────

export async function createDictation(text: string): Promise<Dictation> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data, error } = await supabase
    .from("dictations")
    .insert({ text, user_id: user.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getDictationsWithContacts(): Promise<DictationWithContacts[]> {
  const supabase = createClient();

  const { data: dictations, error } = await supabase
    .from("dictations")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;

  const { data: links } = await supabase
    .from("contacts_dictations")
    .select("dictation_id, contacts(*)");

  const linkMap: Record<string, Contact[]> = {};
  (links ?? []).forEach((l: any) => {
    if (!linkMap[l.dictation_id]) linkMap[l.dictation_id] = [];
    if (l.contacts) linkMap[l.dictation_id].push(l.contacts as Contact);
  });

  return (dictations ?? []).map((d) => ({
    ...d,
    contacts: linkMap[d.id] ?? [],
  }));
}

// ─── Contacts ─────────────────────────────────────────────────────────────────

export async function getContacts(): Promise<Contact[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createContact(name: string): Promise<Contact> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data, error } = await supabase
    .from("contacts")
    .insert({ name, user_id: user.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getContactsWithDetails(): Promise<ContactWithDetails[]> {
  const supabase = createClient();

  const { data: contacts, error } = await supabase
    .from("contacts")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;

  const { data: aliasLinks } = await supabase
    .from("contacts_aliases")
    .select("contact_id, aliases(*)");

  const { data: dictLinks } = await supabase
    .from("contacts_dictations")
    .select("contact_id, dictations(*)");

  const aliasMap: Record<string, Alias[]> = {};
  (aliasLinks ?? []).forEach((l: any) => {
    if (!aliasMap[l.contact_id]) aliasMap[l.contact_id] = [];
    if (l.aliases) aliasMap[l.contact_id].push(l.aliases as Alias);
  });

  const dictMap: Record<string, Dictation[]> = {};
  (dictLinks ?? []).forEach((l: any) => {
    if (!dictMap[l.contact_id]) dictMap[l.contact_id] = [];
    if (l.dictations) dictMap[l.contact_id].push(l.dictations as Dictation);
  });

  return (contacts ?? []).map((c) => ({
    ...c,
    aliases: aliasMap[c.id] ?? [],
    dictations: (dictMap[c.id] ?? []).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ),
  }));
}

export async function getContactByName(name: string): Promise<ContactWithDetails | null> {
  const supabase = createClient();

  const { data: contacts } = await supabase
    .from("contacts")
    .select("*");

  const match = (contacts ?? []).find(
    (c) => c.name.toLowerCase() === name.toLowerCase()
  );
  if (!match) return null;

  const { data: dictLinks } = await supabase
    .from("contacts_dictations")
    .select("contact_id, dictations(*)")
    .eq("contact_id", match.id);

  const { data: aliasLinks } = await supabase
    .from("contacts_aliases")
    .select("contact_id, aliases(*)")
    .eq("contact_id", match.id);

  const dictations = (dictLinks ?? [])
    .map((l: any) => l.dictations)
    .filter(Boolean)
    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const aliases = (aliasLinks ?? []).map((l: any) => l.aliases).filter(Boolean);

  return { ...match, dictations, aliases };
}

// ─── Triage actions ───────────────────────────────────────────────────────────

/** Link an existing contact to a dictation, creating an alias if needed. */
export async function linkContactToDictation({
  contactId,
  dictationId,
  detectedName,
}: {
  contactId: string;
  dictationId: string;
  detectedName: string;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Create contacts_dictations link
  await supabase
    .from("contacts_dictations")
    .upsert({ contact_id: contactId, dictation_id: dictationId, user_id: user.id });

  // Check if this detected name is already an alias or the contact name
  const { data: contact } = await supabase
    .from("contacts")
    .select("name")
    .eq("id", contactId)
    .single();

  if (contact && contact.name.toLowerCase() !== detectedName.toLowerCase()) {
    // Check if alias already exists for this contact
    const { data: existingAliases } = await supabase
      .from("contacts_aliases")
      .select("aliases(name)")
      .eq("contact_id", contactId);

    const alreadyAliased = (existingAliases ?? []).some(
      (l: any) => l.aliases?.name?.toLowerCase() === detectedName.toLowerCase()
    );

    if (!alreadyAliased) {
      // Create new alias + link
      const { data: alias } = await supabase
        .from("aliases")
        .insert({ name: detectedName, user_id: user.id })
        .select()
        .single();

      if (alias) {
        await supabase
          .from("contacts_aliases")
          .insert({ contact_id: contactId, alias_id: alias.id, user_id: user.id });
      }
    }
  }

  // Touch updated_at on contact so it floats to top
  await supabase
    .from("contacts")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", contactId);
}

/** Create a new contact and link it to a dictation. */
export async function createContactAndLink({
  name,
  dictationId,
}: {
  name: string;
  dictationId: string;
}): Promise<Contact> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: contact, error } = await supabase
    .from("contacts")
    .insert({ name, user_id: user.id })
    .select()
    .single();
  if (error) throw error;

  await supabase
    .from("contacts_dictations")
    .insert({ contact_id: contact.id, dictation_id: dictationId, user_id: user.id });

  return contact;
}

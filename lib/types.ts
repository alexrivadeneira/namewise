export interface Contact {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Alias {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

export interface Dictation {
  id: string;
  user_id: string;
  text: string;
  created_at: string;
}

export interface ContactDictation {
  id: string;
  contact_id: string;
  dictation_id: string;
  user_id: string;
}

export interface ContactAlias {
  id: string;
  contact_id: string;
  alias_id: string;
  user_id: string;
}

// Enriched types for UI
export interface DictationWithContacts extends Dictation {
  contacts: Contact[];
}

export interface ContactWithDetails extends Contact {
  aliases: Alias[];
  dictations: Dictation[];
  group: Group | null;
}

export interface Group {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

// Triage state
export interface TriageItem {
  detectedName: string;
  dictationId: string;
}

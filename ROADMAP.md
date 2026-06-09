# Namewise Roadmap

## 🔴 Foundation (do these first — everything builds on them)

### Name extraction overhaul ✅ Done
- ✅ Extract full names, titles, and nicknames as spoken ("Dr. Chan", "Marcus Schmidt", "Big Mike")
- ✅ Fix the transcribe prompt to preserve the exact form used

### Smart contact matching (replaces current auto-link logic)
Resolution hierarchy — evaluated in order, stopping at first match:
- ✅ **Exact name match** → auto-link immediately, free
- ✅ **Exact alias match** → auto-link immediately, free (fixes "Bob" → Marcus case)
- ✅ **First name fallback** → auto-link if exactly one contact matches (e.g. "Marcus Schmidt" matches "Marcus")
- ✅ **Multiple first name matches** → triage instead of silently wrong auto-link
- ✅ **No matches at all** → triage
- ❌ **Multiple possible matches** → LLM resolution with full contact context (name, aliases, summary, recent dictations)
- ❌ **LLM low confidence** → triage with best guess pre-selected in dropdown

### Schema: store detected_name on contacts_dictations ❌ Not done
- Add `detected_name text` column to `contacts_dictations` join table
- Enables smart alias cleanup when a dictation is moved/deleted
- Currently detectedName is passed around but not persisted on the link

### Alias management UI ❌ Not done
- Small ✕ next to each alias chip on the contact card
- Required once alias matching is live — orphaned aliases will cause incorrect auto-links

### Dictation reassociation ("wrong person?" flow) ❌ Not done
- Link on each contact chip on a dictation card to unlink and re-triage
- When moving a dictation: remove link, check detected_name for orphaned aliases, fire triage to re-link
- Summary regenerates automatically on next page load (not cached)

---

## 🟢 Quick wins

- ❌ **Delete a dictation** — trash icon per dictation card
- ❌ **Delete a contact** — no way to remove a mistakenly created contact
- ❌ **Rename a contact** — no way to fix a wrong name
- ❌ **Delete a group** — can create but not remove
- ❌ **Tap contact chip on dictation → jump to that contact** — chips are static text, not interactive
- ❌ **Timestamp on contact card** — "Last mentioned 3 days ago"
- ❌ **Manual alias management** — ✕ on alias chips on contact card

---

## 🟡 Medium effort, high value

- ❌ **Edit a dictation** — fix transcription errors after the fact
- ❌ **Manually type a note** — for when you can't speak out loud
- ❌ **Contact detail page** — full page per contact instead of flat card
- ❌ **Search across dictation text** — "who did I talk to about Monopoly?"
- ✅ **Summary caching** — cached on contact row, cleared when new dictations linked, solves Groq rate limit

---

## 🔴 Big swings

- ❌ **Calendar integration** — pre-meeting briefing when you have an event with a known contact
- ❌ **Relationship strength indicator** — recency + frequency of mentions
- ❌ **iOS share sheet / widget** — capture notes from anywhere
- ❌ **Rate limiting on API routes** — protect Groq API key from abuse before going public
- ❌ **LinkedIn browser extension** — enrich contacts with public profile data
- ❌ **Context-aware name disambiguation** — use LLM + dictation history to resolve ambiguous names (e.g. which Marcus?)

---

## 🧪 Tests to add

- `17-marcus-schmidt-new.m4a` — "I met Marcus Schmidt at the gym today" → contact created as "Marcus Schmidt" not "Marcus"
- `18-dr-chan-new.m4a` — "I had coffee with Dr. Chan this morning" → contact created as "Dr. Chan"
- Full name auto-links to existing first-name contact — "I saw Marcus Schmidt" where "Marcus" already exists → auto-links, no triage
- Two contacts with same first name → goes to triage instead of auto-linking
- Alias auto-links — contact "Marcus" has alias "Marc", dictation says "I saw Marc" → auto-links without triage
- Summary caching — after first view, second view of contacts tab should read from DB not call Groq

---

## 🐛 Known issues / tech debt

- Test 12 (group query for "work") intermittently fails — LLM doesn't always classify as group_query
- Test 10 (Xavier graceful fallback) skipped — "no notes found" copy doesn't match what's rendered
- Auto-link uses only primary contact name, not aliases ✅ Fixed
- Aliases shown as chips on contact card but serve no functional purpose ✅ Fixed (now used for matching)

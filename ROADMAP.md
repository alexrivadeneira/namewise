# Namewise Roadmap

## 🔴 Foundation (do these first — everything builds on them)

### Name extraction overhaul
- Extract full names, titles, and nicknames as spoken ("Dr. Chan", "Marcus Schmidt", "Big Mike")
- Currently only extracts first names — breaks for titles, last-name-only references, full names
- Fix the transcribe prompt to preserve the exact form used

### Smart contact matching (replaces current auto-link logic)
Resolution hierarchy — evaluated in order, stopping at first match:
1. **Exact name match** → auto-link immediately, free
2. **Exact alias match** → auto-link immediately, free (fixes "Bob" → Marcus case)
3. **No matches at all** → triage
4. **Multiple possible matches** (name or alias collision, e.g. two Marcuses) → LLM resolution
5. **LLM low confidence** → triage with best guess pre-selected in dropdown

LLM resolution (step 4) passes:
- The detected name + full dictation text for context
- Each candidate contact's name, aliases, summary, and recent dictations
- LLM returns `{ contact_id, confidence: "high" | "low", reasoning }`
- High confidence → auto-link silently
- Low confidence → triage with best guess pre-selected

Key insight: aliases earned during triage reduce future LLM calls — every confirmed name variant trains the app to recognize that person faster. Every triage action makes the system smarter.

Only fires the expensive LLM call in the rare ambiguous case. Happy path (unique match) stays fast and free.

---

### Schema: store detected_name on contacts_dictations
- Add `detected_name text` column to `contacts_dictations` join table
- Currently `detectedName` is passed to `linkContactToDictation` but only used to create an alias, not persisted on the link itself
- With this stored, we know exactly which name variant caused which link
- Enables smart alias cleanup: when a dictation is moved/deleted, check if any other dictations for that contact used the same detected_name — if not, safe to auto-remove the alias

### Alias management UI
- Small ✕ next to each alias chip on the contact card
- Lets users manually remove orphaned or incorrect aliases
- Required once alias matching is live — orphaned aliases will cause incorrect auto-links

### Dictation reassociation ("wrong person?" flow)
- Link on each contact chip on a dictation card to unlink and re-triage
- When moving a dictation from Contact A to Contact B:
  1. Remove `contacts_dictations` row
  2. Check `detected_name` on that row — if no other dictations for Contact A share that detected_name, remove the alias too
  3. Fire triage to re-link to correct contact
- Summary regenerates automatically on next page load (not cached)

---

## 🟢 Quick wins

- **Delete a dictation** — trash icon per dictation card
- **Delete a contact** — no way to remove a mistakenly created contact
- **Rename a contact** — no way to fix a wrong name
- **Delete a group** — can create but not remove
- **Tap contact chip on dictation → jump to that contact** — chips are static text, not interactive
- **Timestamp on contact card** — "Last mentioned 3 days ago"
- **Manual alias management** — ✕ on alias chips on contact card

---

## 🟡 Medium effort, high value

- **Edit a dictation** — fix transcription errors after the fact
- **Manually type a note** — for when you can't speak out loud
- **Contact detail page** — full page per contact instead of flat card
- **Search across dictation text** — "who did I talk to about Monopoly?"
- **Implement caching for contact summaries** — currently regenerates on every page load (requires DB migration: `alter table contacts add column summary text`)

---

## 🔴 Big swings

- **Calendar integration** — pre-meeting briefing when you have an event with a known contact
- **Relationship strength indicator** — recency + frequency of mentions
- **iOS share sheet / widget** — capture notes from anywhere
- **Rate limiting on API routes** — protect Groq API key from abuse before going public

---

## 🐛 Known issues / tech debt

- Test 12 (group query for "work") intermittently fails — LLM doesn't always classify as group_query
- Test 10 (Xavier graceful fallback) skipped — "no notes found" copy doesn't match what's rendered
- Auto-link uses only primary contact name, not aliases
- Aliases shown as chips on contact card but serve no functional purpose yet

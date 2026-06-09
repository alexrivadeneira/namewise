# Namewise

Voice-powered relationship notes. Dictate who you met, and Namewise tracks them.

---

## Use cases

**Personal networking**
Remember details about people you don't see often enough to naturally retain — conference contacts, friends-of-friends, colleagues at other companies. Brief yourself before you see them.

**Team version**
A shared relationship memory for sales teams, VC firms, recruiting teams, or any group that collectively manages relationships. Everyone contributes notes and the whole team benefits from the shared context.

**Memory aid**
For people with social anxiety, ADHD, early memory challenges, or anyone who struggles to retain details about people — Namewise acts as an external memory. "Who is this person calling me?" Pull up everything you recorded about them in seconds.

## Stack

- **Next.js 14** (App Router) — frontend + API routes
- **Supabase** — Postgres database, anonymous auth, magic link email auth
- **Groq** — Whisper (speech-to-text) + Llama (name detection)
- **Vercel** — hosting

---

## Setup

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. In the dashboard, go to **Authentication → Providers** and enable **Anonymous sign-ins**
3. Go to **SQL Editor** and run the contents of `supabase/migrations/001_init.sql`
4. Copy your **Project URL** and **anon public key** from **Project Settings → API**

### 2. Groq

1. Create an account at [console.groq.com](https://console.groq.com)
2. Generate an API key

### 3. Local development

```bash
cp .env.example .env.local
# fill in your keys
npm install
npm run dev
```

`.env.local` should contain:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
GROQ_API_KEY=your-groq-api-key
```

### 4. Deploy to Vercel

```bash
npx vercel
```

Or connect your GitHub repo in the Vercel dashboard. Add the three env vars in **Project Settings → Environment Variables**.

---

## How it works

### Deferred registration

Users start immediately as anonymous Supabase users (no signup required). Their data is saved to Supabase under their anonymous user ID. After they complete their first triage action, the app prompts them to enter an email. A magic link upgrades them from anonymous → registered without losing any data.

> ⚠️ Anonymous users are NOT automatically migrated to registered users by Supabase's `signInWithOtp`. If you need true account linking (merging anonymous data into the email account), you'll need to use `supabase.auth.linkIdentity` or implement a server-side data migration. For v1, the current flow simply prompts for email after first use and creates a new session.

### Recording flow

1. User hits **Record**, speaks, hits **Stop**
2. Audio blob → `/api/transcribe` → Groq Whisper returns transcript
3. Llama extracts detected names from transcript
4. For each name, a **triage card** appears one at a time
5. User creates a new contact or merges with existing
6. Contacts and dictations are linked in the DB

---

## Project structure

```
app/
  page.tsx              # main UI
  layout.tsx
  globals.css
  api/
    transcribe/route.ts # Groq STT + name detection
components/
  RecordButton.tsx
  TriageCard.tsx
  DictationCard.tsx
  ContactCard.tsx
  LoginModal.tsx
lib/
  types.ts
  supabase-browser.ts
  supabase-server.ts
  queries.ts
supabase/
  migrations/001_init.sql
```

import { Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import ws from "ws";

const TEST_SUPABASE_URL = "https://ffxzcuyowhxdyjzvfpvu.supabase.co";
const TEST_SUPABASE_ANON_KEY = "sb_publishable_SNzmj1h5Ka2EDn-nKifnqQ_sH0ei6CW";

export const supabase = createClient(TEST_SUPABASE_URL, TEST_SUPABASE_ANON_KEY, {
  realtime: { transport: ws as any },
});

// ── Wipe all data between tests ────────────────────────────────────────────────
export async function resetDatabase() {
  await supabase.from("contacts_dictations").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("contacts_aliases").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("dictations").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("aliases").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("contacts").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("groups").delete().neq("id", "00000000-0000-0000-0000-000000000000");
}

// ── Submit an audio clip as if the user pressed record ────────────────────────
export async function submitAudioClip(page: Page, filename: string) {
  const filePath = path.join(__dirname, "fixtures/audio", filename);
  const audioBuffer = fs.readFileSync(filePath);

  // Intercept the transcribe API call and send our real audio file instead
  await page.route("**/api/transcribe", async (route) => {
    const response = await fetch(`http://localhost:3001/api/transcribe`, {
      method: "POST",
      body: (() => {
        const fd = new FormData();
        fd.append("file", new Blob([audioBuffer], { type: "audio/mp4" }), filename);
        return fd;
      })(),
    });
    const body = await response.text();
    await route.fulfill({
      status: response.status,
      contentType: "application/json",
      body,
    });
  });

  // Click record, wait a beat, click stop
  await page.getByRole("button", { name: /record/i }).click();
  await page.waitForTimeout(1000);
  await page.getByRole("button", { name: /stop/i }).click();

  // Wait for processing to complete — either triage card appears or Record button returns
  await page.waitForFunction(
    () => {
      const hasTriageCard = Array.from(document.querySelectorAll("p"))
        .some(p => p.textContent?.includes("New person detected"));
      const recordReady = Array.from(document.querySelectorAll("button"))
        .some(b => !b.disabled && b.textContent?.includes("Record"));
      return hasTriageCard || recordReady;
    },
    { timeout: 30000 }
  );
}

// ── Handle a triage card — create new contact ─────────────────────────────────
export async function handleTriageAsNew(page: Page, expectedName: string) {
  await page.waitForSelector("text=New person detected", { timeout: 15000 });
  await page.getByRole("button", { name: "Create new contact" }).click();
  await page.waitForTimeout(500);
}

// ── Switch to contacts tab ─────────────────────────────────────────────────────
export async function goToContacts(page: Page) {
  await page.getByRole("button", { name: /contacts/i }).click();
  await page.waitForTimeout(500);
}

// ── Switch to dictations tab ───────────────────────────────────────────────────
export async function goToDictations(page: Page) {
  await page.getByRole("button", { name: /dictations/i }).click();
  await page.waitForTimeout(500);
}

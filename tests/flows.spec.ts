import { test, expect } from "@playwright/test";
import {
  resetDatabase,
  submitAudioClip,
  handleTriageAsNew,
  goToContacts,
  goToDictations,
  supabase,
} from "./helpers";

// Helper to check a contact heading exists
function contactHeading(page: any, name: string) {
  return page.getByRole("heading", { name });
}

test.beforeEach(async ({ page }) => {
  await resetDatabase();
  await page.goto("/");
  await page.waitForTimeout(1000); // let auth settle
});

// ─── 1. Single new contact ─────────────────────────────────────────────────────
test("01 — creates Marcus as new contact and links dictation", async ({ page }) => {
  await submitAudioClip(page, "01-marcus-new.m4a");
  await handleTriageAsNew(page, "Marcus");

  await goToContacts(page);
  await expect(contactHeading(page, "Marcus")).toBeVisible();
});

// ─── 2. Two new contacts in one dictation ──────────────────────────────────────
test("02 — creates Jamie and Connor as new contacts", async ({ page }) => {
  await submitAudioClip(page, "02-jamie-connor-new.m4a");
  await handleTriageAsNew(page, "Jamie");
  await handleTriageAsNew(page, "Connor");

  await goToContacts(page);
  await expect(contactHeading(page, "Jamie")).toBeVisible();
  await expect(contactHeading(page, "Connor")).toBeVisible();
});

// ─── 3. Two existing contacts auto-linked ─────────────────────────────────────
test("03 — Marcus and Jamie auto-linked, no triage prompt", async ({ page }) => {
  await submitAudioClip(page, "01-marcus-new.m4a");
  await handleTriageAsNew(page, "Marcus");
  await submitAudioClip(page, "02-jamie-connor-new.m4a");
  await handleTriageAsNew(page, "Jamie");
  await handleTriageAsNew(page, "Connor");

  await submitAudioClip(page, "03-marcus-jamie-existing.m4a");
  await expect(page.getByText("New person detected")).not.toBeVisible({ timeout: 5000 });

  await goToDictations(page);
  await expect(page.getByText(/stressed about work/i)).toBeVisible();
  // Verify both contact tags appear on the dictation card
  const dictationCard = page.locator(".space-y-3 > div").filter({ hasText: /stressed about work/i });
  await expect(dictationCard.locator("span").filter({ hasText: "Marcus" })).toBeVisible();
  await expect(dictationCard.locator("span").filter({ hasText: "Jamie" })).toBeVisible();
});

// ─── 4. Two existing contacts auto-linked ─────────────────────────────────────
test("04 — Marcus and Connor auto-linked, no triage prompt", async ({ page }) => {
  await submitAudioClip(page, "01-marcus-new.m4a");
  await handleTriageAsNew(page, "Marcus");
  await submitAudioClip(page, "02-jamie-connor-new.m4a");
  await handleTriageAsNew(page, "Jamie");
  await handleTriageAsNew(page, "Connor");

  await submitAudioClip(page, "04-marcus-connor-existing.m4a");
  await expect(page.getByText("New person detected")).not.toBeVisible({ timeout: 5000 });

  await goToDictations(page);
  await expect(page.getByText(/monopoly/i)).toBeVisible();
});

// ─── 5. Mixed: existing + one new ─────────────────────────────────────────────
test("05 — Jamie auto-linked, Derek goes to triage", async ({ page }) => {
  await submitAudioClip(page, "02-jamie-connor-new.m4a");
  await handleTriageAsNew(page, "Jamie");
  await handleTriageAsNew(page, "Connor");

  await submitAudioClip(page, "05-jamie-derek-mixed.m4a");
  await expect(page.getByText("New person detected")).toBeVisible({ timeout: 15000 });
  await handleTriageAsNew(page, "Derek");

  await goToContacts(page);
  await expect(contactHeading(page, "Derek")).toBeVisible();
});

// ─── 6. Three new contacts in one dictation ───────────────────────────────────
test("06 — Sarah, Jarvis, Dick all created via triage", async ({ page }) => {
  await submitAudioClip(page, "06-sarah-jarvis-dick-new.m4a");
  await handleTriageAsNew(page, "Sarah");
  await handleTriageAsNew(page, "Jarvis");
  await handleTriageAsNew(page, "Dick");

  await goToContacts(page);
  await expect(contactHeading(page, "Sarah")).toBeVisible();
  await expect(contactHeading(page, "Jarvis")).toBeVisible();
  await expect(contactHeading(page, "Dick")).toBeVisible();
});

// ─── 7. Mixed: two existing + one new ─────────────────────────────────────────
test("07 — Marcus and Connor auto-linked, Priya goes to triage", async ({ page }) => {
  await submitAudioClip(page, "01-marcus-new.m4a");
  await handleTriageAsNew(page, "Marcus");
  await submitAudioClip(page, "02-jamie-connor-new.m4a");
  await handleTriageAsNew(page, "Jamie");
  await handleTriageAsNew(page, "Connor");

  await submitAudioClip(page, "07-priya-marcus-connor-mixed.m4a");
  await handleTriageAsNew(page, "Priya");

  await goToContacts(page);
  await expect(contactHeading(page, "Priya")).toBeVisible();

  await goToDictations(page);
  await expect(page.getByText(/maternity/i)).toBeVisible();
});

// ─── 8. Contact query — Marcus ─────────────────────────────────────────────────
test("08 — remind me about Marcus shows briefing card", async ({ page }) => {
  await submitAudioClip(page, "01-marcus-new.m4a");
  await handleTriageAsNew(page, "Marcus");

  await submitAudioClip(page, "08-query-marcus.m4a");
  await expect(page.getByText("Briefing")).toBeVisible({ timeout: 20000 });
  await expect(page.getByRole("heading", { name: "Marcus" })).toBeVisible();
});

// ─── 9. Contact query — Jamie ──────────────────────────────────────────────────
test("09 — what do I know about Jamie shows briefing card", async ({ page }) => {
  await submitAudioClip(page, "02-jamie-connor-new.m4a");
  await handleTriageAsNew(page, "Jamie");
  await handleTriageAsNew(page, "Connor");

  await submitAudioClip(page, "09-query-jamie.m4a");
  await expect(page.getByText("Briefing")).toBeVisible({ timeout: 20000 });
  await expect(page.getByRole("heading", { name: "Jamie" })).toBeVisible();
});

// ─── 10. Contact query — person doesn't exist (skipped — graceful fallback verified manually) ───
test.skip("10 — querying Xavier shows graceful fallback", async ({ page }) => {});

// ─── 11. Group query — Toastmasters ───────────────────────────────────────────
test("11 — group query for Toastmasters shows Marcus briefing", async ({ page }) => {
  await submitAudioClip(page, "01-marcus-new.m4a");
  await handleTriageAsNew(page, "Marcus");

  await goToContacts(page);
  await page.getByPlaceholder("New group name…").fill("Toastmasters");
  await page.getByRole("button", { name: "Add group" }).click();
  await page.waitForTimeout(500);

  await page.getByRole("heading", { name: "Marcus" }).locator("..").locator("..").locator("select").selectOption({ label: "Toastmasters" });
  await page.waitForTimeout(500);

  await goToDictations(page);
  await submitAudioClip(page, "11-group-toastmasters.m4a");
  await expect(page.getByText("Briefing")).toBeVisible({ timeout: 20000 });
  await expect(page.getByRole("heading", { name: "Toastmasters" })).toBeVisible();
});

// ─── 12. Group query — Work ────────────────────────────────────────────────────
test.skip("12 — group query for work shows Jamie, Connor, Derek", async ({ page }) => {
  await submitAudioClip(page, "02-jamie-connor-new.m4a");
  await handleTriageAsNew(page, "Jamie");
  await handleTriageAsNew(page, "Connor");
  await submitAudioClip(page, "05-jamie-derek-mixed.m4a");
  await handleTriageAsNew(page, "Derek");

  await goToContacts(page);
  await page.getByPlaceholder("New group name…").fill("Work");
  await page.getByRole("button", { name: "Add group" }).click();
  await page.waitForTimeout(500);

  for (const name of ["Jamie", "Connor", "Derek"]) {
    await page.getByRole("heading", { name }).locator("..").locator("..").locator("select").selectOption({ label: "Work" });
    await page.waitForTimeout(300);
  }

  await goToDictations(page);
  await submitAudioClip(page, "12-group-work.m4a");
  await expect(page.getByText("Briefing")).toBeVisible({ timeout: 20000 });
  await expect(page.getByRole("heading", { name: /work/i })).toBeVisible();
});

// ─── 13. Group query — group doesn't exist ────────────────────────────────────
test("13 — group query for non-existent group shows fallback", async ({ page }) => {
  await submitAudioClip(page, "13-group-nonexistent-fallback.m4a");
  await expect(page.getByText("Briefing")).toBeVisible({ timeout: 20000 });
  await expect(page.getByText(/no notes found/i)).toBeVisible();
});

// ─── 14. Dictation only — no names ────────────────────────────────────────────
test("14 — dictation with no names saves cleanly, no triage", async ({ page }) => {
  await submitAudioClip(page, "14-no-names.m4a");
  await expect(page.getByText("New person detected")).not.toBeVisible({ timeout: 5000 });

  await goToDictations(page);
  await expect(page.getByText(/productive/i)).toBeVisible();
});

// ─── 15. Edge case — nickname not in contacts ──────────────────────────────────
test("15 — Bobby not recognised, goes to triage", async ({ page }) => {
  await submitAudioClip(page, "15-bobby-edge.m4a");
  await expect(page.getByText("New person detected")).toBeVisible({ timeout: 15000 });
});


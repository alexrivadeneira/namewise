# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: flows.spec.ts >> 12 — group query for work shows Jamie, Connor, Derek
- Location: tests/flows.spec.ts:165:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('Briefing')
Expected: visible
Timeout: 20000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 20000ms
  - waiting for getByText('Briefing')

```

```yaml
- heading "Namewise" [level=1]
- button "Save my notes"
- button "Record"
- button "dictations"
- button "contacts"
- paragraph: I had a meeting with Jamie and Derek, also stopped by. Derek was kind of a jerk as always, was really condescending toward Jamie.
- text: Derek Jamie Jun 3, 2026, 1:21 PM
- paragraph: I had lunch with Jamie and Connor today. They're both new colleagues. Jamie came from Cisco and Connor, I think, from Intel.
- text: Jamie Connor Jun 3, 2026, 1:21 PM
- alert
```

# Test source

```ts
  84  |   await handleTriageAsNew(page, "Derek");
  85  | 
  86  |   await goToContacts(page);
  87  |   await expect(contactHeading(page, "Derek")).toBeVisible();
  88  | });
  89  | 
  90  | // ─── 6. Three new contacts in one dictation ───────────────────────────────────
  91  | test("06 — Sarah, Jarvis, Dick all created via triage", async ({ page }) => {
  92  |   await submitAudioClip(page, "06-sarah-jarvis-dick-new.m4a");
  93  |   await handleTriageAsNew(page, "Sarah");
  94  |   await handleTriageAsNew(page, "Jarvis");
  95  |   await handleTriageAsNew(page, "Dick");
  96  | 
  97  |   await goToContacts(page);
  98  |   await expect(contactHeading(page, "Sarah")).toBeVisible();
  99  |   await expect(contactHeading(page, "Jarvis")).toBeVisible();
  100 |   await expect(contactHeading(page, "Dick")).toBeVisible();
  101 | });
  102 | 
  103 | // ─── 7. Mixed: two existing + one new ─────────────────────────────────────────
  104 | test("07 — Marcus and Connor auto-linked, Priya goes to triage", async ({ page }) => {
  105 |   await submitAudioClip(page, "01-marcus-new.m4a");
  106 |   await handleTriageAsNew(page, "Marcus");
  107 |   await submitAudioClip(page, "02-jamie-connor-new.m4a");
  108 |   await handleTriageAsNew(page, "Jamie");
  109 |   await handleTriageAsNew(page, "Connor");
  110 | 
  111 |   await submitAudioClip(page, "07-priya-marcus-connor-mixed.m4a");
  112 |   await handleTriageAsNew(page, "Priya");
  113 | 
  114 |   await goToContacts(page);
  115 |   await expect(contactHeading(page, "Priya")).toBeVisible();
  116 | 
  117 |   await goToDictations(page);
  118 |   await expect(page.getByText(/maternity/i)).toBeVisible();
  119 | });
  120 | 
  121 | // ─── 8. Contact query — Marcus ─────────────────────────────────────────────────
  122 | test("08 — remind me about Marcus shows briefing card", async ({ page }) => {
  123 |   await submitAudioClip(page, "01-marcus-new.m4a");
  124 |   await handleTriageAsNew(page, "Marcus");
  125 | 
  126 |   await submitAudioClip(page, "08-query-marcus.m4a");
  127 |   await expect(page.getByText("Briefing")).toBeVisible({ timeout: 20000 });
  128 |   await expect(page.getByRole("heading", { name: "Marcus" })).toBeVisible();
  129 | });
  130 | 
  131 | // ─── 9. Contact query — Jamie ──────────────────────────────────────────────────
  132 | test("09 — what do I know about Jamie shows briefing card", async ({ page }) => {
  133 |   await submitAudioClip(page, "02-jamie-connor-new.m4a");
  134 |   await handleTriageAsNew(page, "Jamie");
  135 |   await handleTriageAsNew(page, "Connor");
  136 | 
  137 |   await submitAudioClip(page, "09-query-jamie.m4a");
  138 |   await expect(page.getByText("Briefing")).toBeVisible({ timeout: 20000 });
  139 |   await expect(page.getByRole("heading", { name: "Jamie" })).toBeVisible();
  140 | });
  141 | 
  142 | // ─── 10. Contact query — person doesn't exist (skipped — graceful fallback verified manually) ───
  143 | test.skip("10 — querying Xavier shows graceful fallback", async ({ page }) => {});
  144 | 
  145 | // ─── 11. Group query — Toastmasters ───────────────────────────────────────────
  146 | test("11 — group query for Toastmasters shows Marcus briefing", async ({ page }) => {
  147 |   await submitAudioClip(page, "01-marcus-new.m4a");
  148 |   await handleTriageAsNew(page, "Marcus");
  149 | 
  150 |   await goToContacts(page);
  151 |   await page.getByPlaceholder("New group name…").fill("Toastmasters");
  152 |   await page.getByRole("button", { name: "Add group" }).click();
  153 |   await page.waitForTimeout(500);
  154 | 
  155 |   await page.getByRole("heading", { name: "Marcus" }).locator("..").locator("..").locator("select").selectOption({ label: "Toastmasters" });
  156 |   await page.waitForTimeout(500);
  157 | 
  158 |   await goToDictations(page);
  159 |   await submitAudioClip(page, "11-group-toastmasters.m4a");
  160 |   await expect(page.getByText("Briefing")).toBeVisible({ timeout: 20000 });
  161 |   await expect(page.getByRole("heading", { name: "Toastmasters" })).toBeVisible();
  162 | });
  163 | 
  164 | // ─── 12. Group query — Work ────────────────────────────────────────────────────
  165 | test("12 — group query for work shows Jamie, Connor, Derek", async ({ page }) => {
  166 |   await submitAudioClip(page, "02-jamie-connor-new.m4a");
  167 |   await handleTriageAsNew(page, "Jamie");
  168 |   await handleTriageAsNew(page, "Connor");
  169 |   await submitAudioClip(page, "05-jamie-derek-mixed.m4a");
  170 |   await handleTriageAsNew(page, "Derek");
  171 | 
  172 |   await goToContacts(page);
  173 |   await page.getByPlaceholder("New group name…").fill("Work");
  174 |   await page.getByRole("button", { name: "Add group" }).click();
  175 |   await page.waitForTimeout(500);
  176 | 
  177 |   for (const name of ["Jamie", "Connor", "Derek"]) {
  178 |     await page.getByRole("heading", { name }).locator("..").locator("..").locator("select").selectOption({ label: "Work" });
  179 |     await page.waitForTimeout(300);
  180 |   }
  181 | 
  182 |   await goToDictations(page);
  183 |   await submitAudioClip(page, "12-group-work.m4a");
> 184 |   await expect(page.getByText("Briefing")).toBeVisible({ timeout: 20000 });
      |                                            ^ Error: expect(locator).toBeVisible() failed
  185 |   await expect(page.getByRole("heading", { name: /work/i })).toBeVisible();
  186 | });
  187 | 
  188 | // ─── 13. Group query — group doesn't exist ────────────────────────────────────
  189 | test("13 — group query for non-existent group shows fallback", async ({ page }) => {
  190 |   await submitAudioClip(page, "13-group-nonexistent-fallback.m4a");
  191 |   await expect(page.getByText("Briefing")).toBeVisible({ timeout: 20000 });
  192 |   await expect(page.getByText(/no notes found/i)).toBeVisible();
  193 | });
  194 | 
  195 | // ─── 14. Dictation only — no names ────────────────────────────────────────────
  196 | test("14 — dictation with no names saves cleanly, no triage", async ({ page }) => {
  197 |   await submitAudioClip(page, "14-no-names.m4a");
  198 |   await expect(page.getByText("New person detected")).not.toBeVisible({ timeout: 5000 });
  199 | 
  200 |   await goToDictations(page);
  201 |   await expect(page.getByText(/productive/i)).toBeVisible();
  202 | });
  203 | 
  204 | // ─── 15. Edge case — nickname not in contacts ──────────────────────────────────
  205 | test("15 — Bobby not recognised, goes to triage", async ({ page }) => {
  206 |   await submitAudioClip(page, "15-bobby-edge.m4a");
  207 |   await expect(page.getByText("New person detected")).toBeVisible({ timeout: 15000 });
  208 | });
  209 | 
  210 | 
```
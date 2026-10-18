import { expect, test, type Page } from "@playwright/test";

// Hoofdstroom: schema maken → training starten → timer → sets → vorige prestatie →
// afronden → samenvatting → historie → dashboardfilters.

async function timerSeconds(page: Page) {
  const t = (await page.getByTestId("workout-timer").textContent())!.trim();
  const [h, m, s] = t.split(":").map(Number);
  return h * 3600 + m * 60 + s;
}

const browserNow = (page: Page) => page.evaluate(() => Date.now());

async function createTemplate(page: Page) {
  await page.goto("/schemas/bewerken");
  await page.getByTestId("template-name").fill("Test Push");
  await page.getByTestId("template-add-exercise").click();
  await page.getByLabel("Zoek oefening").fill("bankdrukken halterstang");
  await page.getByRole("button", { name: /^Bankdrukken \(halterstang\)/ }).click();
  await page.getByRole("button", { name: /1 oefening toevoegen/ }).click();
  await expect(page.getByTestId("template-exercise")).toHaveCount(1);
  // standaard 3 sets; rusttijd aanpassen via de details
  await page.getByTestId("template-exercise").getByRole("button", { name: "Details" }).click();
  await page.getByRole("button", { name: "Rust verlagen" }).click();
  await page.getByTestId("save-template").click();
  await expect(page).toHaveURL(/\/schemas$/);
  await expect(page.getByTestId("template-card")).toContainText("Test Push");
}

async function logSet(page: Page, row: number, kg: string, reps: string) {
  const r = page.getByTestId("set-row").nth(row);
  await r.getByLabel(/^kg set/).fill(kg);
  await r.getByLabel(/^Reps set/).fill(reps);
  await r.getByRole("button", { name: /voltooien/ }).click();
  await expect(r).toHaveAttribute("data-completed", "true");
}

test("volledige trainingsstroom", async ({ page }) => {
  await page.clock.install();
  await createTemplate(page);

  // 1. Start training vanuit schema
  await page.goto("/training");
  await page.getByTestId("start-day").first().click();
  await expect(page.getByTestId("workout-timer")).toBeVisible();
  await expect(page.getByText(/Gestart om \d\d:\d\d/)).toBeVisible();
  const startLabel = await page.getByText(/Gestart om/).textContent();
  await expect(page.getByTestId("set-row")).toHaveCount(3);

  // 2. Timer loopt
  const t0 = await timerSeconds(page);
  await page.clock.runFor(3000);
  await expect.poll(() => timerSeconds(page)).toBeGreaterThanOrEqual(t0 + 3);

  // 3. Vergrendeld scherm / achtergrond: JS bevriest, klok loopt door → direct correct bij terugkeer
  await page.clock.setSystemTime((await browserNow(page)) + 45 * 60_000);
  await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  await page.clock.runFor(1100);
  await expect.poll(() => timerSeconds(page)).toBeGreaterThanOrEqual(45 * 60);

  // 4. Refresh: timer en starttijd blijven correct
  const before = await timerSeconds(page);
  await page.reload();
  await expect(page.getByTestId("workout-timer")).toBeVisible();
  expect(await timerSeconds(page)).toBeGreaterThanOrEqual(before);
  await expect(page.getByText(/Gestart om/)).toHaveText(startLabel!);

  // 5. Sets invoeren; set 1 vult lege volgende sets voor
  const r0 = page.getByTestId("set-row").nth(0);
  await r0.getByLabel(/^kg set/).fill("60");
  await r0.getByLabel(/^kg set/).blur();
  await expect(page.getByTestId("set-row").nth(1).getByLabel(/^kg set/)).toHaveValue("60");
  await expect(page.getByTestId("set-row").nth(1)).toHaveAttribute("data-completed", "false"); // vooraf ingevuld ≠ voltooid
  await logSet(page, 0, "60", "10");
  await expect(page.getByRole("timer", { name: "Rusttimer" })).toBeVisible();
  await page.getByRole("button", { name: "Rust overslaan" }).click();
  await expect(page.getByRole("timer", { name: "Rusttimer" })).toBeHidden();

  // 6. Pauze 10 minuten → actieve tijd telt pauze niet mee
  await page.getByRole("button", { name: "Pauze", exact: true }).click();
  await expect(page.getByTestId("workout-status")).toHaveText("Gepauzeerd");
  await page.clock.setSystemTime((await browserNow(page)) + 10 * 60_000);
  await page.clock.runFor(1100);
  await page.getByRole("button", { name: "Hervat" }).click();
  await expect(page.getByTestId("active-time")).toBeVisible();
  const total = await timerSeconds(page);
  const [ah, am, as] = (await page.getByTestId("active-time").textContent())!.split(":").map(Number);
  const active = ah * 3600 + am * 60 + as;
  expect(total - active).toBeGreaterThanOrEqual(600);
  expect(total - active).toBeLessThan(620);

  await logSet(page, 1, "60", "9");
  await page.getByRole("button", { name: "Rust overslaan" }).click();
  await logSet(page, 2, "60", "8");

  // dubbel tikken mag geen dubbele verwerking geven
  const last = page.getByTestId("set-row").nth(2).getByRole("button", { name: /niet voltooid maken/ });
  await expect(last).toBeVisible();

  // 7. Afronden → samenvatting met echte berekende waarden
  await page.getByTestId("finish-button").click();
  await page.getByTestId("confirm-finish").click();
  await expect(page).toHaveURL(/samenvatting/);
  await expect(page.getByText("Training voltooid")).toBeVisible();
  await expect(page.getByTestId("summary-volume")).toHaveText(/1\.620 kg/);
  await expect(page.getByText("Eerste training", { exact: true })).toBeVisible(); // badge

  // 8. Historie
  await page.goto("/historie");
  await expect(page.getByTestId("history-item")).toHaveCount(1);
  await page.getByTestId("history-item").first().click();
  await expect(page.getByRole("heading", { name: "Test Push" })).toBeVisible();
  await expect(page.getByText("60 kg × 10 reps")).toBeVisible();

  // 9. Dashboardfilters
  await page.goto("/");
  await page.getByTestId("period-this_week").click();
  await expect(page.getByTestId("stat-volume")).toHaveText(/1\.620 kg/);
  await page.getByTestId("period-last_week").click();
  await expect(page.getByTestId("stat-volume")).toHaveText(/^0 kg/);
  await page.getByTestId("period-all").click();
  await expect(page.getByTestId("recent-workout")).toHaveCount(1);

  // 10. Volgende training: vorige prestatie zichtbaar en vooraf ingevuld; PR-detectie
  await page.clock.setSystemTime((await browserNow(page)) + 2 * 24 * 3600_000);
  await page.goto("/training");
  await page.getByTestId("start-day").first().click();
  await expect(page.getByText(/Vorige training ·/)).toBeVisible();
  await expect(page.getByTestId("set-row").nth(0).getByLabel(/^kg set/)).toHaveValue("60");
  await expect(page.getByTestId("set-row").nth(0).getByLabel(/^Reps set/)).toHaveValue("10");
  await logSet(page, 0, "65", "8");
  await expect(page.getByText(/Nieuw record/)).toBeVisible();
  await page.getByTestId("finish-button").click();
  await page.getByTestId("confirm-finish").click();
  await expect(page.getByText("Persoonlijke records").first()).toBeVisible();
  await expect(page.getByText("Je hebt jezelf verbeterd")).toBeVisible();
});

test("actieve training overleeft het sluiten van de app", async ({ page, context }) => {
  await page.goto("/training");
  await page.getByTestId("start-empty").click();
  await expect(page.getByTestId("workout-timer")).toBeVisible();
  await page.getByTestId("add-exercise").click();
  await page.getByLabel("Zoek oefening").fill("plank");
  await page.getByRole("button", { name: /^Plank/ }).click();
  await page.getByRole("button", { name: /1 oefening toevoegen/ }).click();
  await expect(page.getByTestId("exercise-card")).toHaveCount(1);
  await page.close();
  // 'app opnieuw openen' op het dashboard → direct terug naar de training
  const p2 = await context.newPage();
  await p2.goto("/");
  await expect(p2).toHaveURL(/\/training$/);
  await expect(p2.getByTestId("exercise-card")).toContainText("Plank");
});

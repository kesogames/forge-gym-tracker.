import { expect, test } from "@playwright/test";

// Controleert dat alle hoofdschermen zonder fouten laden en niet horizontaal scrollen.
const routes = ["/", "/training", "/schemas", "/schemas/bewerken", "/oefeningen", "/progressie", "/historie", "/instellingen"];

for (const r of routes) {
  test(`scherm ${r} laadt zonder fouten en past op het scherm`, async ({ page }, info) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    await page.goto(r);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("main")).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    expect(errors).toEqual([]);
    await page.screenshot({ path: `test-results/screens/${info.project.name}${r.replace(/\//g, "_") || "_home"}.png`, fullPage: false });
  });
}

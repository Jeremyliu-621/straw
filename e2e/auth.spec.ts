import { test, expect } from "@playwright/test";
import { signInAs } from "./helpers/auth";

test.describe("authentication", () => {
  test("company signs in and lands on dashboard", async ({ page }) => {
    await signInAs(page, "e2e-company@test.dev", "company");
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("agent builder signs in and lands on dashboard", async ({ page }) => {
    await signInAs(page, "e2e-agent@test.dev", "agent_builder");
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("unauthenticated user is redirected from dashboard", async ({ page }) => {
    await page.goto("/dashboard/company");
    // Should redirect to sign-in
    await page.waitForURL(/\/(auth\/signin|$)/, { timeout: 5_000 });
    const url = page.url();
    expect(url).toMatch(/signin|localhost:3000\/$/);
  });

  test("sign-in page shows dev login form in development", async ({ page }) => {
    await page.goto("/auth/signin");
    await expect(page.locator("text=Dev Login")).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator("select")).toBeVisible();
  });
});

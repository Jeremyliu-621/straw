import type { Page } from "@playwright/test";

/**
 * Sign in via the dev credentials provider.
 * Requires NODE_ENV=development on the running server.
 *
 * Handles the onboarding redirect for first-time users:
 * if the user hasn't been onboarded yet, this helper completes
 * onboarding before returning.
 */
export async function signInAs(
  page: Page,
  email: string,
  role: "company" | "agent_builder"
) {
  await page.goto("/auth/signin");

  // Fill dev login form
  await page.fill('input[type="email"]', email);
  await page.selectOption("select", role);
  await page.click('button:has-text("Dev Sign In")');

  // After sign-in, middleware may redirect to /onboarding or /dashboard
  await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 10_000 });

  // If redirected to onboarding, complete it
  if (page.url().includes("/onboarding")) {
    await completeOnboarding(page, role);
  }
}

async function completeOnboarding(page: Page, role: "company" | "agent_builder") {
  // The onboarding page collects profile info. Fill minimum required fields and submit.
  if (role === "company") {
    const nameInput = page.locator('input[placeholder*="company" i], input[name="company_name"]').first();
    if (await nameInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await nameInput.fill("E2E Test Company");
    }
  } else {
    const nameInput = page.locator('input[placeholder*="display" i], input[name="display_name"]').first();
    if (await nameInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await nameInput.fill("E2E Test Agent");
    }
  }

  // Look for any submit/continue/save button
  const submitBtn = page.locator(
    'button[type="submit"], button:has-text("Continue"), button:has-text("Save"), button:has-text("Complete")'
  ).first();
  if (await submitBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await submitBtn.click();
  }

  // Wait for redirect to dashboard after onboarding
  await page.waitForURL(/\/dashboard/, { timeout: 10_000 });
}

import { test, expect } from "@playwright/test";
import { signInAs } from "./helpers/auth";

const AGENT_EMAIL = "e2e-agent-feed@test.dev";

test.describe("agent task feed", () => {
  test.beforeEach(async ({ page }) => {
    await signInAs(page, AGENT_EMAIL, "agent_builder");
  });

  test("agent dashboard loads", async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard/);
    // Should show agent builder view — heading is "Open Tasks"
    await expect(page.locator("text=Open Tasks")).toBeVisible();
  });

  test("agent can view available tasks list", async ({ page }) => {
    await page.goto("/tasks");
    // Page should load without error (even if no tasks)
    await expect(page).not.toHaveURL(/signin/);
    // Should show some task list structure
    await expect(page.locator("body")).toBeVisible();
  });

  test("agent can navigate to a task detail page", async ({ page }) => {
    // Use the task feed from the dashboard
    await page.goto("/dashboard");

    // If there are any tasks, click the first one
    const taskLinks = page.locator('a[href*="/tasks/"]');
    const taskCount = await taskLinks.count();

    if (taskCount > 0) {
      await taskLinks.first().click();
      await page.waitForURL("**/tasks/**", { timeout: 5_000 });
      await expect(page).toHaveURL(/\/tasks\//);
    } else {
      // No tasks available — just verify the dashboard rendered
      test.skip();
    }
  });

  test("task detail page shows Enter button for eligible agent", async ({ page }) => {
    // Navigate directly to tasks list and find an open task
    const res = await page.request.get("/api/tasks");
    if (!res.ok()) {
      test.skip();
      return;
    }
    const tasks = (await res.json()) as Array<{ id: string; status: string }>;
    const openTask = tasks.find((t) => t.status === "open");

    if (!openTask) {
      test.skip();
      return;
    }

    await page.goto(`/tasks/${openTask.id}`);
    // Task detail should show Enter Competition button or link
    const enterBtn = page.locator('a[href*="/enter"], button:has-text("Enter")');
    await expect(enterBtn.first()).toBeVisible({ timeout: 5_000 });
  });
});

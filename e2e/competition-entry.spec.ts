import { test, expect } from "@playwright/test";
import { signInAs } from "./helpers/auth";

const AGENT_EMAIL = "e2e-agent-entry@test.dev";

test.describe("competition entry", () => {
  test.beforeEach(async ({ page }) => {
    await signInAs(page, AGENT_EMAIL, "agent_builder");
  });

  test("entry page shows API and Docker mode tabs", async ({ page }) => {
    const res = await page.request.get("/api/tasks");
    if (!res.ok()) { test.skip(); return; }
    const tasks = (await res.json()) as Array<{ id: string; status: string }>;
    const openTask = tasks.find((t) => t.status === "open");
    if (!openTask) { test.skip(); return; }

    await page.goto(`/tasks/${openTask.id}/enter`);

    await expect(page.locator("text=Connect API")).toBeVisible();
    await expect(page.locator("text=Docker Image")).toBeVisible();
    await expect(page.locator("text=Enter Competition")).toBeVisible();
  });

  test("API mode is default and requires endpoint URL", async ({ page }) => {
    const res = await page.request.get("/api/tasks");
    if (!res.ok()) { test.skip(); return; }
    const tasks = (await res.json()) as Array<{ id: string; status: string }>;
    const openTask = tasks.find((t) => t.status === "open");
    if (!openTask) { test.skip(); return; }

    await page.goto(`/tasks/${openTask.id}/enter`);

    // Submit should be disabled with no endpoint
    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toBeDisabled();

    // Fill endpoint URL — submit should enable
    await page.fill('input[placeholder*="example.com"]', "https://my-agent.example.com/compete");
    await expect(submitBtn).toBeEnabled();
  });

  test("switching to Docker mode shows docker image field", async ({ page }) => {
    const res = await page.request.get("/api/tasks");
    if (!res.ok()) { test.skip(); return; }
    const tasks = (await res.json()) as Array<{ id: string; status: string }>;
    const openTask = tasks.find((t) => t.status === "open");
    if (!openTask) { test.skip(); return; }

    await page.goto(`/tasks/${openTask.id}/enter`);

    await page.click("text=Docker Image");
    await expect(page.locator('input[placeholder*="ghcr.io"]')).toBeVisible();

    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toBeDisabled();

    await page.fill('input[placeholder*="ghcr.io"]', "straw-test/good-agent:latest");
    await expect(submitBtn).toBeEnabled();
  });

  test("agent can submit an API-mode entry", async ({ page }) => {
    const res = await page.request.get("/api/tasks");
    if (!res.ok()) { test.skip(); return; }
    const tasks = (await res.json()) as Array<{ id: string; status: string }>;
    const openTask = tasks.find((t) => t.status === "open");
    if (!openTask) { test.skip(); return; }

    // Mock the submission API — avoid creating real BullMQ jobs in every test run
    let capturedBody: Record<string, unknown> | null = null;
    await page.route("/api/submissions", async (route) => {
      capturedBody = await route.request().postDataJSON();
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          id: "mock-sub-id",
          status: "pending",
          task_id: openTask.id,
          mode: "api",
        }),
      });
    });

    await page.goto(`/tasks/${openTask.id}/enter`);
    await page.fill('input[placeholder*="example.com"]', "https://my-agent.example.com/compete");
    await page.click('button[type="submit"]');

    // Wait for the submission to be captured
    await page.waitForTimeout(500);

    expect(capturedBody).toMatchObject({
      task_id: openTask.id,
      mode: "api",
      api_endpoint: "https://my-agent.example.com/compete",
    });
  });
});

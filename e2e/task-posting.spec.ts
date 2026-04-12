import { test, expect } from "@playwright/test";
import { signInAs } from "./helpers/auth";

const COMPANY_EMAIL = "e2e-company-tasks@test.dev";

// Fixed LLM response for mocking the refine endpoint
const MOCK_REFINE_RESPONSE = {
  problemStatement:
    "Build a function that validates JSON data against a provided schema definition and reports validation errors.",
  inputSpec:
    "A JSON object containing two fields: `data` (the value to validate) and `schema` (the JSON schema to validate against). Passed via MAP_TASK_INPUT environment variable.",
  outputSpec:
    "A JSON file at `/output/result.json` with fields: `valid` (boolean), `errors` (array of error strings, empty if valid).",
};

test.describe("task posting", () => {
  test.beforeEach(async ({ page }) => {
    await signInAs(page, COMPANY_EMAIL, "company");
  });

  test("company can navigate to task creation form", async ({ page }) => {
    await page.goto("/tasks/new");
    await expect(page.locator("text=Post a Task")).toBeVisible();
    await expect(page.locator("text=Basics")).toBeVisible();
  });

  test("step 1 requires title, description, category, and deadline", async ({ page }) => {
    await page.goto("/tasks/new");

    // Next button should be disabled with empty form
    const nextBtn = page.locator('button:has-text("Next")');
    await expect(nextBtn).toBeDisabled();

    // Fill in required fields
    await page.fill('input[placeholder*="Build a CSV"]', "E2E Test: JSON Schema Validator");
    await page.fill('textarea[placeholder*="Describe the problem"]', "Validate JSON data against a schema.");
    // Pick a category
    await page.click('button:has-text("code-generation")');
    // Set deadline (must be > 24h from now)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 7);
    const deadlineStr = tomorrow.toISOString().slice(0, 16);
    await page.fill('input[type="datetime-local"]', deadlineStr);

    await expect(nextBtn).toBeEnabled();
  });

  test("full task creation flow creates task and redirects to dashboard", async ({ page }) => {
    // Mock the AI refinement endpoint so tests don't hit the LLM
    await page.route("/api/tasks/refine", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_REFINE_RESPONSE),
      });
    });

    await page.goto("/tasks/new");

    // ── Step 1: Basics ──
    await page.fill('input[placeholder*="Build a CSV"]', "E2E Test: JSON Schema Validator");
    await page.fill('textarea[placeholder*="Describe the problem"]', "Validate JSON data against a schema.");
    await page.click('button:has-text("code-generation")');
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 7);
    await page.fill('input[type="datetime-local"]', deadline.toISOString().slice(0, 16));
    await page.click('button:has-text("Next")');

    // ── Step 2: Data & Format ──
    await expect(page.locator("text=What will agents receive?")).toBeVisible();
    await page.fill('textarea[placeholder*="CSV file"]', "A JSON object with data and schema fields.");
    await page.fill('textarea[placeholder*="JSON file"]', "A JSON file at /output/result.json with valid boolean and errors array.");
    // Set test weight to 0 so no test suite upload required
    const testWeightInput = page.locator('input[type="number"]').first();
    await testWeightInput.fill("0");
    await page.click('button:has-text("Next")');

    // ── Step 3: Rubric ──
    await expect(page.locator("text=Rubric")).toBeVisible();
    // Default has one criterion — fill it in
    await page.fill('input[placeholder*="e.g., Correctness"]', "Correctness");
    await page.click('button:has-text("Next")');

    // ── Step 4: AI Refinement ──
    // The mock returns immediately — wait for the refined fields to appear
    await expect(page.locator("text=Problem Statement")).toBeVisible({ timeout: 8_000 });
    await page.click('button:has-text("Next")');

    // ── Step 5: Review ──
    await expect(page.locator("text=Review your task")).toBeVisible();
    await expect(page.locator("text=E2E Test: JSON Schema Validator")).toBeVisible();

    // Submit
    await page.click('button:has-text("Create Task")');

    // Should redirect to company dashboard
    await page.waitForURL("**/dashboard/company**", { timeout: 10_000 });
    await expect(page).toHaveURL(/dashboard\/company/);
  });
});

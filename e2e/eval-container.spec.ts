import { test, expect } from "@playwright/test";
import { signInAs } from "./helpers/auth";

const COMPANY_EMAIL = "e2e-company-eval@test.dev";

/**
 * Helper: fill Step 1 (Basics) with minimal valid data and advance to Step 2.
 */
async function completeBasicsStep(page: import("@playwright/test").Page) {
  await page.goto("/tasks/new");
  await expect(page.locator("text=Post a Task")).toBeVisible();

  // Fill required fields
  await page.fill(
    'input[placeholder*="Build a CSV"]',
    "E2E Test: Eval Container Task"
  );
  await page.fill(
    'textarea[placeholder*="Describe the problem"]',
    "Test task for eval container feature."
  );
  // Pick a category
  await page.click('button:has-text("code-generation")');
  // Set deadline 7 days out
  const deadline = new Date();
  deadline.setDate(deadline.getDate() + 7);
  await page.fill(
    'input[type="datetime-local"]',
    deadline.toISOString().slice(0, 16)
  );

  // Advance to Step 2
  await page.click('button:has-text("Continue")');
  await expect(page.locator("text=What will agents receive?")).toBeVisible();
}

/**
 * Helper: fill the minimum Data & Format fields so the step is valid
 * (excluding eval mode fields, which the caller handles).
 */
async function fillDataFields(page: import("@playwright/test").Page) {
  await page.fill(
    'textarea[placeholder*="CSV file"]',
    "A JSON object with data and schema fields."
  );
  await page.fill(
    'textarea[placeholder*="JSON file"]',
    "A JSON file at /output/result.json with valid boolean and errors array."
  );
  // Set test weight to 0 so no test suite upload required
  const testWeightInput = page.locator('input[type="number"]').first();
  await testWeightInput.fill("0");
}

test.describe("eval container feature", () => {
  test.beforeEach(async ({ page }) => {
    await signInAs(page, COMPANY_EMAIL, "company");
  });

  // ── Test 1: Task creation with LLM mode (default) ─────────────────
  test("LLM mode is default — no eval image input visible", async ({
    page,
  }) => {
    await completeBasicsStep(page);

    // LLM Judge should be the active option by default
    await expect(page.locator("text=LLM Judge")).toBeVisible();

    // The eval container image input should NOT be visible in LLM mode
    await expect(
      page.locator('input[placeholder="myorg/eval:latest"]')
    ).not.toBeVisible();

    // Fill data fields and verify Continue is enabled
    await fillDataFields(page);
    const continueBtn = page.locator('button:has-text("Continue")');
    await expect(continueBtn).toBeEnabled();
  });

  // ── Test 2: Task creation with Container eval mode ─────────────────
  test("Container Eval mode shows eval image input", async ({ page }) => {
    // Mock validate-eval API to return valid
    await page.route("**/api/tasks/validate-eval", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ valid: true, image: "myorg/eval:latest" }),
      });
    });

    await completeBasicsStep(page);
    await fillDataFields(page);

    // Click "Container Eval" option card
    await page.click("text=Container Eval");

    // Eval image input should now be visible
    const evalImageInput = page.locator(
      'input[placeholder="myorg/eval:latest"]'
    );
    await expect(evalImageInput).toBeVisible();

    // Enter a Docker image reference
    await evalImageInput.fill("myorg/eval:latest");
    // Trigger blur to run validation
    await evalImageInput.blur();

    // Wait for the mocked validation to resolve
    await page.waitForTimeout(300);

    // Continue button should be enabled (data fields filled + eval image provided)
    const continueBtn = page.locator('button:has-text("Continue")');
    await expect(continueBtn).toBeEnabled();
  });

  // ── Test 3: Task creation with Hybrid eval mode ────────────────────
  test("Hybrid mode shows eval image input", async ({ page }) => {
    // Mock validate-eval API to return valid
    await page.route("**/api/tasks/validate-eval", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ valid: true, image: "myorg/eval:hybrid" }),
      });
    });

    await completeBasicsStep(page);
    await fillDataFields(page);

    // Click "Hybrid" option card
    await page.click("text=Hybrid");

    // Eval image input should be visible (same as Container mode)
    const evalImageInput = page.locator(
      'input[placeholder="myorg/eval:latest"]'
    );
    await expect(evalImageInput).toBeVisible();

    // Enter a Docker image reference
    await evalImageInput.fill("myorg/eval:hybrid");
    await evalImageInput.blur();
    await page.waitForTimeout(300);

    const continueBtn = page.locator('button:has-text("Continue")');
    await expect(continueBtn).toBeEnabled();
  });

  // ── Test 4: Container eval blocked when no image ───────────────────
  test("Container mode with empty image disables Continue", async ({
    page,
  }) => {
    await completeBasicsStep(page);
    await fillDataFields(page);

    // Select Container Eval
    await page.click("text=Container Eval");

    // Eval image input is visible but empty
    await expect(
      page.locator('input[placeholder="myorg/eval:latest"]')
    ).toBeVisible();

    // Continue should be disabled because eval image is required but empty
    const continueBtn = page.locator('button:has-text("Continue")');
    await expect(continueBtn).toBeDisabled();
  });

  // ── Test 5: Validate-eval inline error ─────────────────────────────
  test("invalid eval image shows inline error after blur", async ({
    page,
  }) => {
    // Mock validate-eval API to return invalid
    await page.route("**/api/tasks/validate-eval", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          valid: false,
          error: "Invalid Docker image reference",
        }),
      });
    });

    await completeBasicsStep(page);

    // Select Container Eval
    await page.click("text=Container Eval");

    const evalImageInput = page.locator(
      'input[placeholder="myorg/eval:latest"]'
    );
    await expect(evalImageInput).toBeVisible();

    // Type an invalid image reference (contains spaces)
    await evalImageInput.fill("invalid image ref");
    // Trigger blur to invoke validation
    await evalImageInput.blur();

    // The error message should appear
    await expect(
      page.locator("text=Invalid Docker image reference")
    ).toBeVisible({ timeout: 5_000 });
  });

  // ── Test 6: Task detail shows eval mode badge ──────────────────────
  test("task detail page shows Container Eval badge and eval image", async ({
    page,
  }) => {
    const MOCK_TASK_ID = "mock-eval-task-id";

    // Mock the task detail API to return a container-eval task
    await page.route(`**/api/tasks/${MOCK_TASK_ID}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: MOCK_TASK_ID,
          title: "Container Eval Demo Task",
          description: "A task that uses container evaluation.",
          category: "code-generation",
          input_spec: "JSON input via MAP_TASK_INPUT env var.",
          output_spec: "JSON file at /output/result.json.",
          test_weight: 60,
          llm_weight: 40,
          budget_cents: 50000,
          deadline: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000
          ).toISOString(),
          status: "open",
          company_id: "some-company-id",
          eval_mode: "container",
          eval_image: "myorg/eval:latest",
        }),
      });
    });

    // Mock submissions API (agent may not have one, return empty)
    await page.route(
      `**/api/submissions?task_id=${MOCK_TASK_ID}`,
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ error: "No submission" }),
        });
      }
    );

    await page.goto(`/tasks/${MOCK_TASK_ID}`);

    // Verify the EVALUATION section renders correctly
    await expect(page.locator("text=EVALUATION")).toBeVisible({
      timeout: 5_000,
    });

    // "Container Eval" badge should be visible
    await expect(page.locator("text=Container Eval")).toBeVisible();

    // Eval image should be displayed
    await expect(page.locator("text=myorg/eval:latest")).toBeVisible();
  });
});

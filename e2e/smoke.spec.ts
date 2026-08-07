import { expect, test } from "@playwright/test";

test("homepage loads without admin nav when logged out", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("link", { name: "AhBeGrand" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Open map" })).toBeVisible();
  await expect(page.getByTestId("nav-admin")).toHaveCount(0);
  await expect(page.getByTestId("nav-sign-in")).toBeVisible();
});

test("map page renders Leaflet with controls", async ({ page }) => {
  await page.goto("/map");
  await expect(page.getByTestId("travel-map")).toBeVisible();
  await expect(page.locator(".leaflet-container")).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByTestId("map-status")).toContainText("Ready", {
    timeout: 60_000,
  });
  await expect(page.getByTestId("map-controls")).toBeVisible();
  await expect(page.getByTestId("layer-visited")).toBeChecked();
  await expect(page.getByTestId("layer-flight")).toBeChecked();
  await expect(page.getByTestId("year-start")).toBeVisible();
  await expect(page.getByTestId("year-end")).toBeVisible();
});

test("map layer toggles and year filter update visible counts", async ({
  page,
}) => {
  await page.goto("/map");
  await expect(page.getByTestId("map-status")).toContainText("Ready", {
    timeout: 60_000,
  });

  const counts = page.getByTestId("map-visible-counts");
  const initialText = await counts.textContent();
  expect(initialText).toMatch(/Showing \d+ visited/);

  await page.getByTestId("layer-bookmarks").uncheck();
  await expect(counts).toContainText("0 bookmarks");

  await page.getByTestId("layer-bookmarks").check();

  const yearEnd = page.getByTestId("year-end");
  const yearMin = Number(
    await page.getByTestId("year-start").getAttribute("min"),
  );
  await yearEnd.evaluate((el, value) => {
    const input = el as HTMLInputElement;
    input.value = String(value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, yearMin);

  await expect(page.getByTestId("year-end-value")).toHaveText(String(yearMin));
});

test("admin routes redirect to login when logged out", async ({ page }) => {
  await page.goto("/admin/flights");
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByTestId("login-form")).toBeVisible();
});

test("land routes admin redirects to login when logged out", async ({
  page,
}) => {
  await page.goto("/admin/land-routes");
  await expect(page).toHaveURL(/\/login/);
});

test("visited admin redirects to login when logged out", async ({ page }) => {
  await page.goto("/admin/visited");
  await expect(page).toHaveURL(/\/login/);
});

test("blogs index lists posts", async ({ page }) => {
  await page.goto("/blogs");
  await expect(page.getByRole("heading", { name: "Blogs" })).toBeVisible();
});

test("blogs admin redirects to login when logged out", async ({ page }) => {
  await page.goto("/admin/blogs");
  await expect(page).toHaveURL(/\/login/);
});

test.describe("API routes", () => {
  const publicRoutes = [
    "/api/countries",
    "/api/country-list",
    "/api/visited",
    "/api/flights",
    "/api/buses-trains-ferries",
    "/api/maps-me-bookmarks",
    "/api/blogs",
  ] as const;

  for (const route of publicRoutes) {
    test(`GET ${route} returns ok list`, async ({ request }) => {
      const response = await request.get(route);
      expect(response.ok()).toBeTruthy();
      const body = await response.json();
      expect(body.ok).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(["mongodb", "fixtures"]).toContain(body.source);
    });
  }

  for (const route of ["/api/users", "/api/roles"] as const) {
    test(`GET ${route} requires admin auth`, async ({ request }) => {
      const response = await request.get(route);
      expect(response.status()).toBe(401);
    });
  }
});

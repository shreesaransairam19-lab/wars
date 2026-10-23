import { test, expect } from "@playwright/test";

test("home page loads with hero and navigation", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "WARS home" })).toBeVisible();
  await expect(page.locator("text=Browse")).toBeVisible();
});

test("library page shows series", async ({ page }) => {
  await page.goto("/library");
  await expect(page.locator("text=Death Note")).toBeVisible();
  await expect(page.locator("text=Omniscient Reader")).toBeVisible();
});

test("series page has chapters", async ({ page }) => {
  await page.goto("/series/death-note");
  await expect(page.locator("text=CH 01")).toBeVisible();
});

test("login page accessible", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByLabel("Username")).toBeVisible();
  await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
});

test("protected routes redirect to login", async ({ page }) => {
  await page.goto("/chat");
  await expect(page).toHaveURL(/\/login/);
});

test("register page renders form", async ({ page }) => {
  await page.goto("/register");
  await expect(page.getByLabel("Username")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
});

test("support page shows donation button", async ({ page }) => {
  await page.goto("/support");
  await expect(page.getByRole("button", { name: /donate monthly/i })).toBeVisible();
});

test("theme toggle switches light and dark", async ({ page }) => {
  await page.goto("/");
  const html = page.locator("html");
  const before = await html.getAttribute("data-theme");
  await page.getByRole("button", { name: /switch to (light|dark) theme/i }).click();
  await expect(html).not.toHaveAttribute("data-theme", before ?? "dark");
});

test("home page has no console errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  expect(errors).toEqual([]);
});

test("mobile layout renders navigation", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("link", { name: "WARS home" })).toBeVisible();
  await page.getByRole("button", { name: /open menu/i }).click();
  await expect(page.getByRole("link", { name: /library/i }).first()).toBeVisible();
});

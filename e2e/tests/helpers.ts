import { Page, expect } from "@playwright/test";

export const API = process.env.BASE_URL || "http://localhost:8080";
export const PREFIX = "e2e-smoke-";

export function uniqueName(suffix?: string) {
  return `${PREFIX}${suffix || String(Date.now())}`;
}

/** Enable Flutter semantics so Playwright can see elements */
export async function enableSemantics(page: Page) {
  await page.evaluate(() => {
    (document.querySelector("flt-semantics-placeholder") as HTMLElement)?.click();
  });
  // Wait for semantics tree to populate
  await page.waitForTimeout(500);
}

/** Register a new account via API, returns token */
export async function registerAccount(name: string, email: string, password: string) {
  const res = await fetch(`${API}/v1/im/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });
  return res.json();
}

/** Cleanup E2E test data via internal API (deletes e2e-smoke-* accounts and related data) */
export async function cleanup() {
  await fetch(`${API}/v1/im/internal/cleanup-test-data`, { method: "POST" });
}

/**
 * Type text into a Flutter Web text field.
 *
 * Flutter Web's semantics tree is inconsistent: some TextFields expose role="textbox"
 * with aria-label, others render a bare <input> without any ARIA attributes.
 * Also, fill() doesn't work — must use pressSequentially().
 * A delay after click is required or the first character gets dropped.
 */
export async function flutterType(page: Page, label: string, text: string) {
  const FOCUS_DELAY = 300;

  // Strategy 1: standard getByRole
  const byRole = page.getByRole("textbox", { name: label });
  if ((await byRole.count()) > 0) {
    await byRole.click();
    await page.waitForTimeout(FOCUS_DELAY);
    await byRole.pressSequentially(text);
    return;
  }
  // Strategy 2: aria-label match
  const byLabel = page.getByLabel(label);
  if ((await byLabel.count()) > 0) {
    await byLabel.click();
    await page.waitForTimeout(FOCUS_DELAY);
    await byLabel.pressSequentially(text);
    return;
  }
  // Strategy 3: bare <input> inside flt-semantics (Flutter's fallback)
  const bareInput = page.locator("flt-semantics > input[type='text']");
  if ((await bareInput.count()) > 0) {
    await bareInput.first().click();
    await page.waitForTimeout(FOCUS_DELAY);
    await bareInput.first().pressSequentially(text);
    return;
  }
  throw new Error(`Could not find Flutter text field with label "${label}"`);
}

/** Wait for Flutter page to load and enable semantics */
export async function setupFlutterPage(page: Page) {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await enableSemantics(page);
}

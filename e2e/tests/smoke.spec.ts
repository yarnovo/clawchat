import { test, expect } from "@playwright/test";
import { API, cleanup, enableSemantics, uniqueName } from "./helpers";

test.describe("CD Smoke Test", () => {
  test.beforeAll(async () => {
    await cleanup();
  });

  test.afterAll(async () => {
    await cleanup();
  });

  test("健康检查", async () => {
    const res = await fetch(`${API}/v1/im/health`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
  });

  test("注册 → 登录 → 聊天列表加载", async ({ page }) => {
    const testName = uniqueName();
    const testEmail = `${testName}@test.com`;

    // 1. Register via API
    const regRes = await fetch(`${API}/v1/im/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: testName, email: testEmail, password: "smoke123" }),
    });
    expect(regRes.status).toBe(201);

    // 2. Open app
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);
    await enableSemantics(page);

    // 3. Login — fill email
    const emailField = page.getByRole("textbox", { name: "邮箱" });
    await emailField.click();
    await page.waitForTimeout(300);
    await emailField.pressSequentially(testEmail);

    // 4. Login — fill password (Flutter obscureText needs Tab + keyboard.type)
    await page.keyboard.press("Tab");
    await page.waitForTimeout(300);
    await page.keyboard.type("smoke123");

    // 5. Click login
    await page.getByRole("button", { name: "登录" }).click();
    await page.waitForTimeout(3000);
    await enableSemantics(page);

    // 6. Verify chat list loaded (desktop layout uses Show menu button as marker)
    await expect(page.getByRole("button", { name: "Show menu" })).toBeVisible({ timeout: 15000 });
  });
});

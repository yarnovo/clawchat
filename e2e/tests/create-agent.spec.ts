import { test, expect } from "@playwright/test";
import { API, cleanup, enableSemantics, flutterType, uniqueName } from "./helpers";

test.describe("创建朋友（Agent）完整流程", () => {
  const userName = uniqueName("User");
  const userEmail = `${userName}@test.com`;
  const agentName = uniqueName("Bot");

  test.beforeAll(async () => {
    await cleanup();
    // Pre-register account via API
    await fetch(`${API}/v1/im/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: userName, email: userEmail, password: "123456" }),
    });
  });

  test.afterAll(async () => {
    await cleanup();
  });

  test("登录 → 创建朋友 → 聊天列表出现会话 → 通讯录出现好友", async ({ page }) => {
    // 1. 打开应用
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);
    await enableSemantics(page);

    // 2. 登录 — email uses getByRole, password uses Tab (obscureText has no role)
    await flutterType(page, "邮箱", userEmail);
    await page.keyboard.press("Tab");
    await page.waitForTimeout(300);
    await page.keyboard.type("123456");
    await page.getByRole("button", { name: "登录" }).click();
    await page.waitForTimeout(2000);

    // 3. 验证到达聊天列表
    await expect(page.getByRole("heading", { name: "ClawChat" })).toBeVisible({ timeout: 10000 });

    // 4. 点击 + 菜单 → 创建朋友
    await page.getByRole("button", { name: "Show menu" }).click();
    await page.getByRole("menuitem", { name: "创建朋友" }).click();
    await page.waitForTimeout(800);

    // 5. 验证创建朋友页面
    await expect(page.getByRole("heading", { name: "创建朋友" })).toBeVisible();

    // 6. 选头像 🐶
    await page.getByRole("button", { name: "🐶" }).click();
    await page.waitForTimeout(300);

    // 7. 输入名称 — Flutter TextField may lack ARIA, flutterType handles fallback
    await flutterType(page, "名称", agentName);
    await page.waitForTimeout(300);

    // 8. 点击创建
    await page.getByRole("button", { name: "创建" }).click();
    await page.waitForTimeout(5000);

    // 9. 验证：回到聊天列表，会话已出现
    await expect(page.getByRole("heading", { name: "ClawChat" })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("button", { name: new RegExp(agentName) })).toBeVisible({ timeout: 10000 });

    // 10. 切到通讯录
    await page.getByRole("button", { name: /通讯录/ }).click();
    await page.waitForTimeout(800);

    // 11. 验证：通讯录中出现好友
    await expect(page.getByRole("heading", { name: "通讯录" })).toBeVisible();
    await expect(page.getByRole("button", { name: new RegExp(agentName) })).toBeVisible({ timeout: 10000 });
  });
});

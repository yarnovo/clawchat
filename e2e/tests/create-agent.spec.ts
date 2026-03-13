import { test, expect, Page } from "@playwright/test";
import { execSync } from "child_process";

const API = "http://localhost:8080";

function cleanDB() {
  execSync(
    `docker exec clawchat-postgres psql -U clawchat -d clawchat -c 'DELETE FROM "Message"; DELETE FROM "Conversation"; DELETE FROM "Friendship"; DELETE FROM "Account";'`,
    { stdio: "pipe" },
  );
  execSync(
    `docker exec clawchat-postgres psql -U clawchat -d clawchat_agent -c 'DELETE FROM "AgentConfig"; DELETE FROM "Agent";'`,
    { stdio: "pipe" },
  );
}

async function enableSemantics(page: Page) {
  await page.evaluate(() => {
    (document.querySelector("flt-semantics-placeholder") as HTMLElement)?.click();
  });
  await page.waitForTimeout(800);
}

/**
 * Type into a Flutter Web text field.
 * Flutter Web's semantics tree is inconsistent: some TextFields expose role="textbox"
 * with aria-label, others render a bare <input> without any ARIA attributes.
 * This helper tries multiple strategies in order.
 */
async function flutterType(page: Page, label: string, text: string) {
  // Flutter Web needs a delay between click and type — first keypress is lost otherwise
  const FOCUS_DELAY = 300;

  // Strategy 1: standard getByRole (works for some Flutter TextFields)
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
  // Strategy 3: find bare <input> inside flt-semantics (Flutter's fallback)
  const bareInput = page.locator("flt-semantics > input[type='text']");
  if ((await bareInput.count()) > 0) {
    await bareInput.first().click();
    await page.waitForTimeout(FOCUS_DELAY);
    await bareInput.first().pressSequentially(text);
    return;
  }
  throw new Error(`Could not find Flutter text field with label "${label}"`);
}

test.describe("创建朋友（Agent）完整流程", () => {
  test.beforeAll(async () => {
    cleanDB();
    // Pre-register account via API
    await fetch(`${API}/v1/im/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "E2E用户", email: "e2e@test.com", password: "123456" }),
    });
  });

  test("登录 → 创建朋友 → 聊天列表出现会话 → 通讯录出现好友", async ({ page }) => {
    // 1. 打开应用
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);
    await enableSemantics(page);

    // 2. 登录 — email uses getByRole, password uses Tab (obscureText has no role)
    await flutterType(page, "邮箱", "e2e@test.com");
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
    await flutterType(page, "名称", "E2EBot");
    await page.waitForTimeout(300);

    // 8. 点击创建
    await page.getByRole("button", { name: "创建" }).click();
    await page.waitForTimeout(5000);

    // 9. 验证：回到聊天列表，会话已出现
    await expect(page.getByRole("heading", { name: "ClawChat" })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("button", { name: /E2EBot/ })).toBeVisible({ timeout: 10000 });

    // 10. 切到通讯录
    await page.getByRole("button", { name: /通讯录/ }).click();
    await page.waitForTimeout(800);

    // 11. 验证：通讯录中出现好友
    await expect(page.getByRole("heading", { name: "通讯录" })).toBeVisible();
    await expect(page.getByRole("button", { name: /E2EBot/ })).toBeVisible({ timeout: 10000 });
  });
});

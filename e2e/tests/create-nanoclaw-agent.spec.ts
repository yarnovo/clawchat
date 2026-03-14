import { test, expect } from "@playwright/test";
import { API, cleanup, enableSemantics, flutterType, uniqueName } from "./helpers";

test.describe("创建 NanoClaw Agent 完整流程", () => {
  const userName = uniqueName("NcUser");
  const userEmail = `${userName}@test.com`;
  const agentName = uniqueName("NcBot");

  test.beforeAll(async () => {
    await cleanup();
    await fetch(`${API}/v1/im/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: userName, email: userEmail, password: "123456" }),
    });
  });

  test.afterAll(async () => {
    await cleanup();
  });

  test("登录 → 选 NanoClaw 运行时 → 创建 Agent → 聊天列表出现会话", async ({ page }) => {
    // 1. 打开应用 + 启用 semantics
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
    await enableSemantics(page);

    // 2. 登录
    await flutterType(page, "邮箱", userEmail);
    await page.keyboard.press("Tab");
    await page.waitForTimeout(300);
    await page.keyboard.type("123456");
    await page.getByRole("button", { name: "登录" }).click();
    await page.waitForTimeout(3000);
    await enableSemantics(page);

    // 3. 验证到达聊天列表
    await expect(page.getByRole("button", { name: "Show menu" })).toBeVisible({ timeout: 10000 });

    // 4. 点击菜单 → 创建朋友
    await page.getByRole("button", { name: "Show menu" }).click();
    await page.getByRole("menuitem", { name: "创建朋友" }).click();
    await page.waitForTimeout(1500);
    await enableSemantics(page);

    // 5. 验证创建朋友页面
    await expect(page.getByText("选择头像")).toBeVisible({ timeout: 5000 });

    // 6. 选择 NanoClaw 运行时
    await page.getByRole("button", { name: "NanoClaw" }).click();
    await page.waitForTimeout(300);

    // 7. 验证 NanoClaw 被选中后 UI 变化：API Key 标签变为 Anthropic API Key
    await expect(page.getByRole("textbox", { name: /Anthropic API Key/ })).toBeVisible();

    // 8. 选头像
    await page.getByRole("button", { name: "🦊" }).click();
    await page.waitForTimeout(300);

    // 9. 输入名称
    await flutterType(page, "名称", agentName);
    await page.waitForTimeout(300);

    // 10. 点击创建（不填 API Key，Agent 以 created 状态创建）
    await page.getByRole("button", { name: "创建" }).click();
    await page.waitForTimeout(5000);
    await enableSemantics(page);

    // 11. 验证：聊天列表会话出现
    await expect(page.getByRole("button", { name: new RegExp(agentName) })).toBeVisible({ timeout: 10000 });

    // 12. 通过 API 验证 Agent 的 runtime 和 model
    const listRes = await fetch(`${API}/v1/im/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: userEmail, password: "123456" }),
    });
    const { token } = await listRes.json();
    const agentsRes = await fetch(`${API}/v1/agents`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const agents = await agentsRes.json();
    const ncAgent = agents.find((a: { name: string }) => a.name === agentName);
    expect(ncAgent).toBeDefined();
    expect(ncAgent.config.runtime).toBe("nanoclaw");
    expect(ncAgent.config.model).toBe("claude-sonnet-4-20250514");
    expect(ncAgent.config.status).toBe("created"); // No API key → not started

    // 13. 切到通讯录验证
    await page.getByRole("button", { name: /通讯录/ }).click();
    await page.waitForTimeout(1000);
    await enableSemantics(page);
    await expect(page.getByRole("button", { name: new RegExp(agentName) })).toBeVisible({ timeout: 10000 });
  });
});

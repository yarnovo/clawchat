---
name: playwright-debug
description: 用 Playwright MCP 工具实时调试 Flutter Web 应用，或编写 Playwright E2E 测试脚本。当需要在浏览器中验证 Flutter Web 功能、调试 UI 问题、或编写/运行 E2E 测试时激活此 skill。
allowed-tools: Bash, Read, Glob, Grep
---

# Playwright × Flutter Web 完全指南

本 skill 覆盖两种场景：
1. **Playwright MCP 实时调试** — 用 `mcp__playwright__browser_*` 工具交互式验证功能
2. **E2E 测试脚本** — 在 `e2e/tests/` 目录编写自动化测试

## 一、Playwright MCP 实时调试 Flutter Web

### 核心流程（必须严格按顺序）

```
1. navigate 到页面
2. waitForTimeout(1500)  ← Flutter JS 启动慢，必须等
3. enableSemantics       ← 否则 snapshot 为空
4. 用 snapshot 查看元素
5. 交互操作
```

### 1. 启用 Semantics（最关键的一步）

Flutter Web 默认只渲染 Canvas，**不生成 DOM 元素**。必须先启用 semantics：

```javascript
// 用 browser_evaluate 执行
() => {
  (document.querySelector('flt-semantics-placeholder')).click();
}
```

**但是！** 在页面导航后（如登录成功跳转），semantics 需要重新激活。如果 `browser_snapshot` 只返回 `button "Enable accessibility"`，说明 semantics 未启用或已失效，需要再次执行上述代码。

等待 semantics 树生效需要 500ms：
```
evaluate → waitForTimeout(500) → snapshot
```

### 2. 文本输入（fill 无效，必须 pressSequentially）

Flutter Web 的 TextField 不响应 Playwright 的 `fill()`。必须：

- **用 `browser_type` 工具** + `slowly: true`（等价于 `pressSequentially`）
- **点击后等 300ms** 再输入，否则首字符丢失

```
click textbox → waitForTimeout(300) → type slowly
```

### 3. 密码框（无 ARIA role，用 Tab 导航）

Flutter 的 `obscureText: true` TextField 不暴露 `role="textbox"`，也不渲染 `input[type="password"]`。

**正确做法**：从上一个字段 Tab 过去，然后直接 `press_key` 逐字输入：
```
1. 输入邮箱（用 browser_type slowly）
2. press_key Tab
3. waitForTimeout(300)
4. 用 browser_type slowly 输入密码（ref 用当前 active 的 textbox）
```

### 4. 按钮点击

Flutter 按钮在 snapshot 中表现为：
- 普通按钮：`button "登录"`, `button "创建"`
- 图标按钮：`button "Show menu"` (PopupMenuButton)
- Emoji 选择：`button "🐶"`, `button "🤖"`
- Tab 导航：`button "聊天 Tab 1 of 4"`, `button /通讯录/`
- SegmentedButton：`button "OpenClaw"`, `button "NanoClaw"`

### 5. 菜单操作

```
1. click button "Show menu"
2. snapshot 查看 menuitem 列表
3. click menuitem "创建朋友"
```

### 6. 页面导航后的处理

Flutter 路由切换后，semantics 树可能需要时间更新：
```
click 登录 → waitForTimeout(2000) → evaluate enableSemantics → snapshot
```

### 常见问题排查

| 症状 | 原因 | 解决 |
|------|------|------|
| snapshot 为空或只有 "Enable accessibility" | Semantics 未启用 | 执行 enableSemantics JS |
| 输入文字丢失首字符 | 没等 focus 稳定 | click 后 waitForTimeout(300) |
| fill() 不生效 | Flutter TextField 不响应 fill | 改用 type slowly |
| 密码框找不到 | obscureText 无 ARIA role | Tab 导航 + keyboard type |
| 导航后元素消失 | Flutter 路由切换重建 DOM | 重新 enableSemantics |

---

## 二、E2E 测试脚本编写

### 项目结构

```
e2e/
├── playwright.config.ts    # 配置（baseURL、timeout、browser）
├── package.json
└── tests/
    ├── helpers.ts          # 共享工具（必须使用！）
    ├── smoke.spec.ts       # CD 冒烟测试
    └── create-agent.spec.ts # 创建朋友流程
```

### helpers.ts 核心函数

| 函数 | 用途 |
|------|------|
| `enableSemantics(page)` | 启用 Flutter semantics（每次导航后调用） |
| `flutterType(page, label, text)` | 三策略文本输入（byRole → byLabel → bareInput） |
| `setupFlutterPage(page)` | 一键初始化（goto + networkidle + enableSemantics） |
| `registerAccount(name, email, pw)` | API 注册账号 |
| `cleanup()` | 清理 e2e-smoke-* 测试数据 |
| `uniqueName(suffix?)` | 生成唯一名称 `e2e-smoke-{timestamp}` |

### 测试模板

```typescript
import { test, expect } from "@playwright/test";
import { API, cleanup, enableSemantics, flutterType, uniqueName } from "./helpers";

test.describe("功能名称", () => {
  const userName = uniqueName("User");
  const userEmail = `${userName}@test.com`;

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

  test("具体场景", async ({ page }) => {
    // 1. 初始化
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);
    await enableSemantics(page);

    // 2. 登录
    await flutterType(page, "邮箱", userEmail);
    await page.keyboard.press("Tab");
    await page.waitForTimeout(300);
    await page.keyboard.type("123456");
    await page.getByRole("button", { name: "登录" }).click();
    await page.waitForTimeout(2000);

    // 3. 验证进入主页
    await expect(page.getByRole("heading", { name: "ClawChat" }))
      .toBeVisible({ timeout: 10000 });

    // 4. 业务操作...
  });
});
```

### 关键模式

**登录**：
```typescript
await flutterType(page, "邮箱", email);
await page.keyboard.press("Tab");
await page.waitForTimeout(300);
await page.keyboard.type(password);
await page.getByRole("button", { name: "登录" }).click();
```

**打开创建菜单**：
```typescript
await page.getByRole("button", { name: "Show menu" }).click();
await page.getByRole("menuitem", { name: "创建朋友" }).click();
```

**选择器优先级**：
1. `page.getByRole("textbox", { name: "标签" })` — 标准 ARIA
2. `page.getByLabel("标签")` — aria-label 降级
3. `page.locator("flt-semantics > input[type='text']")` — 裸输入框降级

### 运行测试

```bash
make e2e-install   # 首次安装
make e2e-test      # 运行全部
cd e2e && npx playwright test tests/smoke.spec.ts  # 运行单个
cd e2e && npx playwright test --headed  # 有头模式调试
```

### 测试数据清理

- 账号名必须以 `e2e-smoke-` 开头（`uniqueName()` 自动处理）
- `cleanup()` 调用 `/v1/im/internal/cleanup-test-data` 批量删除
- `beforeAll` 和 `afterAll` 都要调用 cleanup

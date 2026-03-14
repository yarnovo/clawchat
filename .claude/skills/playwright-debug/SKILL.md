---
name: playwright-debug
description: Playwright 调试 Flutter Web 应用。当需要用 Playwright MCP 测试 Flutter Web 页面时调用，包含已验证的技巧和避坑指南。
allowed-tools: Bash, Read, Glob, Grep
---

Playwright MCP 调试 Flutter Web 应用的技能文档——沉淀已验证的技巧、避坑指南和最佳实践。

## Flutter Web 特殊处理

### 1. 启用 Semantics（必须第一步）
Flutter Web 默认不渲染 accessibility tree，Playwright 无法识别元素。必须先执行：
```javascript
await page.evaluate(() => {
  const el = document.querySelector('flt-semantics-placeholder');
  if (el) el.click();
});
```
或者通过 `browser_run_code` 工具执行。

### 2. 文本输入
- **普通文本框**：使用 `browser_type` 工具，设置 `slowly: true`（内部调用 `pressSequentially`）
- **密码框**（`obscureText: true`）：Flutter 渲染的密码框需要特殊处理：
  ```javascript
  await page.locator('input[type="password"]').click();
  await page.waitForTimeout(300);
  await page.keyboard.type('password123', { delay: 30 });
  ```
  不能直接用 `browser_type` 的 ref，因为 Flutter 的 semantics node 不接受 fill。

### 3. 下拉菜单（DropdownButtonFormField）
- Flutter 的下拉菜单在 snapshot 中显示为 `button "模型 qwen-max"`
- 点击后弹出 menu，用 `menuitem` role 选择选项
- 有时需要先 dismiss 菜单再操作

### 4. 导航和路由
- Flutter Web 是 SPA，URL 可能不变
- 页面切换通过 Navigator.push/pop，在 snapshot 中体现为 DOM 变化
- Tab 切换用 `button "聊天 Tab 1 of 4"` 等

## 常见坑

### PopupMenuButton vs 独立按钮
- Flutter 的 PopupMenuButton 在 snapshot 中显示为 `button "Show menu"`
- 点击后弹出 menu，包含 menuitem 列表
- 注意区分 PopupMenuButton（弹出菜单）和普通按钮

### 页面加载时序
- Flutter Web 首次加载较慢，需要等待
- 操作之间建议用 `waitForTimeout(300-500)` 避免竞态

### SnackBar 错误消息
- Flutter 的 SnackBar 在 snapshot 中显示为 `generic` 包含错误文本
- SnackBar 会自动消失，需要及时捕获

## 测试流程模板

### 登录流程
1. 导航到 localhost:8080
2. 启用 semantics（JS 注入）
3. 找到用户名/密码输入框
4. 用 `pressSequentially` 输入用户名
5. 用 `input[type="password"]` + `keyboard.type` 输入密码
6. 点击登录按钮
7. 等待页面跳转

### 创建 Agent 流程
1. 在聊天列表页点击 "Show menu"
2. 点击 "创建朋友" menuitem
3. 选择头像（点击 emoji 按钮）
4. 输入名称（pressSequentially）
5. 选择模型（如需更改，点击下拉→选 menuitem）
6. 输入 API Key（password 字段特殊处理）
7. 点击 "创建" 按钮
8. 验证返回聊天列表且新 Agent 出现

## 调试技巧

- 优先用 `browser_snapshot` 而非截图，accessibility tree 信息更丰富
- 遇到元素找不到时，先 snapshot 查看当前 DOM 结构
- 连续操作失败 2-3 次后停下来分析原因，不要盲目重试
- 用 `browser_run_code` 执行复杂的 JS 操作（如 dispatchEvent、querySelector）

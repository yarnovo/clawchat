import { test, expect } from '@playwright/test'

test.describe('Agent Market', () => {
  test('shows categorized agent list', async ({ page }) => {
    await page.goto('/agents')
    // Wait for MSW
    await expect(page.getByText('编程开发')).toBeVisible()
    await expect(page.getByText('翻译写作')).toBeVisible()
    await expect(page.getByText('CodeBot')).toBeVisible()
  })

  test('clicking agent shows detail panel', async ({ page }) => {
    await page.goto('/agents')
    await expect(page.getByText('CodeBot')).toBeVisible()

    await page.getByRole('button', { name: 'CodeBot' }).first().click()

    // Detail panel shows agent info
    await expect(page.getByRole('heading', { name: 'CodeBot' })).toBeVisible()
    await expect(page.getByText('全栈开发助手')).toBeVisible()
    await expect(page.getByText('代码审查')).toBeVisible()
  })

  test('发消息 button navigates to chat', async ({ page }) => {
    await page.goto('/agents')
    await expect(page.getByText('CodeBot')).toBeVisible()

    await page.getByRole('button', { name: 'CodeBot' }).first().click()
    await page.getByRole('button', { name: '发消息' }).click()

    await expect(page).toHaveURL(/\/chat\/agent-coder/)
  })

  test('create agent dialog opens and creates', async ({ page }) => {
    await page.goto('/agents')
    await expect(page.getByText('编程开发')).toBeVisible()

    // Click the + button in agent list header
    await page.locator('main button').filter({ has: page.locator('svg') }).last().click()

    // Dialog opens
    await expect(page.getByText('创建 Agent')).toBeVisible()

    // Fill name
    await page.getByPlaceholder('例如: MyBot').fill('TestBot')

    // Click create
    await page.getByRole('button', { name: '创建' }).click()

    // Dialog closes, new agent should exist (via MSW)
    await expect(page.getByText('创建 Agent')).not.toBeVisible()
  })
})

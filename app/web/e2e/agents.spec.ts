import { test, expect } from '@playwright/test'
import { login } from './helpers'

test.describe('Agent Market', () => {
  test('shows categorized agent list', async ({ page }) => {
    await login(page, '/agents')
    await expect(page.getByText('编程开发')).toBeVisible()
    await expect(page.getByText('翻译写作')).toBeVisible()
    await expect(page.getByText('CodeBot')).toBeVisible()
  })

  test('clicking agent shows detail panel', async ({ page }) => {
    await login(page, '/agents')
    await expect(page.getByText('CodeBot')).toBeVisible()

    await page.getByRole('button', { name: 'CodeBot' }).first().click()

    await expect(page.getByRole('heading', { name: 'CodeBot' })).toBeVisible()
    await expect(page.getByText('全栈开发助手')).toBeVisible()
    await expect(page.getByText('代码审查')).toBeVisible()
  })

  test('发消息 button navigates to chat', async ({ page }) => {
    await login(page, '/agents')
    await expect(page.getByText('CodeBot')).toBeVisible()

    await page.getByRole('button', { name: 'CodeBot' }).first().click()
    await page.getByRole('button', { name: '发消息' }).click()

    await expect(page).toHaveURL(/\/chat\/agent-coder/)
  })

  test('create agent dialog opens and creates', async ({ page }) => {
    await login(page, '/agents')
    await expect(page.getByText('编程开发')).toBeVisible()

    // Click the + button in agent list header
    await page.locator('main button').filter({ has: page.locator('svg') }).last().click()

    await expect(page.getByText('创建 Agent')).toBeVisible()

    await page.getByPlaceholder('例如: MyBot').fill('TestBot')
    await page.getByRole('button', { name: '创建' }).click()

    await expect(page.getByText('创建 Agent')).not.toBeVisible()
  })
})

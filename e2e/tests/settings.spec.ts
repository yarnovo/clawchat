import { test, expect } from '@playwright/test'
import { login } from './helpers'

test.describe('Settings', () => {
  test('opens settings dialog from gear icon', async ({ page }) => {
    await login(page)
    await expect(page.getByText('CodeBot')).toBeVisible()

    await page.locator('nav + button').click()

    await expect(page.getByRole('heading', { name: '设置' })).toBeVisible()
    await expect(page.getByRole('tab', { name: '账号' })).toBeVisible()
    await expect(page.getByRole('tab', { name: '外观' })).toBeVisible()
  })

  test('can switch between tabs', async ({ page }) => {
    await login(page)
    await expect(page.getByText('CodeBot')).toBeVisible()

    await page.locator('nav + button').click()
    await expect(page.getByRole('heading', { name: '设置' })).toBeVisible()

    await page.getByRole('tab', { name: '外观' }).click()
    await expect(page.getByText('主题')).toBeVisible()

    await page.getByRole('tab', { name: '通用' }).click()
    await expect(page.getByText('保留聊天记录')).toBeVisible()

    await page.getByRole('tab', { name: '关于' }).click()
    await expect(page.getByText('0.1.0')).toBeVisible()
  })
})

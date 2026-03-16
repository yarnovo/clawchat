import { test, expect } from '@playwright/test'

test.describe('Settings', () => {
  test('opens settings dialog from avatar', async ({ page }) => {
    await page.goto('/chat')
    await expect(page.getByText('CodeBot')).toBeVisible()

    // Click avatar (U) at bottom of NavRail
    await page.getByRole('button', { name: 'U', exact: true }).click()

    // Settings dialog opens
    await expect(page.getByRole('heading', { name: '设置' })).toBeVisible()
    await expect(page.getByRole('tab', { name: '账号' })).toBeVisible()
    await expect(page.getByRole('tab', { name: '外观' })).toBeVisible()
  })

  test('can switch between tabs', async ({ page }) => {
    await page.goto('/chat')
    await expect(page.getByText('CodeBot')).toBeVisible()

    await page.getByRole('button', { name: 'U', exact: true }).click()
    await expect(page.getByRole('heading', { name: '设置' })).toBeVisible()

    // Switch to appearance tab
    await page.getByRole('tab', { name: '外观' }).click()
    await expect(page.getByText('主题')).toBeVisible()

    // Switch to general tab
    await page.getByRole('tab', { name: '通用' }).click()
    await expect(page.getByText('保留聊天记录')).toBeVisible()

    // Switch to about tab
    await page.getByRole('tab', { name: '关于' }).click()
    await expect(page.getByText('0.1.0')).toBeVisible()
  })
})

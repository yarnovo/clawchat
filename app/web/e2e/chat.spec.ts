import { test, expect } from '@playwright/test'

test.describe('Chat', () => {
  test('conversation list loads with mock agents', async ({ page }) => {
    await page.goto('/chat')
    // Wait for MSW to serve agents
    await expect(page.getByText('CodeBot')).toBeVisible()
    await expect(page.getByText('TransBot')).toBeVisible()
    await expect(page.getByText('DataBot')).toBeVisible()
  })

  test('clicking an agent opens chat with message history', async ({ page }) => {
    await page.goto('/chat')
    await expect(page.getByText('CodeBot')).toBeVisible()

    await page.getByText('CodeBot').click()

    // Chat header shows agent name
    await expect(page.locator('header').getByText('CodeBot')).toBeVisible()

    // Mock message history is loaded
    await expect(
      page.getByText('帮我看看这个 React 组件有什么问题'),
    ).toBeVisible()
  })

  test('input auto-focuses when entering a chat', async ({ page }) => {
    await page.goto('/chat')
    await expect(page.getByText('CodeBot')).toBeVisible()

    await page.getByText('CodeBot').click()
    await expect(page.getByPlaceholder('Type a message...')).toBeFocused()
  })

  test('can send a message and receive mock reply', async ({ page }) => {
    await page.goto('/chat')
    await expect(page.getByText('TransBot')).toBeVisible()

    await page.getByText('TransBot').click()

    const input = page.getByPlaceholder('Type a message...')
    await input.fill('你好')
    await input.press('Enter')

    // User message appears in chat area
    await expect(page.getByRole('main').getByText('你好')).toBeVisible()

    // Wait for mock reply (MSW delay ~1-2s)
    await expect(
      page.locator('[data-slot="avatar-fallback"], [data-slot="avatar-image"]')
        .last(),
    ).toBeVisible({ timeout: 5000 })
  })

  test('self chat: clicking logo adds self to list', async ({ page }) => {
    await page.goto('/chat')
    await expect(page.getByText('CodeBot')).toBeVisible()

    // Click the C logo
    await page.getByRole('button', { name: 'C', exact: true }).click()

    // "自己" appears in conversation list
    await expect(page.getByRole('button', { name: /自己/ })).toBeVisible()
  })
})

import { test, expect } from '@playwright/test'
import { login } from './helpers'

test.describe('Chat', () => {
  test('conversation list loads with mock agents', async ({ page }) => {
    await login(page)
    await expect(page.getByText('CodeBot')).toBeVisible()
    await expect(page.getByText('TransBot')).toBeVisible()
    await expect(page.getByText('DataBot')).toBeVisible()
  })

  test('clicking an agent opens chat with message history', async ({ page }) => {
    await login(page)
    await expect(page.getByText('CodeBot')).toBeVisible()

    await page.getByText('CodeBot').click()

    // Wait for chat to load
    await expect(
      page.getByText('帮我看看这个 React 组件有什么问题'),
    ).toBeVisible({ timeout: 10000 })
  })

  test('input auto-focuses when entering a chat', async ({ page }) => {
    await login(page)
    await expect(page.getByText('CodeBot')).toBeVisible()

    await page.getByText('CodeBot').click()
    await expect(page.getByPlaceholder('Type a message...')).toBeFocused({ timeout: 10000 })
  })

  test('can send a message and receive mock reply', async ({ page }) => {
    await login(page)
    await expect(page.getByText('TransBot')).toBeVisible()

    await page.getByText('TransBot').click()
    await page.getByPlaceholder('Type a message...').waitFor()

    const input = page.getByPlaceholder('Type a message...')
    await input.fill('你好')
    await input.press('Enter')

    // User message appears in chat area
    await expect(page.getByRole('main').getByText('你好')).toBeVisible()

    // Header shows typing indicator then disappears after reply
    await expect(page.getByText('正在输入...')).toBeVisible()
    await expect(page.getByText('正在输入...')).not.toBeVisible({ timeout: 5000 })
  })

  test('self chat: clicking avatar adds self to list', async ({ page }) => {
    await login(page)
    await expect(page.getByText('CodeBot')).toBeVisible()

    // Click user avatar (top-left)
    await page.getByRole('button', { name: 'me' }).click()

    // "自己" appears in conversation list
    await expect(page.getByRole('button', { name: /自己/ })).toBeVisible()
  })
})

import { test, expect } from '@playwright/test'

test.describe('Auth', () => {
  test('redirects to /login when not logged in', async ({ page }) => {
    await page.goto('/chat')
    await expect(page).toHaveURL(/\/login/)
  })

  test('login page shows form', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: 'ClawChat' })).toBeVisible()
    await expect(page.getByPlaceholder('用户名')).toBeVisible()
    await expect(page.getByRole('link', { name: '去注册' })).toBeVisible()
  })

  test('can navigate to register page', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('link', { name: '去注册' }).click()
    await expect(page).toHaveURL(/\/register/)
    await expect(page.getByText('创建新账号')).toBeVisible()
    await expect(page.getByRole('link', { name: '去登录' })).toBeVisible()
  })

  test('login navigates to /chat', async ({ page }) => {
    await page.goto('/login')
    await page.getByPlaceholder('用户名').fill('testuser')
    await page.getByPlaceholder('用户名').press('Enter')
    await expect(page).toHaveURL(/\/chat/)
  })

  test('register navigates to /chat', async ({ page }) => {
    await page.goto('/register')
    await page.getByPlaceholder('用户名').fill('newuser')
    await page.getByRole('textbox', { name: '密码', exact: true }).fill('pass123')
    await page.getByPlaceholder('确认密码').fill('pass123')
    await page.getByRole('button', { name: '注册' }).click()
    await expect(page).toHaveURL(/\/chat/)
  })

  test('logout redirects to /login', async ({ page }) => {
    await page.goto('/login')
    await page.getByPlaceholder('用户名').fill('testuser')
    await page.getByPlaceholder('用户名').press('Enter')
    await expect(page).toHaveURL(/\/chat/)
    await expect(page.getByText('CodeBot')).toBeVisible()

    // Open settings and logout
    await page.locator('nav + button').click()
    await expect(page.getByRole('heading', { name: '设置' })).toBeVisible()
    await page.getByRole('button', { name: '退出登录' }).click()
    await expect(page).toHaveURL(/\/login/)
  })
})

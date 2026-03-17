import type { Page } from '@playwright/test'

/**
 * Login via UI.
 * TODO: replace with API login when auth endpoints are ready.
 */
export async function login(page: Page, target = '/chat') {
  await page.goto('/login')
  await page.getByPlaceholder('用户名').fill('testuser')
  await page.getByPlaceholder('用户名').press('Enter')
  if (target !== '/chat') {
    await page.goto(target)
  }
}

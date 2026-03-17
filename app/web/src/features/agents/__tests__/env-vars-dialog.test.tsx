import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

vi.mock('@/services/api-client', () => ({
  getCredentials: vi.fn(),
  setCredentials: vi.fn(),
}))

import { getCredentials } from '@/services/api-client'
import { EnvVarsDialog } from '../agent-detail'

const mockedGetCredentials = vi.mocked(getCredentials)

function renderDialog() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const onOpenChange = vi.fn()
  render(
    <QueryClientProvider client={queryClient}>
      <EnvVarsDialog
        agentId="test-agent"
        open={true}
        onOpenChange={onOpenChange}
      />
    </QueryClientProvider>,
  )
  return { onOpenChange }
}

function getSaveButton() {
  return screen.getByRole('button', { name: /保存/ })
}

function getRow(index: number) {
  const keyInputs = document.querySelectorAll<HTMLInputElement>('input[name^="entries."][name$=".key"]')
  const valueInputs = document.querySelectorAll<HTMLInputElement>('input[type="password"]')
  return {
    keyInput: keyInputs[index],
    valueInput: valueInputs[index],
  }
}

function getDeleteButtons() {
  return Array.from(document.querySelectorAll<HTMLButtonElement>('button[type="button"]'))
    .filter(btn => btn.querySelector('svg') && btn.closest('.flex.items-center.gap-3'))
}

/** 等待已有凭证加载到表单 */
async function waitForCredentialsLoaded(keyValue: string) {
  await waitFor(() => {
    const input = document.querySelector<HTMLInputElement>('input[name="entries.0.key"]')
    expect(input?.value).toBe(keyValue)
  }, { timeout: 3000 })
}

/** 等待 query 完成（表单 data-ready 出现） */
async function waitForFormReady() {
  await waitFor(() => {
    expect(document.querySelector('form[data-ready]')).toBeTruthy()
  }, { timeout: 3000 })
}

describe('EnvVarsDialog save button', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(cleanup)

  it('无凭证，默认空行 → 保存按钮禁用', async () => {
    mockedGetCredentials.mockResolvedValue({ credentials: [] })
    renderDialog()

    await waitForFormReady()
    expect(getSaveButton()).toBeDisabled()
  })

  it('已有凭证，未做修改 → 保存按钮禁用', async () => {
    mockedGetCredentials.mockResolvedValue({
      credentials: [{ name: 'API_KEY', hasValue: true }],
    })
    renderDialog()

    await waitForCredentialsLoaded('API_KEY')
    expect(getSaveButton()).toBeDisabled()
  })

  it('修改已有凭证的 value → 保存按钮启用', async () => {
    mockedGetCredentials.mockResolvedValue({
      credentials: [{ name: 'API_KEY', hasValue: true }],
    })
    renderDialog()

    await waitForCredentialsLoaded('API_KEY')

    await userEvent.type(getRow(0).valueInput, 'new-secret')
    expect(getSaveButton()).toBeEnabled()
  })

  it('新增行 key + value 都填写 → 保存按钮启用', async () => {
    mockedGetCredentials.mockResolvedValue({ credentials: [] })
    renderDialog()

    await waitForFormReady()

    await userEvent.type(getRow(0).keyInput, 'MY_KEY')
    await userEvent.type(getRow(0).valueInput, 'my-value')
    expect(getSaveButton()).toBeEnabled()
  })

  it('新增行只填 key 没填 value → 保存按钮禁用', async () => {
    mockedGetCredentials.mockResolvedValue({ credentials: [] })
    renderDialog()

    await waitForFormReady()

    await userEvent.type(getRow(0).keyInput, 'MY_KEY')
    expect(getSaveButton()).toBeDisabled()
  })

  it('删除已有凭证 → 保存按钮启用', async () => {
    mockedGetCredentials.mockResolvedValue({
      credentials: [{ name: 'API_KEY', hasValue: true }],
    })
    renderDialog()

    await waitForCredentialsLoaded('API_KEY')

    const deleteBtns = getDeleteButtons()
    await userEvent.click(deleteBtns[0])
    expect(getSaveButton()).toBeEnabled()
  })

  it('key 不合法（数字开头）→ 保存按钮禁用', async () => {
    mockedGetCredentials.mockResolvedValue({ credentials: [] })
    renderDialog()

    await waitForFormReady()

    await userEvent.type(getRow(0).keyInput, '1BAD_KEY')
    await userEvent.type(getRow(0).valueInput, 'some-value')
    expect(getSaveButton()).toBeDisabled()
  })
})

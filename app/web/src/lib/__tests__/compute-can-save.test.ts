import { describe, it, expect } from 'vitest'
import { computeCanSave, type EnvEntry } from '../env-var'

const entry = (key: string, value: string, existing = false): EnvEntry => ({ key, value, existing })

describe('computeCanSave', () => {
  // ── 无改动 → 禁用 ──

  it('已有凭证，未做任何修改 → false', () => {
    const initial = new Set(['API_KEY'])
    const entries = [entry('API_KEY', '', true)]
    expect(computeCanSave(entries, initial)).toBe(false)
  })

  it('空表单（默认空行）→ false', () => {
    const entries = [entry('', '', false)]
    expect(computeCanSave(entries, new Set())).toBe(false)
  })

  it('无凭证，无行 → false', () => {
    expect(computeCanSave([], new Set())).toBe(false)
  })

  // ── 有合法改动 → 启用 ──

  it('修改了已有凭证的 value → true', () => {
    const initial = new Set(['API_KEY'])
    // 用户输入新值后 existing 变为 false
    const entries = [entry('API_KEY', 'new-secret', false)]
    expect(computeCanSave(entries, initial)).toBe(true)
  })

  it('新增一行，key 和 value 都合法 → true', () => {
    const initial = new Set(['API_KEY'])
    const entries = [
      entry('API_KEY', '', true),
      entry('DB_URL', 'postgres://...', false),
    ]
    expect(computeCanSave(entries, initial)).toBe(true)
  })

  it('删除了一行已有凭证 → true', () => {
    const initial = new Set(['API_KEY', 'DB_URL'])
    const entries = [entry('API_KEY', '', true)]
    expect(computeCanSave(entries, initial)).toBe(true)
  })

  it('删除全部凭证（清空）→ true', () => {
    const initial = new Set(['API_KEY'])
    expect(computeCanSave([], initial)).toBe(true)
  })

  // ── 有改动但不合法 → 禁用 ──

  it('新增行只填了 key 没填 value → false', () => {
    const initial = new Set(['API_KEY'])
    const entries = [
      entry('API_KEY', '', true),
      entry('NEW_KEY', '', false),
    ]
    expect(computeCanSave(entries, initial)).toBe(false)
  })

  it('新增行只填了 value 没填 key → false', () => {
    const initial = new Set(['API_KEY'])
    const entries = [
      entry('API_KEY', '', true),
      entry('', 'some-value', false),
    ]
    expect(computeCanSave(entries, initial)).toBe(false)
  })

  it('key 以数字开头 → false', () => {
    const entries = [entry('1ABC', 'val', false)]
    expect(computeCanSave(entries, new Set())).toBe(false)
  })

  it('key 包含非法字符 → false', () => {
    const entries = [entry('MY-VAR', 'val', false)]
    expect(computeCanSave(entries, new Set())).toBe(false)
  })

  it('有合法改动但同时存在空行 → false', () => {
    const initial = new Set(['API_KEY'])
    const entries = [
      entry('API_KEY', 'new-val', false),
      entry('', '', false), // 空行
    ]
    expect(computeCanSave(entries, initial)).toBe(false)
  })

  it('有合法改动但另一行 key 不合法 → false', () => {
    const initial = new Set(['API_KEY'])
    const entries = [
      entry('API_KEY', 'new-val', false),
      entry('1BAD', 'val', false),
    ]
    expect(computeCanSave(entries, initial)).toBe(false)
  })

  // ── 边界情况 ──

  it('key 前后有空格，trim 后合法 → true', () => {
    const entries = [entry('  API_KEY  ', 'val', false)]
    expect(computeCanSave(entries, new Set())).toBe(true)
  })

  it('多个已有凭证，只修改了其中一个 → true', () => {
    const initial = new Set(['API_KEY', 'DB_URL', 'SECRET'])
    const entries = [
      entry('API_KEY', '', true),
      entry('DB_URL', 'new-url', false),
      entry('SECRET', '', true),
    ]
    expect(computeCanSave(entries, initial)).toBe(true)
  })
})

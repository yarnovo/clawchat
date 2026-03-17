import { describe, it, expect } from 'vitest'
import { validateEnvVarName, computeCanSave } from '../env-var'

describe('validateEnvVarName', () => {
  it('returns error for empty string', () => {
    expect(validateEnvVarName('')).toBe('请输入变量名')
  })

  it('returns error for digit-leading name', () => {
    expect(validateEnvVarName('1ABC')).toBe('不能以数字开头')
  })

  it('returns error for invalid characters', () => {
    expect(validateEnvVarName('MY-VAR')).toBe('仅支持字母、数字和下划线')
  })

  it('returns undefined for valid names', () => {
    expect(validateEnvVarName('LLM_API_KEY')).toBeUndefined()
    expect(validateEnvVarName('_PRIVATE')).toBeUndefined()
    expect(validateEnvVarName('myVar')).toBeUndefined()
  })
})

describe('computeCanSave', () => {
  it('returns true when only note is modified', () => {
    const entries = [{ key: 'API_KEY', value: '', existing: true, note: '新备注' }]
    const initialKeys = new Set(['API_KEY'])
    const initialNotes = { API_KEY: '' }
    expect(computeCanSave(entries, initialKeys, initialNotes)).toBe(true)
  })

  it('returns false when note is unchanged', () => {
    const entries = [{ key: 'API_KEY', value: '', existing: true, note: '旧备注' }]
    const initialKeys = new Set(['API_KEY'])
    const initialNotes = { API_KEY: '旧备注' }
    expect(computeCanSave(entries, initialKeys, initialNotes)).toBe(false)
  })

  it('returns false when note and everything else is unchanged', () => {
    const entries = [{ key: 'API_KEY', value: '', existing: true, note: '' }]
    const initialKeys = new Set(['API_KEY'])
    const initialNotes = {}
    expect(computeCanSave(entries, initialKeys, initialNotes)).toBe(false)
  })

  it('returns true when note is added to existing key', () => {
    const entries = [{ key: 'API_KEY', value: '', existing: true, note: '添加了备注' }]
    const initialKeys = new Set(['API_KEY'])
    const initialNotes = {}
    expect(computeCanSave(entries, initialKeys, initialNotes)).toBe(true)
  })

  it('returns true when note is removed from existing key', () => {
    const entries = [{ key: 'API_KEY', value: '', existing: true, note: '' }]
    const initialKeys = new Set(['API_KEY'])
    const initialNotes = { API_KEY: '有备注' }
    expect(computeCanSave(entries, initialKeys, initialNotes)).toBe(true)
  })

  it('ignores empty rows and allows save when there are real changes', () => {
    const entries = [
      { key: 'NEW_KEY', value: 'val', existing: false },
      { key: '', value: '', existing: false },
      { key: '', value: '', existing: false },
    ]
    const initialKeys = new Set<string>()
    expect(computeCanSave(entries, initialKeys)).toBe(true)
  })

  it('returns false when only empty rows exist (no real changes)', () => {
    const entries = [
      { key: '', value: '', existing: false },
      { key: '', value: '', existing: false },
    ]
    const initialKeys = new Set<string>()
    expect(computeCanSave(entries, initialKeys)).toBe(false)
  })

  it('still detects new entries regardless of notes', () => {
    const entries = [{ key: 'NEW_KEY', value: 'val', existing: false }]
    const initialKeys = new Set<string>()
    expect(computeCanSave(entries, initialKeys)).toBe(true)
  })

  it('still detects deletions regardless of notes', () => {
    const entries = [{ key: 'REMAINING', value: '', existing: true }]
    const initialKeys = new Set(['REMAINING', 'DELETED'])
    expect(computeCanSave(entries, initialKeys)).toBe(true)
  })
})

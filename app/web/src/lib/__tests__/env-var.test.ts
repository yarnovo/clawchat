import { describe, it, expect } from 'vitest'
import { validateEnvVarName } from '../env-var'

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

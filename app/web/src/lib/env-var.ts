const ENV_VAR_NAME_RE = /^[A-Za-z_][A-Za-z0-9_]*$/

/** 校验环境变量名，返回错误信息或 undefined */
export function validateEnvVarName(name: string): string | undefined {
  if (!name) return '请输入变量名'
  if (/^[0-9]/.test(name)) return '不能以数字开头'
  if (!ENV_VAR_NAME_RE.test(name)) return '仅支持字母、数字和下划线'
  return undefined
}

export interface EnvEntry {
  key: string
  value: string
  existing: boolean
  note?: string
}

/**
 * 判断环境变量表单是否可以保存。
 * 同时满足：1) 有改动（修改/新增/删除）2) 全部合法
 */
export function computeCanSave(
  entries: EnvEntry[],
  initialKeys: Set<string>,
  initialNotes?: Record<string, string>,
): boolean {
  for (const e of entries) {
    const k = e.key.trim()
    // 空行（key 和 value 都没填）阻止保存
    if (!k && !e.value && !e.existing) return false
    // key 必须合法
    if (k && validateEnvVarName(k) !== undefined) return false
    // 新行/修改行必须 key + value 都填
    if (!e.existing && k && !e.value) return false
    if (!e.existing && !k && e.value) return false
  }

  // 有删除？
  const currentKeys = new Set(entries.map(e => e.key.trim()).filter(Boolean))
  const hasDeleted = [...initialKeys].some(k => !currentKeys.has(k))
  // 有新增或修改？（existing: false 且 key+value 都有值）
  const hasNewOrModified = entries.some(e => !e.existing && e.key.trim() && e.value)

  // 有 note 变化？
  const hasNoteChange = initialNotes ? entries.some(e => {
    const k = e.key.trim()
    if (!k) return false
    return (e.note || '') !== (initialNotes[k] || '')
  }) : false

  return hasDeleted || hasNewOrModified || hasNoteChange
}

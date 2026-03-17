export interface Skill {
  id: string
  name: string
  displayName: string
  description: string
  version: string
  createdAt: string
}

export interface SkillDetail extends Skill {
  content: string
  files: string[]
}

export interface CredentialKey {
  name: string
  hasValue: boolean
  note: string
}

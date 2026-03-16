import { useState, type KeyboardEvent } from 'react'
import { Link } from '@tanstack/react-router'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useUIStore } from '@/stores/ui-store'

export function RegisterPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const login = useUIStore((s) => s.login)

  const canRegister =
    username.trim().length > 0 &&
    password.length > 0 &&
    password === confirm

  const handleRegister = () => {
    if (!canRegister) return
    // Mock: just log in directly
    login()
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && canRegister) handleRegister()
  }

  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="w-full max-w-xs space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">ClawChat</h1>
          <p className="mt-1 text-sm text-muted-foreground">创建新账号</p>
        </div>

        <div className="space-y-3">
          <Input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="用户名"
            autoFocus
          />
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="密码"
          />
          <Input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="确认密码"
          />
          <Button
            className="w-full"
            onClick={handleRegister}
            disabled={!canRegister}
          >
            注册
          </Button>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          已有账号？
          <Link to="/login" className="ml-1 text-primary hover:underline">
            去登录
          </Link>
        </p>
      </div>
    </div>
  )
}

import { useState, type KeyboardEvent } from 'react'
import { Link } from '@tanstack/react-router'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useUIStore } from '@/stores/ui-store'

export function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const login = useUIStore((s) => s.login)

  const canLogin = username.trim().length > 0

  const handleLogin = () => {
    if (!canLogin) return
    login()
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && canLogin) handleLogin()
  }

  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="w-full max-w-xs space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">ClawChat</h1>
          <p className="mt-1 text-sm text-muted-foreground">登录你的账号</p>
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
          <Button
            className="w-full"
            onClick={handleLogin}
            disabled={!canLogin}
          >
            登录
          </Button>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          没有账号？
          <Link to="/register" className="ml-1 text-primary hover:underline">
            去注册
          </Link>
        </p>
      </div>
    </div>
  )
}

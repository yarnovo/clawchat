import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from '@tanstack/react-router'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { apiLogin } from '@/services/api-client'

interface LoginForm {
  username: string
  password: string
}

export function LoginPage() {
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const { register, handleSubmit, formState: { isValid, isSubmitting } } = useForm<LoginForm>({
    mode: 'onChange',
  })

  const onSubmit = async (data: LoginForm) => {
    setError('')
    try {
      await apiLogin(data.username)
      navigate({ to: '/chat' })
    } catch {
      setError('登录失败，请重试')
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="w-full max-w-xs space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">ClawChat</h1>
          <p className="mt-1 text-sm text-muted-foreground">登录你的账号</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <Input
            {...register('username', { required: true })}
            placeholder="用户名"
            autoFocus
          />
          <Input
            type="password"
            {...register('password')}
            placeholder="密码"
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button className="w-full" type="submit" disabled={!isValid || isSubmitting}>
            {isSubmitting ? '登录中...' : '登录'}
          </Button>
        </form>

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

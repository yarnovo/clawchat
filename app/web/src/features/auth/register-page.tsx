import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from '@tanstack/react-router'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { apiRegister } from '@/services/api-client'

interface RegisterForm {
  username: string
  password: string
  confirm: string
}

export function RegisterPage() {
  const navigate = useNavigate()
  const [avatarSeed, setAvatarSeed] = useState(() => String(Date.now()))
  const [error, setError] = useState('')
  const avatarUrl = `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(avatarSeed)}`

  const { register, handleSubmit, watch, formState: { isValid, isSubmitting } } = useForm<RegisterForm>({
    mode: 'onChange',
  })

  const password = watch('password')

  const onSubmit = async (data: RegisterForm) => {
    setError('')
    try {
      await apiRegister(data.username, data.password, avatarUrl)
      navigate({ to: '/chat' })
    } catch {
      setError('注册失败，请重试')
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="w-full max-w-xs space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">ClawChat</h1>
          <p className="mt-1 text-sm text-muted-foreground">创建新账号</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="flex flex-col items-center gap-2">
            <img
              src={avatarUrl}
              alt="avatar"
              className="size-20 rounded-xl bg-muted"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setAvatarSeed(String(Date.now()))}
            >
              换一个头像
            </Button>
          </div>

          <Input
            {...register('username', { required: true })}
            placeholder="用户名"
            autoFocus
          />
          <Input
            type="password"
            {...register('password', { required: true })}
            placeholder="密码"
          />
          <Input
            type="password"
            {...register('confirm', {
              required: true,
              validate: (v) => v === password,
            })}
            placeholder="确认密码"
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button className="w-full" type="submit" disabled={!isValid || isSubmitting}>
            {isSubmitting ? '注册中...' : '注册'}
          </Button>
        </form>

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

import { useMutation } from '@tanstack/react-query'
import { Link, createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { signIn, getCurrentUser } from '@/data/auth'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/auth/login')({
  component: AuthPage,
  beforeLoad: async () => {
    const user = await getCurrentUser()
    if (user) {
      throw redirect({ to: '/' })
    }
  },
})

function AuthPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const signInMutation = useMutation({
    mutationFn: signIn,
    onSuccess: (result) => {
      if (result.error) {
        setError(result.error)
      } else {
        navigate({ to: '/' })
      }
    },
  })

  const isLoading = signInMutation.isPending

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!email || !password) {
      setError('请输入邮箱和密码')
      return
    }

    if (password.length < 6) {
      setError('密码至少需要 6 个字符')
      return
    }

    signInMutation.mutate({ data: { email, password } })
  }

  return (
    <div className='bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10'>
      <div className='w-full max-w-sm md:max-w-4xl'>
        <div className={cn('flex flex-col gap-6')}>
          <Card className='overflow-hidden p-0'>
            <CardContent className='grid p-0 md:grid-cols-2'>
              <form className='p-6 md:p-8' onSubmit={handleSubmit}>
                <FieldGroup>
                  <div className='flex flex-col items-center gap-2 text-center'>
                    <div className='flex items-center gap-2 text-2xl font-bold'>
                      <CheckCircle2 className='text-primary h-7 w-7' />
                      <span>To Do</span>
                    </div>
                    <h1 className='text-2xl font-bold'>欢迎回来</h1>
                    <p className='text-muted-foreground text-sm text-balance'>
                      输入邮箱和密码，继续管理你的待办事项
                    </p>
                  </div>

                  {error && (
                    <FieldDescription className='bg-destructive/10 text-destructive rounded-md p-3 text-center'>
                      {error}
                    </FieldDescription>
                  )}

                  <Field>
                    <FieldLabel htmlFor='email'>邮箱地址</FieldLabel>
                    <Input
                      id='email'
                      type='email'
                      placeholder='you@example.com'
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                      autoComplete='email'
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor='password'>密码</FieldLabel>
                    <Input
                      id='password'
                      type='password'
                      placeholder='请输入密码'
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                      autoComplete='current-password'
                    />
                  </Field>

                  <Field>
                    <Button type='submit' disabled={isLoading}>
                      {isLoading && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                      {isLoading ? '登录中...' : '登录'}
                    </Button>
                  </Field>

                  <FieldDescription className='text-center'>
                    没有账户？{' '}
                    <Link to='/auth/sign-up' className='underline underline-offset-4'>
                      立即注册
                    </Link>
                  </FieldDescription>
                </FieldGroup>
              </form>

              <div className='bg-muted relative hidden md:block'>
                <img
                  src='/login-bg.avif'
                  alt='登录背景图'
                  className='absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale'
                />
              </div>
            </CardContent>
          </Card>

          <FieldDescription className='px-6 text-center'>
            继续登录即表示您已阅读并同意我们的{' '}
            <a href='#' className='underline underline-offset-4'>
              服务条款
            </a>{' '}
            和{' '}
            <a href='#' className='underline underline-offset-4'>
              隐私政策
            </a>
            。
          </FieldDescription>
        </div>
      </div>
    </div>
  )
}

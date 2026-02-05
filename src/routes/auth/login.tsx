import { useState } from 'react'
import { Link, createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { signIn, getCurrentUser } from '@/data/auth.server'
import { CheckCircle2, Loader2 } from 'lucide-react'

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
      setError('请填写邮箱和密码')
      return
    }

    if (password.length < 6) {
      setError('密码至少需要6个字符')
      return
    }

    signInMutation.mutate({ data: { email, password } })
  }

  return (
    <div className='min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/50 p-4'>
      <Card className='w-full max-w-md'>
        <CardHeader className='text-center'>
          <div className='flex justify-center mb-4'>
            <div className='flex items-center gap-2 text-2xl font-bold'>
              <CheckCircle2 className='h-8 w-8 text-primary' />
              <span>To Do</span>
            </div>
          </div>
          <CardTitle className='text-xl'>欢迎回来</CardTitle>
          <CardDescription>登录您的账户以继续</CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className='space-y-4'>
            {error && (
              <div className='p-3 text-sm text-destructive bg-destructive/10 rounded-md'>
                {error}
              </div>
            )}

            <div className='space-y-2'>
              <Label htmlFor='email'>邮箱</Label>
              <Input
                id='email'
                type='email'
                placeholder='your@email.com'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                autoComplete='email'
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='password'>密码</Label>
              <Input
                id='password'
                type='password'
                placeholder='••••••••'
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                autoComplete='current-password'
              />
            </div>
          </CardContent>

          <CardFooter className='flex flex-col gap-4'>
            <Button type='submit' className='w-full' disabled={isLoading}>
              {isLoading && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
              登录
            </Button>

            <div className='text-center text-sm text-muted-foreground'>
              还没有账户？
              <Link
                to='/auth/sign-up'
                className='ml-1 text-primary hover:underline font-medium'
              >
                立即注册
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}

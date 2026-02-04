import { useState } from 'react'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
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
import { signIn, signUp, getCurrentUser } from '@/data/auth.server'
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
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

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

  const signUpMutation = useMutation({
    mutationFn: signUp,
    onSuccess: (result) => {
      if (result.error) {
        setError(result.error)
      } else if (result.needsConfirmation) {
        setSuccess('注册成功！请检查邮箱完成验证。')
        setIsLogin(true)
      } else {
        navigate({ to: '/' })
      }
    },
  })

  const isLoading = signInMutation.isPending || signUpMutation.isPending

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!email || !password) {
      setError('请填写邮箱和密码')
      return
    }

    if (password.length < 6) {
      setError('密码至少需要6个字符')
      return
    }

    if (isLogin) {
      signInMutation.mutate({ data: { email, password } })
    } else {
      signUpMutation.mutate({ data: { email, password } })
    }
  }

  const toggleMode = () => {
    setIsLogin(!isLogin)
    setError(null)
    setSuccess(null)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="flex items-center gap-2 text-2xl font-bold">
              <CheckCircle2 className="h-8 w-8 text-primary" />
              <span>To Do</span>
            </div>
          </div>
          <CardTitle className="text-xl">
            {isLogin ? '欢迎回来' : '创建账户'}
          </CardTitle>
          <CardDescription>
            {isLogin ? '登录您的账户以继续' : '注册一个新账户开始使用'}
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                {error}
              </div>
            )}

            {success && (
              <div className="p-3 text-sm text-green-600 bg-green-50 dark:bg-green-900/20 rounded-md">
                {success}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">邮箱</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
              />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLogin ? '登录' : '注册'}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              {isLogin ? '还没有账户？' : '已有账户？'}
              <button
                type="button"
                onClick={toggleMode}
                className="ml-1 text-primary hover:underline font-medium"
                disabled={isLoading}
              >
                {isLogin ? '立即注册' : '立即登录'}
              </button>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}

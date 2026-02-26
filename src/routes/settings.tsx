import { useMutation } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Settings,
  Shield,
  User,
  Check,
  X,
  Monitor,
  Sun,
  Moon,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updatePassword, getCurrentUser } from '@/data/auth'

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
  loader: async () => await getCurrentUser(),
})

function SettingsPage() {
  const user = Route.useLoaderData()
  const { theme, resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const updatePasswordMutation = useMutation({
    mutationFn: updatePassword,
    onSuccess: (result) => {
      if (result.error) {
        setError(result.error)
        setSuccess(false)
      } else {
        setSuccess(true)
        setError(null)
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
        setTimeout(() => setSuccess(false), 3000)
      }
    },
  })

  const isLoading = updatePasswordMutation.isPending

  const getPasswordStrength = (password: string) => {
    if (!password) return 0
    if (password.length < 6) return 1
    if (password.length < 10) return 2
    if (password.length < 12) return 3
    return 4
  }

  const passwordStrength = getPasswordStrength(newPassword)
  const strengthColors = [
    'bg-red-500',
    'bg-orange-500',
    'bg-yellow-500',
    'bg-emerald-500',
    'bg-emerald-600',
  ]
  const strengthLabels = ['弱', '较弱', '中等', '强', '很强']

  const isLengthValid = newPassword.length >= 6
  const isDifferent = newPassword !== currentPassword && currentPassword !== ''
  const isMatch = newPassword === confirmPassword && newPassword !== ''
  const selectedTheme = mounted ? (theme ?? 'system') : 'system'
  const appliedTheme = mounted ? (resolvedTheme ?? 'light') : 'light'

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('请填写所有字段')
      return
    }

    if (newPassword.length < 6) {
      setError('新密码至少需要6个字符')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('两次输入的密码不一致')
      return
    }

    if (currentPassword === newPassword) {
      setError('新密码不能与当前密码相同')
      return
    }

    updatePasswordMutation.mutate({
      data: {
        currentPassword,
        newPassword,
      },
    })
  }

  return (
    <div className='from-background to-muted/30 min-h-screen bg-linear-to-br p-4 md:p-8'>
      <div className='mx-auto max-w-2xl pt-4 md:pt-8'>
        <div className='mb-8 flex items-center gap-4'>
          <Link
            to='/'
            aria-label='返回首页'
            className='hover:bg-accent/50 inline-flex h-10 w-10 items-center justify-center rounded-xl transition-colors'
          >
            <ArrowLeft className='h-5 w-5' />
          </Link>
          <div className='flex items-center gap-3'>
            <div className='from-primary to-secondary shadow-elevation-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br'>
              <Settings className='h-6 w-6 text-white' />
            </div>
            <div>
              <h1 className='text-foreground text-2xl font-bold tracking-tight'>设置</h1>
              <p className='text-muted-foreground text-sm'>管理您的账户设置</p>
            </div>
          </div>
        </div>

        {user && (
          <Card className='border-border/60 shadow-elevation-2 mb-6 border-2'>
            <CardContent className='p-6'>
              <div className='flex items-center gap-4'>
                <div className='from-primary to-secondary shadow-elevation-1 flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-br text-xl font-bold text-white'>
                  {user.email?.charAt(0).toUpperCase() || <User className='h-8 w-8' />}
                </div>
                <div className='min-w-0 flex-1'>
                  <p className='text-muted-foreground mb-1 text-sm'>当前账户</p>
                  <p className='text-foreground truncate text-lg font-semibold'>{user.email}</p>
                </div>
                <div className='bg-primary/10 flex h-12 w-12 items-center justify-center rounded-xl'>
                  <Shield className='text-primary h-6 w-6' />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className='border-border/60 shadow-elevation-2 mb-6 overflow-hidden border-2'>
          <CardHeader className='from-muted/50 border-b bg-linear-to-r to-transparent'>
            <CardTitle className='text-xl'>外观主题</CardTitle>
            <CardDescription>支持浅色、深色与自动跟随系统</CardDescription>
          </CardHeader>

          <CardContent className='space-y-4 p-6'>
            <div className='grid grid-cols-1 gap-3 sm:grid-cols-3'>
              <Button
                type='button'
                variant={selectedTheme === 'light' ? 'default' : 'outline'}
                className='h-11 rounded-xl'
                onClick={() => setTheme('light')}
              >
                <Sun className='mr-2 h-4 w-4' />
                浅色
              </Button>
              <Button
                type='button'
                variant={selectedTheme === 'dark' ? 'default' : 'outline'}
                className='h-11 rounded-xl'
                onClick={() => setTheme('dark')}
              >
                <Moon className='mr-2 h-4 w-4' />
                深色
              </Button>
              <Button
                type='button'
                variant={selectedTheme === 'system' ? 'default' : 'outline'}
                className='h-11 rounded-xl'
                onClick={() => setTheme('system')}
              >
                <Monitor className='mr-2 h-4 w-4' />
                自动
              </Button>
            </div>

            <p className='text-muted-foreground text-sm'>
              当前设置：
              <span className='text-foreground mx-1 font-medium'>
                {selectedTheme === 'system' ? '自动' : selectedTheme === 'dark' ? '深色' : '浅色'}
              </span>
              · 实际生效：
              <span className='text-foreground ml-1 font-medium'>
                {appliedTheme === 'dark' ? '深色' : '浅色'}
              </span>
            </p>
          </CardContent>
        </Card>

        <Card className='border-border/60 shadow-elevation-2 overflow-hidden border-2'>
          <CardHeader className='from-muted/50 border-b bg-linear-to-r to-transparent'>
            <CardTitle className='text-xl'>修改密码</CardTitle>
            <CardDescription>为了账户安全，请定期更新您的密码</CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className='space-y-6 p-6'>
              {error && (
                <div className='text-destructive bg-destructive/10 border-destructive/20 animate-in fade-in slide-in-from-top-2 flex items-start gap-3 rounded-xl border p-4 text-sm'>
                  <X className='mt-0.5 h-5 w-5 shrink-0' />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className='animate-in fade-in slide-in-from-top-2 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700 dark:border-green-900/50 dark:bg-green-950/30 dark:text-green-400'>
                  <CheckCircle2 className='h-5 w-5 shrink-0' />
                  <span>密码修改成功</span>
                </div>
              )}

              <div className='space-y-2'>
                <Label htmlFor='currentPassword' className='text-sm font-medium'>
                  当前密码
                </Label>
                <Input
                  id='currentPassword'
                  type='password'
                  placeholder='输入您的当前密码'
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={isLoading}
                  autoComplete='current-password'
                  className='border-border bg-background focus:border-primary/50 focus:bg-background/80 h-11 rounded-xl border-2 transition-all'
                />
              </div>

              <div className='space-y-2'>
                <Label htmlFor='newPassword' className='text-sm font-medium'>
                  新密码
                </Label>
                <Input
                  id='newPassword'
                  type='password'
                  placeholder='输入新密码'
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isLoading}
                  autoComplete='new-password'
                  className='border-border bg-background focus:border-primary/50 focus:bg-background/80 h-11 rounded-xl border-2 transition-all'
                />
                {newPassword && (
                  <div className='mt-3 space-y-2'>
                    <div className='flex items-center justify-between'>
                      <span className='text-muted-foreground text-xs'>密码强度</span>
                      <span
                        className={`text-xs font-medium ${passwordStrength >= 3 ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}
                      >
                        {strengthLabels[passwordStrength]}
                      </span>
                    </div>
                    <div className='flex gap-1'>
                      {[...Array(4)].map((_, i) => (
                        <div
                          key={i}
                          className={`h-1.5 flex-1 rounded-full transition-all ${
                            i < passwordStrength ? strengthColors[passwordStrength] : 'bg-muted'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className='space-y-2'>
                <Label htmlFor='confirmPassword' className='text-sm font-medium'>
                  确认新密码
                </Label>
                <Input
                  id='confirmPassword'
                  type='password'
                  placeholder='再次输入新密码'
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                  autoComplete='new-password'
                  className='border-border bg-background focus:border-primary/50 focus:bg-background/80 h-11 rounded-xl border-2 transition-all'
                />
                {confirmPassword && (
                  <div
                    className={`mt-2 flex items-center gap-2 text-xs ${isMatch ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}
                  >
                    {isMatch ? <Check className='h-3.5 w-3.5' /> : <X className='h-3.5 w-3.5' />}
                    <span>{isMatch ? '密码匹配' : '密码不匹配'}</span>
                  </div>
                )}
              </div>

              <div className='bg-muted/50 border-border/40 space-y-3 rounded-xl border p-4'>
                <p className='text-foreground text-sm font-semibold'>密码要求</p>
                <ul className='space-y-2'>
                  <li
                    className={`flex items-center gap-2 text-xs ${isLengthValid ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}
                  >
                    {isLengthValid ? (
                      <Check className='h-3.5 w-3.5 shrink-0' />
                    ) : (
                      <X className='h-3.5 w-3.5 shrink-0' />
                    )}
                    <span>至少 6 个字符</span>
                  </li>
                  <li
                    className={`flex items-center gap-2 text-xs ${isDifferent ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}
                  >
                    {isDifferent ? (
                      <Check className='h-3.5 w-3.5 shrink-0' />
                    ) : (
                      <X className='h-3.5 w-3.5 shrink-0' />
                    )}
                    <span>不能与当前密码相同</span>
                  </li>
                  <li
                    className={`flex items-center gap-2 text-xs ${isMatch ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}
                  >
                    {isMatch ? (
                      <Check className='h-3.5 w-3.5 shrink-0' />
                    ) : (
                      <X className='h-3.5 w-3.5 shrink-0' />
                    )}
                    <span>两次输入的密码一致</span>
                  </li>
                </ul>
              </div>
            </CardContent>

            <CardFooter className='p-6 pt-0'>
              <Button
                type='submit'
                className='shadow-elevation-1 hover:shadow-elevation-2 h-12 w-full rounded-xl text-base font-medium transition-all'
                disabled={isLoading || !isLengthValid || !isDifferent || !isMatch}
              >
                {isLoading && <Loader2 className='mr-2 h-5 w-5 animate-spin' />}
                {isLoading ? '更新中...' : '更新密码'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
